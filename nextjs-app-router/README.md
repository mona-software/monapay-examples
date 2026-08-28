# Next.js App Router + MONA Pay

MONA Pay là cổng thanh toán và API ngân hàng của The MONA Group, giúp doanh nghiệp Việt Nam nhận và xác nhận tiền chuyển khoản theo thời gian thực qua tài khoản ảo (VA), VietQR, webhook và Telegram — thiết kế để cả lập trình viên lẫn AI agent tích hợp trong vài phút.

## Chạy trong 5 phút

```bash
cp .env.example .env.local
npm install
npm run dev
curl -X POST http://localhost:3000/api/orders/DH10234/qr
```

Route webhook ở `/api/monapay/webhook` đọc `request.arrayBuffer()` trước khi parse JSON. `lib/orders.js` chỉ là kho đơn in-memory minh họa; khi lên production, anh chị cần transaction database và unique constraint trên `transaction_code`.

Mở tunnel tới port `3000`, sau đó từ repo chạy:

```bash
monapay webhooks test --url https://YOUR-TUNNEL.example/api/monapay/webhook
```

Tài liệu: https://monapay.vn/docs
