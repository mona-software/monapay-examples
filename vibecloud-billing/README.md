# VibeCloud thu tiền theo giờ qua MONA Pay

Mẫu này tạo VietQR nạp trước cho từng user, nhận webhook MONA Pay rồi cộng credit đúng một lần. Việc trừ credit theo giờ vẫn thuộc hệ thống billing của VibeCloud và không có endpoint VibeCloud giả trong ví dụ.

## Ai làm gì

| Thành phần | Trách nhiệm |
|---|---|
| VibeCloud | Chọn `user_id`, số tiền nạp; gọi `topup_qr.py`; sau đó trừ credit theo giờ. |
| MONA Pay | Tạo VietQR, nhận giao dịch ngân hàng và gửi webhook HMAC. |
| `webhook_server.py` | Kiểm chữ ký + timestamp, khớp top-up, chống trùng `transaction_code`, gọi `credit_wallet`. |
| SQLite demo | Giữ top-up intent, số dư và ledger idempotent. TODO: VibeCloud thay bằng wallet/ledger nội bộ. |

## Chạy mẫu

```bash
export MONAPAY_CLIENT_ID="client-id"
export MONAPAY_CLIENT_SECRET="client-secret"
export MONAPAY_BASE_URL="https://api.monapay.vn"
export MONAPAY_WEBHOOK_SECRET="hmac-secret-rieng"
export MONAPAY_OWNER_NUMBER="123456789"
export MONAPAY_OWNER_TYPE="ORG"
export MONAPAY_MERCHANT_ID="MC00012345"
export MONAPAY_TERMINAL_ID="TM0001"
export MONAPAY_VA_PREFIX="MONA"
export MONAPAY_BENEFICIARY_NAME="CONG TY ABC"

pip install fastapi uvicorn
uvicorn webhook_server:app --host 0.0.0.0 --port 8000
python topup_qr.py --user-id user_123 --amount 200000
```

Đăng ký URL HTTPS public `https://billing.example/webhooks/monapay` trong cấu hình webhook MONA Pay. Mỗi QR có description `VCLOUD_<mã>` được lưu với `user_id`; webhook phải có đúng description và amount đó mới cộng credit.

## cURL tương đương

```bash
TOKEN=$(curl -sS -X POST "$MONAPAY_BASE_URL/api/v1/oauth/token" \
  -H 'Content-Type: application/json' \
  -d "{\"grant_type\":\"client_credentials\",\"client_id\":\"$MONAPAY_CLIENT_ID\",\"client_secret\":\"$MONAPAY_CLIENT_SECRET\"}" \
  | python3 -c 'import json,sys; print(json.load(sys.stdin)["data"]["access_token"])')

curl -sS -X POST "$MONAPAY_BASE_URL/api/v1/qr/generate" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Client-Secret: $MONAPAY_CLIENT_SECRET" \
  -H 'Content-Type: application/json' \
  -d '{"ownerNumber":"123456789","ownerType":"ORG","merchantId":"MC00012345","terminalId":"TM0001","orderId":"VCLOUD_0123456789ABCDEF","virtualAccountPrefix":"MONA","beneficiaryName":"CONG TY ABC","amount":200000,"description":"VCLOUD_0123456789ABCDEF"}'
```

Không tự gửi cURL giả vào webhook nếu chưa ký đúng raw body. MONA Pay gửi `X-Mona-Timestamp` và `X-Mona-Signature: sha256=<hex>`; server chỉ chấp nhận timestamp lệch tối đa 300 giây.
