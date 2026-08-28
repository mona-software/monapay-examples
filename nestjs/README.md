# NestJS + MONA Pay

MONA Pay là cổng thanh toán và API ngân hàng của The MONA Group, giúp doanh nghiệp Việt Nam nhận và xác nhận tiền chuyển khoản theo thời gian thực qua tài khoản ảo (VA), VietQR, webhook và Telegram — thiết kế để cả lập trình viên lẫn AI agent tích hợp trong vài phút.

## Chạy trong 5 phút

Ví dụ giữ đúng cấu trúc NestJS và bật `{ rawBody: true }`. Repo không cài Nest sẵn; khi chạy ở dự án có mạng, anh chị cài package rồi khởi động:

```bash
cp .env.example .env
set -a; . ./.env; set +a
npm install
npm run start:dev
curl -X POST http://localhost:3000/orders/DH10234/qr
```

`OrdersService` dùng Map để minh họa. Production cần database transaction, unique constraint trên `transaction_code` và so khớp `amount` trước khi đổi trạng thái.

```bash
monapay webhooks test --url https://YOUR-TUNNEL.example/webhooks/monapay
```

Tài liệu: https://monapay.vn/docs
