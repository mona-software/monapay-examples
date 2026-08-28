# Deploy Bếp Gọn lên VibeCloud + cấu hình MONA Pay

Đọc trọn [`vibecloud_guide.md`](vibecloud_guide.md) trước khi chạy. Các endpoint VibeCloud dưới đây được lấy đúng từ guide đó: UI `https://vibecloud.vn`, API `https://api.vibecloud.vn`, tạo VPS `POST /api/lxc`, poll job `GET /api/jobs/:id`.

## 1. Tạo VPS qua API VibeCloud

Đăng nhập UI VibeCloud, tạo API key có prefix `vc_live_`, rồi tạo file local không commit:

```bash
cp .env_vibecloud.example .env_vibecloud
set -a
. ./.env_vibecloud
set +a
```

Xem package và giá đang công bố trước khi tạo:

```bash
curl "$VIBECLOUD_API_URL/api/packages"
curl "$VIBECLOUD_API_URL/api/prices"
```

Chọn một `package_slug` thực sự có trong response, không trộn package với custom sizing:

```bash
curl -sS -X POST "$VIBECLOUD_API_URL/api/lxc" \
  -H "Authorization: Bearer $VIBECLOUD_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"app_name":"bep-gon-shop","package_slug":"standard-2"}' \
  > vibecloud-job.json

JOB_ID=$(python3 -c 'import json; print(json.load(open("vibecloud-job.json"))["id"])')
```

Response là job, chưa phải VPS. Poll 3–5 giây/lần cho tới `succeeded`; dừng ngay nếu `failed` hoặc `cancelled`:

```bash
for i in {1..60}; do
  curl -sS "$VIBECLOUD_API_URL/api/jobs/$JOB_ID" \
    -H "Authorization: Bearer $VIBECLOUD_API_TOKEN" > vibecloud-job.json
  STATUS=$(python3 -c 'import json; print(json.load(open("vibecloud-job.json"))["status"])')
  [ "$STATUS" = "succeeded" ] && break
  if [ "$STATUS" = "failed" ] || [ "$STATUS" = "cancelled" ]; then
    python3 -m json.tool vibecloud-job.json
    exit 1
  fi
  sleep 5
done
python3 -m json.tool vibecloud-job.json
```

Lấy `result.ip_address` và `result.credentials.ssh_private_key` theo §8 của guide. File private key phải có mode `600`. Nếu API trả 402, người dùng cần nạp tiền trong UI; token `vc_live_*` không gọi được `/api/me` hoặc endpoint nạp tiền.

## 2. Deploy Next.js bằng Docker

VPS mới là Ubuntu 24.04 tối giản. Cài `curl`, CA certificate và Docker trên VPS, đúng lưu ý bootstrap trong guide:

```bash
ssh -i ~/.ssh/vibecloud_bep_gon root@<ip_address> \
  'DEBIAN_FRONTEND=noninteractive apt-get update -q && apt-get install -yq curl ca-certificates docker.io && systemctl enable --now docker'
```

Từ root monorepo `MONApay` trên máy local, chuyển SDK, CLI và app (giữ đúng đường dẫn `examples/vibecloud-shop`):

```bash
ssh -i ~/.ssh/vibecloud_bep_gon root@<ip_address> 'mkdir -p /opt/MONApay/examples'
rsync -az --exclude node_modules --exclude .next \
  -e 'ssh -i ~/.ssh/vibecloud_bep_gon' sdk cli root@<ip_address>:/opt/MONApay/
rsync -az --exclude node_modules --exclude .next --exclude .env.local \
  -e 'ssh -i ~/.ssh/vibecloud_bep_gon' \
  examples/vibecloud-shop root@<ip_address>:/opt/MONApay/examples/
```

Trên VPS, tạo env production từ `.env.example`, điền secret thật, rồi build. Dockerfile dùng context root để dependency `file:../../sdk/node` vẫn đúng:

```bash
cd /opt/MONApay
cp examples/vibecloud-shop/.env.example /opt/vibecloud-shop.env
chmod 600 /opt/vibecloud-shop.env
# sửa /opt/vibecloud-shop.env bằng editor; không đưa file này vào image

docker build -f examples/vibecloud-shop/Dockerfile -t vibecloud-shop:latest .
mkdir -p /opt/vibecloud-shop-data
chown 1000:1000 /opt/vibecloud-shop-data
docker run -d --name vibecloud-shop \
  --restart unless-stopped \
  --env-file /opt/vibecloud-shop.env \
  -e ORDER_STORE_PATH=/data/orders.json \
  -v /opt/vibecloud-shop-data:/data \
  -p 80:3000 \
  vibecloud-shop:latest

curl -I http://127.0.0.1
```

Port 80 cho phép smoke test bằng IP. Trước production, trỏ domain quản lý tại Mona.Host về IP VPS, tạo lại container với `-p 127.0.0.1:3000:3000`, rồi đặt HTTPS reverse proxy trên cổng 80/443 phía trước port 3000; dùng URL HTTPS đó ở bước 4. VibeCloud chặn SMTP outbound 25/465/587, nên nếu app gửi mail hãy dùng nhà cung cấp mail có HTTP API.

## 3. Đăng ký MONA Pay và sinh client key

Tài khoản mới dùng ngay. Các lệnh ghi cần cả Bearer token và `X-Client-Secret`; client secret chỉ được trả về một lần khi sinh key:

