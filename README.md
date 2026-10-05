# MONA Pay examples

Small, runnable apps that show how to accept bank transfers with MONA Pay in common web frameworks.

Each framework example follows the same flow: create a dynamic VietQR for an order, receive the webhook from the raw body, verify the timestamp and HMAC-SHA256 signature, check the amount, then mark the order paid exactly once using `transaction_code`.

| Folder | Stack | What it shows |
| --- | --- | --- |
| [nextjs-app-router](./nextjs-app-router/) | Next.js App Router (Node.js) | QR route and webhook route handler with an in-memory order store |
| [express](./express/) | Express (Node.js) | QR endpoint and raw-body webhook with an in-memory order store |
| [nestjs](./nestjs/) | NestJS (TypeScript) | Controller using Nest's `rawBody` option and an in-memory orders service |
| [laravel](./laravel/) | Laravel 11 (PHP) | Route, controller, webhook middleware and migration to copy into a Laravel app |
| [django](./django/) | Django 5 (Python) | Views and model with SQLite, `select_for_update()` and a unique transaction code |
| [fastapi](./fastapi/) | FastAPI (Python) | Single-file app with SQLite and `BEGIN IMMEDIATE` |
| [spring-boot](./spring-boot/) | Spring Boot 3 (Java) | Plain `java.net.http` client and `javax.crypto.Mac` verification, no SDK |
| [go](./go/) | Go `net/http` | Standard library only, in-memory orders under a mutex |
| [vibecloud-billing](./vibecloud-billing/) | Python + FastAPI | Prepaid top-up QR per user and a webhook that credits a wallet once |
| [vibecloud-shop](./vibecloud-shop/) | Next.js 16 | A small storefront: products, orders, QR payment page with polling, signed webhook |

## Before you run an example

- You need a MONA Pay API key (client ID and client secret), a webhook secret and the ACB QR settings (owner number, owner type, merchant ID, terminal ID, VA prefix, beneficiary name). Each folder has a `.env.example` listing them.
- To receive webhooks locally, expose the port with a tunnel (for example `cloudflared tunnel --url http://localhost:3000`) and send a test webhook with the [MONA Pay CLI](https://github.com/mona-software/monapay-cli): `monapay webhooks test --url https://YOUR-TUNNEL.example/webhooks/monapay`.

## Going to production

The examples keep orders in memory, in SQLite or in a JSON file so they start quickly. In production, replace that storage with a real database, put a unique constraint on `transaction_code`, serve the webhook over HTTPS, and change an order's status only after both the order and the amount match.

Documentation: https://monapay.vn/docs

To report a vulnerability, see [SECURITY.md](./SECURITY.md).

**MONA Pay is part of MONA Cloud by The MONA Group.**
