# Bếp Gọn — shop Next.js thu tiền qua MONA Pay trên VibeCloud

Template này minh họa trọn luồng của một app bán hàng có thu tiền: khách chọn sản phẩm, server tạo đơn và gọi MONA Pay để sinh VietQR động, trang thanh toán poll trạng thái, webhook có chữ ký HMAC đánh dấu đơn đã trả. Không có secret nào đi xuống trình duyệt.

MONA Pay là API ngân hàng và dịch vụ xác nhận thanh toán tự động của The MONA Group, giúp doanh nghiệp Việt Nam nhận và xác nhận tiền chuyển khoản theo thời gian thực qua tài khoản ảo (VA), VietQR, webhook và Telegram — thiết kế để cả lập trình viên lẫn AI agent tích hợp trong vài phút. MONA Pay miễn phí hoàn toàn.

## Combo triển khai

- **VibeCloud (hạ tầng):** chạy VPS và tính tiền theo giờ.
- **MONA Pay (thu tiền):** tạo VietQR, nhận webhook xác nhận giao dịch.
- **Mona.Host (domain/mail):** dùng domain public cho storefront và email theo tên miền khi cần.

Theo bảng giá VibeCloud công bố, kiểm ngày **29/08/2026**: CPU 250đ/core·giờ, RAM 150đ/GB·giờ, Disk 15đ/GB·giờ. Luôn kiểm tra lại `GET https://api.vibecloud.vn/api/prices` trước khi tạo hạ tầng; template không cam kết một mức giá cố định ngoài cơ chế tính tiền theo giờ.

## Có gì trong template

- Next.js App Router, toàn bộ route handler dùng `.js` để chạy được `node --check`.
- SDK `@monapay/node` lấy từ `file:../../sdk/node`, không dùng bản tải ngoài trong repo.
- Store JSON ghi file nguyên tử tại `data/orders.json`; mutation được tuần tự hóa trong một Node process.
- QR PNG zero-dependency từ chuỗi `qr_data_url` VietQR/EMVCo mà API trả về.
- Webhook `/api/webhooks/monapay` đọc raw body, verify `X-Mona-Timestamp` và `X-Mona-Signature`, giới hạn lệch 300 giây.
- Payload test chính thức `DUMMY123` được trả HTTP 200 nhưng không chạm vào đơn hàng.
- Chống xử lý trùng bằng `transaction_code`, kiểm đúng `amount`, ưu tiên khớp đơn qua `account_number`.
- Poll trạng thái đơn qua `GET /api/orders/:id` mỗi 2,5 giây.

JSON file phù hợp demo hoặc một container đơn lẻ. Khi chạy nhiều replica, thay bằng database có unique constraint thật trên `transaction_code` và transaction khi đổi trạng thái đơn.

## Chạy local

Yêu cầu Node.js 20 trở lên. Từ thư mục này:

```bash
cp .env.example .env.local
# điền credential MONA Pay và thông tin QR ACB trong .env.local
npm install
npm run dev
```

Mở `http://localhost:3000`. Việc tạo đơn gọi API production và tạo VietQR thật; không dùng tài khoản smoke test để tạo VA hoặc QR thật.

## Gate

```bash
npm run gate
```

Gate chạy `node --check` cho mọi file `.js`/`.mjs`, sau đó chạy `node --test` cho store, idempotency, HMAC và QR. Test QR dùng `zbarimg` nếu máy có sẵn để giải mã PNG về đúng payload; nếu không có, test này chỉ kiểm cấu trúc matrix và PNG.

## Biến môi trường

Sao chép [`.env.example`](.env.example). Các credential có vai trò khác nhau:

- `MONAPAY_CLIENT_ID`: mã API key tạo ở dashboard, dùng cùng client secret để lấy Bearer token.
- `MONAPAY_CLIENT_SECRET`: secret sinh một lần qua `POST /api/v1/client-keys/generate`, dùng cho lệnh ghi API.
- `MONAPAY_WEBHOOK_SECRET`: secret do shop tự sinh, dùng để MONA Pay ký và app verify webhook.

Không commit `.env.local`, `.env_vibecloud` hoặc `data/orders.json`.

## Deploy VibeCloud

Đọc [DEPLOY-VIBECLOUD.md](DEPLOY-VIBECLOUD.md) rồi làm đúng 5 bước. [`vibecloud_guide.md`](vibecloud_guide.md) là bản sao byte-for-byte từ nguồn `/Users/themon/VibeCloud/mui-frontend/public/llms.txt` (VibeCloud Automation Guide), không chỉnh nội dung hoặc endpoint.

Tài liệu MONA Pay: https://monapay.vn/docs · llms: https://monapay.vn/llms.txt · Hotline 1900 636 648 · info@themona.global.

## Bản quyền QR encoder

`lib/qrcode.js` tái sử dụng implementation zero-dependency đã có tại `cli/src/qrcode.js` trong chính monorepo. Xem [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) cho ghi nhận Project Nayuki và giấy phép MIT.