```bash
BASE=https://api.monapay.vn
MONAPAY_USERNAME='shop-cua-ban'
MONAPAY_PASSWORD='mat-khau-dai-va-rieng'
MONAPAY_NAME='Bep Gon Shop'

curl -sS -X POST "$BASE/api/v1/client/register-client" \
  -H 'Content-Type: application/json' \
  -d "{\"username\":\"$MONAPAY_USERNAME\",\"password\":\"$MONAPAY_PASSWORD\",\"name\":\"$MONAPAY_NAME\"}"

LOGIN_JSON=$(curl -sS -X POST "$BASE/api/v1/client/login" \
  -H 'Content-Type: application/json' \
  -d "{\"username\":\"$MONAPAY_USERNAME\",\"password\":\"$MONAPAY_PASSWORD\"}")
MONAPAY_TOKEN=$(printf '%s' "$LOGIN_JSON" | python3 -c 'import json,sys; print(json.load(sys.stdin)["data"]["access_token"])')

KEY_JSON=$(curl -sS -X POST "$BASE/api/v1/client-keys/generate" \
  -H "Authorization: Bearer $MONAPAY_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Bep Gon VibeCloud"}')
MONAPAY_CLIENT_SECRET=$(printf '%s' "$KEY_JSON" | python3 -c 'import json,sys; print(json.load(sys.stdin)["data"]["client_secret"])')
```

Ghi `MONAPAY_USERNAME`, `MONAPAY_PASSWORD` và `MONAPAY_CLIENT_SECRET` vào `/opt/vibecloud-shop.env`. Điền thêm thông tin ACB/QR do dashboard MONA Pay cung cấp: owner number, owner type, merchant ID, terminal ID, VA prefix và beneficiary name. Restart container sau khi sửa env:

```bash
docker rm -f vibecloud-shop
# chạy lại lệnh docker run ở bước 2 với cùng volume dữ liệu
```

## 4. Cấu hình webhook public

Sinh secret HMAC tối thiểu 32 ký tự, lưu cùng một giá trị ở env app và cấu hình MONA Pay:

```bash
MONAPAY_WEBHOOK_SECRET=$(openssl rand -hex 32)
WEBHOOK_URL='https://shop.ten-mien-cua-ban.vn/api/webhooks/monapay'

curl -sS -X POST "$BASE/api/v1/client-webhooks" \
  -H "Authorization: Bearer $MONAPAY_TOKEN" \
  -H "X-Client-Secret: $MONAPAY_CLIENT_SECRET" \
  -H 'Content-Type: application/json' \
  -d "{\"name\":\"Bep Gon VibeCloud\",\"webhook_url\":\"$WEBHOOK_URL\",\"auth_type\":\"HMAC_SHA256\",\"secret_key\":\"$MONAPAY_WEBHOOK_SECRET\",\"payload_format\":\"application/json\"}"
```

Ghi `MONAPAY_WEBHOOK_SECRET` vào `/opt/vibecloud-shop.env` và restart container. Không dùng lẫn secret HMAC này với `MONAPAY_CLIENT_SECRET`.

## 5. Test bằng MONA Pay CLI

CLI trong monorepo là zero-dependency. Link bản local rồi bắn payload dummy đến đúng URL public:

```bash
cd /opt/MONApay
npm link ./cli
set -a
. /opt/vibecloud-shop.env
set +a
WEBHOOK_URL='https://shop.ten-mien-cua-ban.vn/api/webhooks/monapay'
monapay login \
  --username "$MONAPAY_USERNAME" \
  --password "$MONAPAY_PASSWORD" \
  --secret "$MONAPAY_CLIENT_SECRET"
monapay webhooks test \
  --url "$WEBHOOK_URL" \
  --auth HMAC_SHA256 \
  --secret "$MONAPAY_WEBHOOK_SECRET"
```

Kiểm `GET /api/v1/webhook-logs?limit=5` hoặc dashboard để xác nhận HTTP 200. Endpoint nhận diện cặp chính thức `transaction_code=DUMMY123` và `description=DUMMY TRANSACTION MONAPAY`, trả 200 sau khi verify HMAC nhưng không sửa bất kỳ đơn hàng nào.

## Prompt một đoạn cho Claude Code / Codex

> Đọc `vibecloud_guide.md`, `DEPLOY-VIBECLOUD.md` và `.env_vibecloud` rồi deploy app bán hàng có thu tiền này trọn 5 bước: gọi đúng API `https://api.vibecloud.vn` để list package và tạo một LXC qua `POST /api/lxc`, poll `GET /api/jobs/:id` tới `succeeded`, SSH và deploy Next.js bằng Docker với volume bền vững cho JSON store, đăng ký/đăng nhập MONA Pay rồi sinh client key, cấu hình webhook HMAC public `/api/webhooks/monapay`, cuối cùng chạy `monapay webhooks test` và báo lại IP/domain, service ID, kết quả HTTP cùng chi phí giờ từ response; không tự tạo database, không in secret, không dùng endpoint ngoài guide và dừng hỏi tôi nếu gặp 402, quota 409 hoặc cần nạp tiền.

## Dọn hạ tầng khi không dùng

`stop` vẫn tính tiền. Muốn dừng tính phí phải xóa service (thao tác không thể hoàn tác):

```bash
curl -X DELETE "$VIBECLOUD_API_URL/api/services/<service_id>" \
  -H "Authorization: Bearer $VIBECLOUD_API_TOKEN"
```

Chỉ chạy sau khi đã sao lưu `/opt/vibecloud-shop-data/orders.json` và xác nhận đúng service ID.
