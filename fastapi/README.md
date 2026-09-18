# FastAPI + MONA Pay

MONA Pay là API ngân hàng và dịch vụ xác nhận thanh toán tự động của The MONA Group, giúp doanh nghiệp Việt Nam nhận và xác nhận tiền chuyển khoản theo thời gian thực qua tài khoản ảo (VA), VietQR, webhook và Telegram — thiết kế để cả lập trình viên lẫn AI agent tích hợp trong vài phút.

## Chạy trong 5 phút

```bash
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env && set -a && . ./.env && set +a
uvicorn main:app --reload
curl -X POST http://127.0.0.1:8000/orders/DH10234/qr
```

Ví dụ tự tạo SQLite và đơn `DH10234`. Webhook đọc `await request.body()`, dùng `BEGIN IMMEDIATE`, đối chiếu số tiền và unique `payment_transaction_code` trước khi cập nhật. Khi lên production, tụi em khuyên anh chị chuyển sang database server nhưng giữ nguyên các ràng buộc này.

```bash
monapay webhooks test --url https://YOUR-TUNNEL.example/webhooks/monapay
```

Tài liệu: https://monapay.vn/docs
