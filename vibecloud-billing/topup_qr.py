"""Tạo VietQR nạp credit VibeCloud qua MONA Pay client credentials."""

import argparse
import json
import os
import sqlite3
import time
import urllib.error
import urllib.request
import uuid


BASE_URL = os.getenv("MONAPAY_BASE_URL", "https://api.monapay.vn").rstrip("/")
DATABASE = os.getenv("VIBECLOUD_BILLING_DB", "vibecloud_billing.sqlite3")


def required(name: str) -> str:
    value = os.getenv(name, "")
    if not value:
        raise RuntimeError("Thiếu biến môi trường " + name)
    return value


def post(path: str, body: dict, token: str | None = None, idempotency_key: str | None = None):
    headers = {"Accept": "application/json", "Content-Type": "application/json"}
    if token:
        headers["Authorization"] = "Bearer " + token
        headers["X-Client-Secret"] = required("MONAPAY_CLIENT_SECRET")
    if idempotency_key:
        headers["Idempotency-Key"] = idempotency_key
    request = urllib.request.Request(
        BASE_URL + path,
        data=json.dumps(body, separators=(",", ":")).encode(),
        headers=headers,
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            envelope = json.load(response)
    except urllib.error.HTTPError as error:
        raise RuntimeError("MONA Pay HTTP {}: {}".format(error.code, error.read().decode(errors="replace"))) from error
    if not envelope.get("success"):
        raise RuntimeError(str(envelope.get("message") or envelope.get("detail") or "MONA Pay API lỗi"))
    return envelope.get("data")


def oauth_token() -> str:
    data = post(
        "/api/v1/oauth/token",
        {
            "grant_type": "client_credentials",
            "client_id": required("MONAPAY_CLIENT_ID"),
            "client_secret": required("MONAPAY_CLIENT_SECRET"),
        },
    )
    token = data.get("access_token") if isinstance(data, dict) else None
    if not token:
        raise RuntimeError("Response OAuth không có access_token")
    return str(token)


def create_intent(description: str, user_id: str, amount: int) -> None:
    with sqlite3.connect(DATABASE) as database:
        database.execute(
            "CREATE TABLE IF NOT EXISTS topup_intents ("
            "description TEXT PRIMARY KEY, user_id TEXT NOT NULL, amount INTEGER NOT NULL, created_at INTEGER NOT NULL)"
        )
        database.execute(
            "INSERT INTO topup_intents(description, user_id, amount, created_at) VALUES (?, ?, ?, ?)",
            (description, user_id, amount, int(time.time())),
        )


def delete_intent(description: str) -> None:
    with sqlite3.connect(DATABASE) as database:
        database.execute("DELETE FROM topup_intents WHERE description = ?", (description,))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--user-id", required=True)
    parser.add_argument("--amount", required=True, type=int)
    args = parser.parse_args()
    if args.amount <= 0:
        parser.error("--amount phải lớn hơn 0")

    description = "VCLOUD_" + uuid.uuid4().hex[:16].upper()
    create_intent(description, args.user_id, args.amount)
    try:
        qr = post(
            "/api/v1/qr/generate",
            {
                "ownerNumber": required("MONAPAY_OWNER_NUMBER"),
                "ownerType": os.getenv("MONAPAY_OWNER_TYPE", "ORG"),
                "merchantId": required("MONAPAY_MERCHANT_ID"),
                "terminalId": required("MONAPAY_TERMINAL_ID"),
                "orderId": description,
                "virtualAccountPrefix": required("MONAPAY_VA_PREFIX"),
                "beneficiaryName": required("MONAPAY_BENEFICIARY_NAME"),
                "amount": args.amount,
                "description": description,
            },
            oauth_token(),
            "vibecloud-topup:" + description,
        )
    except Exception:
        delete_intent(description)
        raise
    print(json.dumps({"user_id": args.user_id, "amount": args.amount, "description": description, "qr": qr}, ensure_ascii=False))


if __name__ == "__main__":
    main()
