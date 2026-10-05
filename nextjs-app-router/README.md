# Next.js App Router + MONA Pay

A Next.js App Router project with route handlers that create a VietQR for an order and confirm payment through a verified MONA Pay webhook.

## Run

```bash
cp .env.example .env.local
npm install
npm run dev
curl -X POST http://localhost:3000/api/orders/DH10234/qr
```

## How it works

- `app/api/orders/[id]/qr/route.js` creates a dynamic VietQR. Order `DH10234` is preloaded.
- `app/api/monapay/webhook/route.js` reads `request.arrayBuffer()` before parsing JSON, so the signature is checked over the raw body. It finds the order from a `DH<number>` code in the transfer description.
- `lib/orders.js` is an in-memory order store for illustration. In production, use a database transaction and a unique constraint on `transaction_code`.

## Test the webhook

Open a tunnel to port `3000`, then:

```bash
monapay webhooks test --url https://YOUR-TUNNEL.example/api/monapay/webhook
```

Documentation: https://monapay.vn/docs

**MONA Pay is part of MONA Cloud by The MONA Group.**
