# Go net/http + MONA Pay

A Go server, using only the standard library, that creates a VietQR for an order and confirms payment through a verified MONA Pay webhook.

## Run

```bash
cp .env.example .env && set -a && . ./.env && set +a
go run .
curl -X POST http://localhost:8080/orders/DH10234/qr
```

Requires Go 1.22 or later.

## How it works

- `POST /orders/{id}/qr` creates a dynamic VietQR. Order `DH10234` is preloaded.
- `POST /webhooks/monapay` limits the raw body to 1 MB, checks the timestamp within 5 minutes, compares the HMAC-SHA256 signature with `hmac.Equal`, checks the amount, then updates the order under a mutex.
- The webhook finds the order from a `DH<number>` code in the transfer description.

In production, use a database transaction and a unique constraint on `transaction_code`.

## Test the webhook

```bash
monapay webhooks test --url https://YOUR-TUNNEL.example/webhooks/monapay
```

Documentation: https://monapay.vn/docs

**MONA Pay is part of MONA Cloud by The MONA Group.**
