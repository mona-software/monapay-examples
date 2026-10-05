# FastAPI + MONA Pay

A single-file FastAPI app that creates a VietQR for an order and confirms payment through a verified MONA Pay webhook.

## Run

```bash
python3 -m venv .venv && . .venv/bin/activate
pip install monapay "fastapi>=0.110,<1.0" "uvicorn>=0.29,<1.0"
cp .env.example .env && set -a && . ./.env && set +a
uvicorn main:app --reload
curl -X POST http://127.0.0.1:8000/orders/DH10234/qr
```

`requirements.txt` points the SDK at `-e ../../sdk/python`, a path that does not exist in this repository, so the command above installs the published `monapay` package from PyPI instead.

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
