# STATUS — VibeCloud shop template

Ngày kiểm: **29/08/2026**  
Trạng thái: **HOÀN TẤT**

## Đã bàn giao

- Storefront Next.js App Router: trang danh mục, chi tiết sản phẩm và thanh toán responsive.
- Tạo đơn rồi gọi `@monapay/node` qua dependency local `file:../../sdk/node` để sinh VietQR động.
- QR PNG zero-dependency; test đã giải mã ngược về đúng payload bằng `zbarimg`.
- Store JSON ghi nguyên tử, tuần tự hóa mutation trong một process.
- Poll trạng thái đơn mỗi 2,5 giây.
- Webhook `/api/webhooks/monapay`: raw body, HMAC-SHA256, tolerance 300 giây, amount check, `transaction_code` idempotency và conflict check.
- Payload test chính thức `DUMMY123` trả HTTP 200 sau khi verify nhưng không sửa đơn.
- Dockerfile, env mẫu, hướng dẫn deploy đủ 5 bước và prompt một đoạn cho Claude Code/Codex.
- `vibecloud_guide.md` là bản sao byte-for-byte của `/Users/themon/VibeCloud/mui-frontend/public/llms.txt`.

## Gate đã chạy

| Gate | Kết quả |
|---|---|
| `node --check` mọi `.js` / `.mjs` / `.ts` trong template | PASS |
| `node --test` | PASS — 8/8 test, 0 fail, 0 skip |
| QR PNG decode bằng `zbarimg` | PASS — payload trùng khớp |
| `next build` với Next.js 16.1.4 | PASS — compile và collect đủ 8 route |
| Checksum guide VibeCloud | PASS — cùng SHA-256 `0890039d96e8dc1d545259ecb408db52e26e40fd9d253ea9b40be3d226fbbf56` |
| Rà tên cổng cạnh tranh bị cấm | PASS — không có trong deliverable |

Build dùng Next/React đã có trong workspace qua symlink tạm; không chạy `npm install`, không tải dependency từ npm/PyPI. Symlink và `.next` tạm đã được dọn sau khi gate.

## Giới hạn kiểm thử

- Sandbox không cho bind cổng local (`listen EPERM`), nên không chạy browser smoke/screenshot trong phiên này. Production build đã pass.
- Không gọi tạo QR production, không tạo VA thật và không gửi webhook ra ngoài; cần credential merchant thật để chạy smoke end-to-end.
- JSON store chỉ dành cho một Node process/container. Nhiều replica phải chuyển sang database có unique constraint trên `transaction_code`.
