# Express + MONA Pay

An Express app that creates a VietQR for an order and confirms payment through a verified MONA Pay webhook.

## Run

```bash
cp .env.example .env
set -a; . ./.env; set +a
npm install
npm start
curl -X POST http://localhost:3000/orders/DH10234/qr
```

## How it works

- `POST /orders/:id/qr` creates a dynamic VietQR for the order. Order `DH10234` (2,500,000 VND) is preloaded.
- `POST /webhooks/monapay` uses `express.raw()` (limit 1 MB) on that route, registered before the global `express.json()`, so the signature is always computed over the exact raw body.
- The webhook finds the order from `order_id` in the payload, or from a `DH<number>` code in the transfer description. It rejects an amount mismatch with HTTP 409 and ignores a repeated `transaction_code`.

Orders live in a `Map`. In production, use a database with a unique constraint on `transaction_code`.

## Test the webhook

Open a tunnel to port `3000`, then:

```bash
monapay webhooks test --url https://YOUR-TUNNEL.example/webhooks/monapay
```

Documentation: https://monapay.vn/docs

**MONA Pay is part of MONA Cloud by The MONA Group.**
