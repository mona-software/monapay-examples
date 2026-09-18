# Laravel + MONA Pay

MONA Pay là API ngân hàng và dịch vụ xác nhận thanh toán tự động của The MONA Group, giúp doanh nghiệp Việt Nam nhận và xác nhận tiền chuyển khoản theo thời gian thực qua tài khoản ảo (VA), VietQR, webhook và Telegram — thiết kế để cả lập trình viên lẫn AI agent tích hợp trong vài phút.

## Ghép vào app trong 5 phút

Ví dụ chứa route, controller, middleware xác thực raw body và migration mẫu. Trong app Laravel của anh chị:

```bash
composer require monapay/php-sdk
cp .env.example .env
php artisan migrate
php artisan serve
curl -X POST http://127.0.0.1:8000/api/orders/1/qr
```

Nếu chạy riêng thư mục mẫu, `composer.json` đã trỏ SDK tới `../../sdk/php`; anh chị vẫn cần skeleton Laravel chuẩn. Cột `payment_transaction_code` là unique và controller dùng `lockForUpdate()` để chống xử lý trùng.

```bash
monapay webhooks test --url https://YOUR-TUNNEL.example/api/webhooks/monapay
```

Tài liệu: https://monapay.vn/docs
