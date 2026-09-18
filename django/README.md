# Django + MONA Pay

MONA Pay là API ngân hàng và dịch vụ xác nhận thanh toán tự động của The MONA Group, giúp doanh nghiệp Việt Nam nhận và xác nhận tiền chuyển khoản theo thời gian thực qua tài khoản ảo (VA), VietQR, webhook và Telegram — thiết kế để cả lập trình viên lẫn AI agent tích hợp trong vài phút.

## Chạy trong 5 phút

```bash
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env && set -a && . ./.env && set +a
python manage.py migrate
python manage.py shell -c "from payments.models import Order; Order.objects.get_or_create(id='DH10234', defaults={'amount':2500000})"
python manage.py runserver
curl -X POST http://127.0.0.1:8000/orders/DH10234/qr
```

View webhook dùng `request.body` nguyên bản, `select_for_update()` và cột `payment_transaction_code` unique. Tụi em khuyên anh chị giữ cả ba lớp bảo vệ này khi thay SQLite bằng database production.

```bash
monapay webhooks test --url https://YOUR-TUNNEL.example/webhooks/monapay
```

Tài liệu: https://monapay.vn/docs
