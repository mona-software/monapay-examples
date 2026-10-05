# NestJS + MONA Pay

A NestJS app that creates a VietQR for an order and confirms payment through a verified MONA Pay webhook.

## Run

```bash
cp .env.example .env
set -a; . ./.env; set +a
npm install @monapay/node@latest
npm run start:dev
curl -X POST http://localhost:3000/orders/DH10234/qr
```

`package.json` points `@monapay/node` at `file:../../sdk/node`, a path that does not exist in this repository. `npm install @monapay/node@latest` replaces it with the published SDK and installs the other dependencies.

## How it works

- The app is created with `NestFactory.create(AppModule, { rawBody: true })`, so the webhook handler can verify the signature over `request.rawBody`; a missing raw body returns HTTP 400.
- `PaymentsController` exposes `POST /orders/:id/qr` and `POST /webhooks/monapay`. Order `DH10234` is preloaded.
- The webhook finds the order from `order_id` in the payload, or from a `DH<number>` code in the transfer description.

`OrdersService` keeps orders in a `Map` for illustration. In production, use a database transaction, a unique constraint on `transaction_code`, and compare `amount` before changing the status.

## Test the webhook

```bash
monapay webhooks test --url https://YOUR-TUNNEL.example/webhooks/monapay
```

Documentation: https://monapay.vn/docs

**MONA Pay is part of MONA Cloud by The MONA Group.**
