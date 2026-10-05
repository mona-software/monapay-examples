# FastAPI + MONA Pay

A single-file FastAPI app that creates a VietQR for an order and confirms payment through a verified MONA Pay webhook.

## Run

```bash
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env && set -a && . ./.env && set +a
uvicorn main:app --reload
curl -X POST http://127.0.0.1:8000/orders/DH10234/qr
```

## How it works

- On start the app creates a SQLite database (`ORDERS_DB`, default `orders.sqlite3`) with order `DH10234`.
- `POST /orders/{order_id}/qr` creates a dynamic VietQR.
- `POST /webhooks/monapay` reads `await request.body()`, verifies the signature, opens a `BEGIN IMMEDIATE` transaction, checks the amount and stores `payment_transaction_code`, which is unique.
- The webhook finds the order from `order_id` in the payload, or from a `DH<number>` code in the transfer description.

In production, move to a database server but keep the same constraints.

## Test the webhook

```bash
monapay webhooks test --url https://YOUR-TUNNEL.example/webhooks/monapay
```

Documentation: https://monapay.vn/docs

**MONA Pay is part of MONA Cloud by The MONA Group.**
