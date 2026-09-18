# Spring Boot + MONA Pay

MONA Pay là API ngân hàng và dịch vụ xác nhận thanh toán tự động của The MONA Group, giúp doanh nghiệp Việt Nam nhận và xác nhận tiền chuyển khoản theo thời gian thực qua tài khoản ảo (VA), VietQR, webhook và Telegram — thiết kế để cả lập trình viên lẫn AI agent tích hợp trong vài phút.

## Chạy trong 5 phút

```bash
cp .env.example .env && set -a && . ./.env && set +a
mvn spring-boot:run
curl -X POST http://localhost:8080/orders/DH10234/qr
```

Java dùng `javax.crypto.Mac` trực tiếp để kiểm HMAC trên `byte[]` raw body, kiểm timestamp 5 phút và so sánh constant-time bằng `MessageDigest.isEqual`. `MonaPayClient` gọi login và QR API qua `java.net.http.HttpClient`, không cần SDK.

Map đơn trong ví dụ chỉ phù hợp local; khi lên production, anh chị cần database transaction và unique constraint trên `transaction_code`.

```bash
monapay webhooks test --url https://YOUR-TUNNEL.example/webhooks/monapay
```

Tài liệu: https://monapay.vn/docs
