import os
import re
import sqlite3

from fastapi import FastAPI, HTTPException, Request
from monapay import MonaPay, verify_webhook


app = FastAPI(title="MONA Pay example")
DATABASE = os.getenv("ORDERS_DB", "orders.sqlite3")


def connection():
    database = sqlite3.connect(DATABASE)
    database.row_factory = sqlite3.Row
    return database


def initialize():
    with connection() as database:
        database.execute(
            "CREATE TABLE IF NOT EXISTS orders ("
            "id TEXT PRIMARY KEY, amount INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'pending', "
            "payment_transaction_code TEXT UNIQUE)"
        )
        database.execute(
            "INSERT OR IGNORE INTO orders(id, amount, status) VALUES (?, ?, ?)",
            ("DH10234", 2500000, "pending"),
        )


initialize()


def client():
    return MonaPay.from_env()


@app.post("/orders/{order_id}/qr")
def create_qr(order_id: str):
    with connection() as database:
        order = database.execute("SELECT * FROM orders WHERE id = ?", (order_id,)).fetchone()
    if order is None:
        raise HTTPException(404, "order_not_found")
    qr = client().qr.generate(
        {
            "ownerNumber": os.environ["MONAPAY_OWNER_NUMBER"],
            "ownerType": os.getenv("MONAPAY_OWNER_TYPE", "ORG"),
            "merchantId": os.environ["MONAPAY_MERCHANT_ID"],
            "terminalId": os.environ["MONAPAY_TERMINAL_ID"],
            "orderId": order["id"],
            "virtualAccountPrefix": os.environ["MONAPAY_VA_PREFIX"],
            "beneficiaryName": os.environ["MONAPAY_BENEFICIARY_NAME"],
            "amount": order["amount"],
            "description": "Thanh toan {}".format(order["id"]),
        }
    )
    return {"order": dict(order), "qr": qr}


@app.post("/webhooks/monapay")
async def monapay_webhook(request: Request):
    raw_body = await request.body()
    verified = verify_webhook(raw_body, request.headers, os.environ["MONAPAY_WEBHOOK_SECRET"])
    if not verified.ok:
        raise HTTPException(401, verified.reason)
    payload = verified.payload
    match = re.search(r"\bDH\d+\b", str(payload.get("description", "")), re.I)
    order_id = payload.get("order_id") or (match.group(0) if match else None)

    database = connection()
    try:
        database.execute("BEGIN IMMEDIATE")
        order = database.execute("SELECT * FROM orders WHERE id = ?", (order_id,)).fetchone()
        if order is None:
            raise HTTPException(404, "order_not_found")
        if order["amount"] != payload.get("amount"):
            raise HTTPException(409, "amount_mismatch")
        if order["payment_transaction_code"] == payload.get("transaction_code"):
            database.commit()
            return {"ok": True, "duplicate": True}
        if order["status"] == "paid":
            raise HTTPException(409, "order_already_paid")
        database.execute(
            "UPDATE orders SET status = 'paid', payment_transaction_code = ? WHERE id = ?",
            (payload["transaction_code"], order_id),
        )
        database.commit()
        return {"ok": True, "duplicate": False}
    except Exception:
        database.rollback()
        raise
    finally:
        database.close()
