# Bếp Gọn: Next.js shop with MONA Pay

A small Next.js storefront template that takes payment through MONA Pay: the customer picks a product, the server creates an order and asks MONA Pay for a dynamic VietQR, the payment page polls the order status, and an HMAC-signed webhook marks the order paid. No secret reaches the browser.

## What is included

- Next.js App Router; every route handler is plain `.js`, so `node --check` works on all files.
- Pages: product list (`/`), product page (`/san-pham/[slug]`) and payment page (`/thanh-toan/[id]`).
- API routes: `POST /api/orders` creates an order and its QR, `GET /api/orders/:id` returns the order status, `GET /api/orders/:id/qr` returns the QR as PNG, `POST /api/webhooks/monapay` receives the webhook.
- A JSON order store written atomically to `data/orders.json` (`ORDER_STORE_PATH`); writes are serialized within one Node process.
- A dependency-free PNG renderer for the VietQR/EMVCo `qr_data_url` string returned by the API.
- The webhook reads the raw body and verifies `X-Mona-Timestamp` and `X-Mona-Signature` with a 300-second tolerance. The official test payload `DUMMY123` gets HTTP 200 without touching any order.
- Deduplication by `transaction_code`, an exact `amount` check, and order matching by `account_number` first, then `order_id`, then the order ID in the description.
- The payment page polls `GET /api/orders/:id` every 2.5 seconds.

A JSON file suits a demo or a single container. With several replicas, use a database with a real unique constraint on `transaction_code` and a transaction when changing the order status.

## Run locally

Requires Node.js 20 or later.

```bash
cp .env.example .env.local
# fill in the MONA Pay credentials and ACB QR settings in .env.local
npm install
npm run dev
```

Open `http://localhost:3000`. Creating an order calls the production API and creates a real VietQR, so do not use a smoke-test account to create real VAs or QR codes.

## Configuration

Copy [`.env.example`](.env.example). The credentials have different roles:

- `MONAPAY_CLIENT_ID`: the API key ID from the dashboard, used with the client secret to obtain a Bearer token.
- `MONAPAY_CLIENT_SECRET`: the secret generated once (`POST /api/v1/client-keys/generate`), used for write requests.
- `MONAPAY_WEBHOOK_SECRET`: a secret you generate (at least 32 random characters), used by MONA Pay to sign and by the app to verify webhooks.
- `MONAPAY_OWNER_NUMBER`, `MONAPAY_OWNER_TYPE`, `MONAPAY_MERCHANT_ID`, `MONAPAY_TERMINAL_ID`, `MONAPAY_VA_PREFIX`, `MONAPAY_BENEFICIARY_NAME`: ACB QR settings.

Do not commit `.env.local`, `.env_vibecloud` or `data/orders.json`.

## Tests

```bash
npm run gate
```

`gate` runs `node --check` on every `.js`/`.mjs` file in `app`, `lib` and `test`, then `node --test` for the store, idempotency, HMAC and QR. The QR test decodes the PNG with `zbarimg` when it is installed; otherwise it checks only the matrix and the PNG structure.

## Deploy

Build and run the container from this folder:

```bash
docker build -t vibecloud-shop .
docker run --env-file .env.local -p 3000:3000 vibecloud-shop
```

To deploy on MONA Cloud (formerly VibeCloud), give your AI agent [`vibecloud_guide.md`](vibecloud_guide.md); it describes the API steps to create a server and deploy the included `Dockerfile`. Then configure the public webhook URL in MONA Pay.

## QR encoder license

`lib/qrcode.js` reuses the dependency-free QR encoder from the MONA Pay CLI. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for the Project Nayuki attribution and MIT License.

Documentation: https://monapay.vn/docs

**MONA Pay is part of MONA Cloud by The MONA Group.**
