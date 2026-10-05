# Laravel + MONA Pay

Route, controller, webhook middleware, model and migration that add VietQR payment and a verified MONA Pay webhook to a Laravel 11 app.

This folder is not a full Laravel app. Copy its files into an existing Laravel project.

## Install

In your Laravel app:

```bash
composer require monapay/php-sdk
```

Then copy from this folder:

- `routes/api.php` (merge the two routes)
- `app/Http/Controllers/MonaPayController.php`
- `app/Http/Middleware/VerifyMonaPayWebhook.php`
- `app/Models/Order.php`
- `database/migrations/2026_08_29_000000_create_orders_table.php`

Add the `MONAPAY_*` variables from `.env.example` to your app's `.env`.

## Run

```bash
php artisan migrate
php artisan tinker --execute="App\\Models\\Order::create(['amount' => 2500000]);"
php artisan serve
curl -X POST http://127.0.0.1:8000/api/orders/1/qr
```

## How it works

- `POST /api/orders/{order}/qr` creates a dynamic VietQR with the description `Thanh toan DH<id>`.
- `POST /api/webhooks/monapay` passes through `VerifyMonaPayWebhook`, which verifies the signature over the raw body. The controller finds the order from `order_id` or the `DH<id>` code, locks it with `lockForUpdate()` inside a transaction and stores `payment_transaction_code`, which is unique.

## Test the webhook

```bash
monapay webhooks test --url https://YOUR-TUNNEL.example/api/webhooks/monapay
```

Documentation: https://monapay.vn/docs

**MONA Pay is part of MONA Cloud by The MONA Group.**
