# Ví dụ tích hợp MONA Pay

MONA Pay là cổng thanh toán và API ngân hàng của The MONA Group, giúp doanh nghiệp Việt Nam nhận và xác nhận tiền chuyển khoản theo thời gian thực qua tài khoản ảo (VA), VietQR, webhook và Telegram — thiết kế để cả lập trình viên lẫn AI agent tích hợp trong vài phút.

Các ví dụ đều theo một flow: tạo VietQR động cho đơn, nhận webhook từ raw body, xác thực timestamp + HMAC-SHA256, đối chiếu số tiền rồi đánh dấu đơn đã thanh toán đúng một lần bằng `transaction_code`.

| Framework | Runtime | Ví dụ |
| --- | --- | --- |
| Next.js App Router | Node.js | [nextjs-app-router](./nextjs-app-router/) |
| Express | Node.js | [express](./express/) |
| NestJS | Node.js/TypeScript | [nestjs](./nestjs/) |
| Laravel | PHP | [laravel](./laravel/) |
| Django | Python | [django](./django/) |
| FastAPI | Python | [fastapi](./fastapi/) |
| Spring Boot | Java | [spring-boot](./spring-boot/) |
| Go `net/http` | Go | [go](./go/) |

Code lưu đơn bằng bộ nhớ hoặc SQLite để dễ chạy trong 5 phút. Khi lên production, anh chị thay phần repository bằng database thật, đặt unique constraint cho `transaction_code`, dùng HTTPS và chỉ đổi trạng thái sau khi khớp cả đơn lẫn số tiền.

Tài liệu đầy đủ: https://monapay.vn/docs · AI/LLM: https://monapay.vn/llms.txt
