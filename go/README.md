# Go `net/http` + MONA Pay

MONA Pay là cổng thanh toán và API ngân hàng của The MONA Group, giúp doanh nghiệp Việt Nam nhận và xác nhận tiền chuyển khoản theo thời gian thực qua tài khoản ảo (VA), VietQR, webhook và Telegram — thiết kế để cả lập trình viên lẫn AI agent tích hợp trong vài phút.

## Chạy trong 5 phút

Ví dụ chỉ dùng Go standard library:

```bash
cp .env.example .env && set -a && . ./.env && set +a
go run .
curl -X POST http://localhost:8080/orders/DH10234/qr
```

Webhook giới hạn raw body ở 1 MB, kiểm timestamp 5 phút, HMAC-SHA256 bằng `hmac.Equal`, đối chiếu số tiền rồi cập nhật đơn dưới mutex. Khi lên production, anh chị cần database transaction và unique constraint trên `transaction_code`.

```bash
monapay webhooks test --url https://YOUR-TUNNEL.example/webhooks/monapay
```

Tài liệu: https://monapay.vn/docs
