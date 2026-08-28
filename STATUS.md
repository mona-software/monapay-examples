# EXAMPLES STATUS — 2026-08-29

## Trạng thái

Hoàn thành 8 ví dụ: Next.js App Router, Express, NestJS, Laravel, Django, FastAPI, Spring Boot và Go `net/http`.

Mỗi ví dụ có `.env.example`, README 5 phút, endpoint tạo QR động và endpoint webhook theo cùng flow:

1. Đọc raw body và xác thực timestamp + HMAC-SHA256.
2. Tìm đơn từ `order_id` hoặc mã đơn trong `description`.
3. Đối chiếu `amount`.
4. Chống trùng bằng `transaction_code` rồi mới đánh dấu đã thanh toán.

Java và Go gọi login/QR API trực tiếp; Java dùng `javax.crypto.Mac`, Go dùng `crypto/hmac`. Laravel dùng `monapay/php-sdk`; Django/FastAPI dùng `monapay`; các ví dụ Node dùng `@monapay/node`.

## Gate đã chạy

- `node --test cli` — PASS, 7/7 test.
- `find cli examples -type f -name '*.js' -print0 | xargs -0 -n1 node --check` — PASS.
- `python3 -m compileall examples/django examples/fastapi` — PASS.
- Bổ sung: `GOCACHE=/private/tmp/monapay-go-cache go test ./...` trong `examples/go` — PASS.

Các thư mục `__pycache__` sinh bởi gate đã được dọn khỏi working tree.

## Ghi chú môi trường

Không cài dependency từ mạng. Vì môi trường không có PHP runtime và chưa có framework dependencies, không boot Laravel/NestJS/Next.js/Express/Spring Boot; các file đã được kiểm tra tĩnh theo gate của brief.
