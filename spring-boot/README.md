# Spring Boot + MONA Pay

A Spring Boot 3 app that creates a VietQR for an order and confirms payment through a verified MONA Pay webhook, without an SDK.

## Run

```bash
cp .env.example .env && set -a && . ./.env && set +a
mvn spring-boot:run
curl -X POST http://localhost:8080/orders/DH10234/qr
```

## How it works

- `MonaPayClient` gets an OAuth token and calls the QR API with `java.net.http.HttpClient`. It calls `https://api.monapay.vn` directly.
- `WebhookController` exposes `POST /orders/{id}/qr` and `POST /webhooks/monapay`. The webhook checks HMAC-SHA256 over the raw `byte[]` body with `javax.crypto.Mac`, checks the timestamp within 5 minutes and compares in constant time with `MessageDigest.isEqual`.
- The webhook finds the order from a `DH<number>` code in the transfer description.

The order map is only for local use. In production, use a database transaction and a unique constraint on `transaction_code`.

## Test the webhook

```bash
monapay webhooks test --url https://YOUR-TUNNEL.example/webhooks/monapay
```

Documentation: https://monapay.vn/docs

**MONA Pay is part of MONA Cloud by The MONA Group.**
