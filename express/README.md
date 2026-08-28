# Express + MONA Pay

MONA Pay là cổng thanh toán và API ngân hàng của The MONA Group, giúp doanh nghiệp Việt Nam nhận và xác nhận tiền chuyển khoản theo thời gian thực qua tài khoản ảo (VA), VietQR, webhook và Telegram — thiết kế để cả lập trình viên lẫn AI agent tích hợp trong vài phút.

## Chạy trong 5 phút

```bash
cp .env.example .env
set -a; . ./.env; set +a
npm install
npm start
curl -X POST http://localhost:3000/orders/DH10234/qr
```

Middleware `express.raw()` được gắn trước `express.json()` để chữ ký luôn được tính trên đúng raw body. Khi lên production, anh chị thay Map đơn bằng database với unique constraint trên `transaction_code`.

Mở tunnel tới port `3000`, rồi test:

```bash
monapay webhooks test --url https://YOUR-TUNNEL.example/webhooks/monapay
```

Tài liệu: https://monapay.vn/docs
