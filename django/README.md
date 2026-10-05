# Django + MONA Pay

A Django project that creates a VietQR for an order and confirms payment through a verified MONA Pay webhook.

## Run

```bash
python3 -m venv .venv && . .venv/bin/activate
pip install monapay "Django>=5.0,<6.0"
cp .env.example .env && set -a && . ./.env && set +a
python manage.py migrate
python manage.py shell -c "from payments.models import Order; Order.objects.get_or_create(id='DH10234', defaults={'amount': 2500000})"
python manage.py runserver
curl -X POST http://127.0.0.1:8000/orders/DH10234/qr
```

`requirements.txt` points the SDK at `-e ../../sdk/python`, a path that does not exist in this repository, so the command above installs the published `monapay` package from PyPI instead.

## How it works

- `POST /orders/<order_id>/qr` creates a dynamic VietQR.
- `POST /webhooks/monapay` verifies the signature over the original `request.body`, locks the order with `select_for_update()`, checks the amount and stores `payment_transaction_code`, which has a unique constraint.
- The webhook finds the order from `order_id` in the payload, or from a `DH<number>` code in the transfer description.

Keep all three protections (raw body, row lock, unique column) when you replace SQLite with a production database.

## Test the webhook

```bash
monapay webhooks test --url https://YOUR-TUNNEL.example/webhooks/monapay
```

Documentation: https://monapay.vn/docs

**MONA Pay is part of MONA Cloud by The MONA Group.**
