"""Webhook MONA Pay cộng credit VibeCloud, idempotent bằng SQLite."""

import hashlib
import hmac
import json
import os
import re
import sqlite3
import time
from contextlib import closing

from fastapi import FastAPI, HTTPException, Request


DATABASE = os.getenv("VIBECLOUD_BILLING_DB", "vibecloud_billing.sqlite3")
DESCRIPTION_PATTERN = re.compile(r"\bVCLOUD_[A-F0-9]{16}\b")
app = FastAPI(title="VibeCloud billing qua MONA Pay")


def connect() -> sqlite3.Connection:
    database = sqlite3.connect(DATABASE)
    database.row_factory = sqlite3.Row
    return database


def initialize() -> None:
    with closing(connect()) as database, database:
        database.execute(
            "CREATE TABLE IF NOT EXISTS topup_intents ("
            "description TEXT PRIMARY KEY, user_id TEXT NOT NULL, amount INTEGER NOT NULL, created_at INTEGER NOT NULL)"
        )
        database.execute(
            "CREATE TABLE IF NOT EXISTS wallets (user_id TEXT PRIMARY KEY, balance INTEGER NOT NULL DEFAULT 0)"
        )
        database.execute(
            "CREATE TABLE IF NOT EXISTS wallet_credits ("
            "transaction_code TEXT PRIMARY KEY, user_id TEXT NOT NULL, amount INTEGER NOT NULL, created_at INTEGER NOT NULL)"
        )


initialize()


def verify_signature(raw_body: bytes, timestamp: str, signature: str) -> None:
    secret = os.getenv("MONAPAY_WEBHOOK_SECRET", "")
    if not secret:
        raise HTTPException(500, "server_missing_webhook_secret")
    if not timestamp.isdigit() or abs(int(time.time()) - int(timestamp)) > 300:
        raise HTTPException(401, "invalid_timestamp")
    if not re.fullmatch(r"sha256=[0-9a-fA-F]{64}", signature):
        raise HTTPException(401, "invalid_signature")
    expected = hmac.new(secret.encode(), timestamp.encode() + b"." + raw_body, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, signature[7:].lower()):
        raise HTTPException(401, "invalid_signature")


def credit_wallet(user_id: str, amount: int, transaction_code: str) -> bool:
    """Cộng tiền đúng một lần; trả False nếu transaction_code đã xử lý."""
    database = connect()
    try:
        database.execute("BEGIN IMMEDIATE")
        inserted = database.execute(
            "INSERT OR IGNORE INTO wallet_credits(transaction_code, user_id, amount, created_at) VALUES (?, ?, ?, ?)",
            (transaction_code, user_id, amount, int(time.time())),
        )
        if inserted.rowcount == 0:
            database.commit()
            return False
        database.execute("INSERT OR IGNORE INTO wallets(user_id, balance) VALUES (?, 0)", (user_id,))
        database.execute("UPDATE wallets SET balance = balance + ? WHERE user_id = ?", (amount, user_id))
        database.commit()
        # TODO(VibeCloud): thay SQLite bằng ledger/wallet nội bộ, vẫn giữ transaction_code là unique key.
        return True
    except Exception:
        database.rollback()
        raise
    finally:
        database.close()


@app.post("/webhooks/monapay")
async def monapay_webhook(request: Request):
    raw_body = await request.body()
    verify_signature(
        raw_body,
        request.headers.get("X-Mona-Timestamp", ""),
        request.headers.get("X-Mona-Signature", ""),
    )
    try:
        payload = json.loads(raw_body)
        transaction_code = str(payload["transaction_code"])
        amount = int(payload["amount"])
    except (KeyError, TypeError, ValueError, json.JSONDecodeError):
        raise HTTPException(400, "invalid_payload")
    if not transaction_code or amount <= 0:
        raise HTTPException(400, "invalid_payload")

    match = DESCRIPTION_PATTERN.search(str(payload.get("description", "")).upper())
    if match is None:
        raise HTTPException(404, "topup_intent_not_found")
    with closing(connect()) as database:
        intent = database.execute(
            "SELECT user_id, amount FROM topup_intents WHERE description = ?", (match.group(0),)
        ).fetchone()
    if intent is None:
        raise HTTPException(404, "topup_intent_not_found")
    if int(intent["amount"]) != amount:
        raise HTTPException(409, "amount_mismatch")

    credited = credit_wallet(str(intent["user_id"]), amount, transaction_code)
    return {"ok": True, "duplicate": not credited}
