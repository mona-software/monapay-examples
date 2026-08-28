# VibeCloud Automation Guide

## English

### 1. How to use this file

Download `vibecloud_guide.md` from the VibeCloud UI and place it in the root of your application repository.

Before asking Claude (or any AI agent) to deploy, tell it to read `vibecloud_guide.md` first. This file explains everything an agent needs: authenticate, list packages, create a VPS or database, poll the provisioning job, use the returned credentials to deploy, manage services, and recover from common gotchas.

Recommended repository layout:

```text
my-application/
  vibecloud_guide.md
  .env_vibecloud
  package.json
  src/
```

Use `.env_vibecloud` to store the VibeCloud API URL and API token. Do not commit `.env_vibecloud` to git.

> **Hosts (important):**
> - **UI / web app:** `https://vibecloud.vn` — humans log in, manage services, top up balance, generate tokens.
> - **API:** `https://api.vibecloud.vn` — every `POST /api/...` / `GET /api/...` call in this guide goes here. The UI host does **not** serve `/api`.

### 2. Get an API token

Open the VibeCloud UI at `https://vibecloud.vn`, sign in with your email, then go to **API Keys** and create a key for agent automation. The key has the prefix `vc_live_`.

You can also use the helper script (point it at the **API** host):

```bash
./scripts/vibecloud-auth.sh https://api.vibecloud.vn
```

On Windows PowerShell:

```powershell
.\scripts\vibecloud-auth.ps1 -ApiUrl https://api.vibecloud.vn
```

The command writes `.env_vibecloud` in the current directory:

```env
VIBECLOUD_API_URL=https://api.vibecloud.vn
VIBECLOUD_API_TOKEN=vc_live_xxx
```

Authenticate every request with the standard bearer header:

```bash
curl -H "Authorization: Bearer $VIBECLOUD_API_TOKEN" ...
```

### 3. What `vc_live_*` tokens can and can't do

`vc_live_*` automation tokens are scoped for infrastructure work. Endpoint matrix:

| Capability | Endpoint | `vc_live_*` works? |
|---|---|---|
| List packages | `GET /api/packages` | ✅ (no auth even needed) |
| List public prices | `GET /api/prices` | ✅ (no auth needed) |
| Create LXC / database | `POST /api/lxc`, `POST /api/databases` | ✅ |
| Poll job | `GET /api/jobs/:id` | ✅ |
| List / get / stop / start / delete / rebuild / resize a service | `/api/services/*`, `/api/lxc/:id/*` | ✅ |
| Check account balance | `GET /api/me` | ❌ HTTP 401 (UI session only) |
| Top up funds | `POST /api/payments/vietqr` | ❌ HTTP 401 (UI session only) |
| Manage API keys | `POST /api/api-keys`, `DELETE /api/api-keys/:id` | ❌ HTTP 401 (UI session only) |

If an agent needs to check the balance, the human should top up via the UI and tell the agent "you have enough budget". The agent will see HTTP 402 `Insufficient credit` if it tries to provision beyond the available balance — see §11.

### 4. List available packages (optional but recommended)

```bash
curl "$VIBECLOUD_API_URL/api/packages"
```

Returns the list of preset packages with `slug`, `name`, `cpu`, `ram_gb`, `disk_gb`. Pick a `slug` like `standard-2` to use in §5/§6.

### 5. Create an LXC VPS

VibeCloud accepts **two sizing shapes**. Pick whichever fits:

- **A. Named package** — `package_slug` resolves server-side to a preset cpu/ram_gb/disk_gb.
- **B. Custom sizing** — pass `cpu`, `ram_gb`, `disk_gb` directly.

Mixing the two (slug + dims at the same time) returns HTTP 422.

#### Using a package

```bash
curl -X POST "$VIBECLOUD_API_URL/api/lxc" \
  -H "Authorization: Bearer $VIBECLOUD_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"app_name":"my-app","package_slug":"standard-2"}'
```

#### Using custom sizing

```bash
curl -X POST "$VIBECLOUD_API_URL/api/lxc" \
  -H "Authorization: Bearer $VIBECLOUD_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"app_name":"my-app","cpu":2,"ram_gb":2,"disk_gb":30}'
```

The response is a **job**, not a finished VPS:

```jsonc
{
  "id": "65f00000000000000000000a",
  "type": "create_lxc",
  "status": "pending",
  "result": null,
  "error": null,
  "attempts": 0,
  "max_attempts": 3,
  "created_at": "...",
  "updated_at": "..."
}
```

Provisioning takes 60–180 s. Poll the job (see §7).

### 6. Create a database instance

Same two shapes. `engine` is required and must be one of `mongodb`, `postgresql`, `mysql`.

#### Using a package

```bash
curl -X POST "$VIBECLOUD_API_URL/api/databases" \
  -H "Authorization: Bearer $VIBECLOUD_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"app_name":"my-app","engine":"mongodb","package_slug":"standard-2"}'
```

#### Using custom sizing

```bash
curl -X POST "$VIBECLOUD_API_URL/api/databases" \
  -H "Authorization: Bearer $VIBECLOUD_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"app_name":"my-app","engine":"postgresql","cpu":2,"ram_gb":2,"disk_gb":30}'
```

Returns a job, same shape as the LXC job above.

### 7. Poll the job until it finishes

```bash
curl "$VIBECLOUD_API_URL/api/jobs/<job_id>" \
  -H "Authorization: Bearer $VIBECLOUD_API_TOKEN"
```

`status` transitions through one of these terminal states:

| status | meaning | what to do |
|---|---|---|
| `pending` | queued, not started yet | wait + poll again in 3–5 s |
| `running` | actively provisioning | wait + poll again in 3–5 s |
| `retrying` | last attempt failed, will auto-retry | wait + poll again in 10–30 s |
| `succeeded` | done — read `result` | proceed to §8 |
| `failed` | exhausted retries — read `error` | inspect `error`; you may `POST /api/jobs/:id/retry` after fixing the issue |
| `cancelled` | admin cancelled the job | stop polling |

Recommended polling pattern (bash):

```bash
JOB_ID="...id from create call..."
for i in {1..60}; do
  RESP=$(curl -s "$VIBECLOUD_API_URL/api/jobs/$JOB_ID" \
    -H "Authorization: Bearer $VIBECLOUD_API_TOKEN")
  STATUS=$(echo "$RESP" | python3 -c 'import json,sys; print(json.load(sys.stdin)["status"])')
  if [ "$STATUS" = "succeeded" ]; then
    echo "$RESP" | python3 -m json.tool
    break
  fi
  if [ "$STATUS" = "failed" ] || [ "$STATUS" = "cancelled" ]; then
    echo "$RESP" >&2
    exit 1
  fi
  sleep 5
done
```

When `status=succeeded`, `result` is the full service object: `id`, `kind`, `status`, `name`, `ip_address`, `cpu`/`ram_gb`/`disk_gb`, `power_state`, `hourly_rate_vnd`, `credentials` (LXC) or `databases[]` (database service), `created_at`, etc.

### 8. Use the credentials

#### LXC — SSH in and deploy

`result.credentials` contains `root_password`, `ssh_private_key` (PEM), `ssh_public_key`. `result.ip_address` is the public IP.

The PEM is returned as a standard JSON string with `\n`-escaped newlines (use any standard JSON parser — `json.loads` works fine, no special flags). Save it and chmod 600:

```bash
mkdir -p ~/.ssh
python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["result"]["credentials"]["ssh_private_key"])' job.json > ~/.ssh/vibecloud_my_app
chmod 600 ~/.ssh/vibecloud_my_app
ssh -i ~/.ssh/vibecloud_my_app root@<ip_address>
```

The image is a fresh Ubuntu 24.04 LXC. **It ships minimal** — `curl` and `ca-certificates` are NOT preinstalled. Always run this once before downloading anything:

```bash
ssh -i ~/.ssh/vibecloud_my_app root@<ip_address> \
  'DEBIAN_FRONTEND=noninteractive apt-get update -q && apt-get install -yq curl ca-certificates'
```

#### Database — connect via the returned connection string

`result.databases[0]` contains `engine`, `host`, `port`, `database`, `username`, `password`, `connection_string`. The connection string is ready to drop into your app's env var:

```bash
# example for mongodb
export DATABASE_URL=$(jq -r '.result.databases[0].connection_string' job.json)
```

For multiple logical databases on the same instance, see §10.

### 9. Manage running services

```bash
# List your services
curl "$VIBECLOUD_API_URL/api/services" \
  -H "Authorization: Bearer $VIBECLOUD_API_TOKEN"

# Get one service (includes credentials)
curl "$VIBECLOUD_API_URL/api/services/<service_id>" \
  -H "Authorization: Bearer $VIBECLOUD_API_TOKEN"

# Stop / start (you keep paying while stopped — destroy if you don't need it)
curl -X POST "$VIBECLOUD_API_URL/api/services/<service_id>/stop"   -H "Authorization: Bearer $VIBECLOUD_API_TOKEN"
curl -X POST "$VIBECLOUD_API_URL/api/services/<service_id>/start"  -H "Authorization: Bearer $VIBECLOUD_API_TOKEN"

# Delete permanently (frees the IP after a 3h cooldown for ARP cache safety)
curl -X DELETE "$VIBECLOUD_API_URL/api/services/<service_id>" \
  -H "Authorization: Bearer $VIBECLOUD_API_TOKEN"
```

LXC-specific:

```bash
# Resize CPU / RAM / disk (disk can only grow). Body matches LxcResizeRequest:
curl -X POST "$VIBECLOUD_API_URL/api/lxc/<service_id>/resize" \
  -H "Authorization: Bearer $VIBECLOUD_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"cpu":4,"ram_gb":8,"disk_gb":60}'

# Rebuild — destroys and recreates the LXC with the SAME ip + credentials.
# Returns a job, poll it like §7.
curl -X POST "$VIBECLOUD_API_URL/api/services/<service_id>/rebuild" \
  -H "Authorization: Bearer $VIBECLOUD_API_TOKEN"
```

Database-specific:

```bash
# Add another logical database to an existing instance (same VPS, separate DB):
curl -X POST "$VIBECLOUD_API_URL/api/databases/<service_id>/databases" \
  -H "Authorization: Bearer $VIBECLOUD_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"app_name":"another-app"}'

# Rotate a database's password:
curl -X POST "$VIBECLOUD_API_URL/api/databases/<service_id>/databases/<db_name>/change-password" \
  -H "Authorization: Bearer $VIBECLOUD_API_TOKEN"
```

### 10. Operational gotchas

**Reused IP triggers SSH "REMOTE HOST IDENTIFICATION HAS CHANGED"**
When you `delete` an LXC and a new one later gets the same IP (after the 3-hour cooldown), the new host has a different SSH host key. Your `~/.ssh/known_hosts` still has the old one. Clear it:

```bash
ssh-keygen -R <ip_address>
# then ssh normally; accept the new fingerprint
```

**Outbound SMTP (ports 25/465/587) is blocked**
A firewall security group named `block-smtp` is attached to every new LXC to prevent abuse. If your app legitimately needs to send mail, use an HTTP-API mail provider (SendGrid, Mailgun, Resend, AWS SES).

**Stopped services still bill**
`stop` only powers the container off — it still occupies disk and an IP, so you keep paying the hourly rate. To stop paying, `DELETE` the service.

**Provisioning vs power state**
Service `status=active` means VibeCloud finished provisioning. `power_state=running` means the LXC kernel is up. After a `stop`, `status` stays `active` but `power_state` becomes `stopped`.

### 11. Billing

- Every active service is billed hourly. Each tick debits the service's `hourly_rate_vnd` from your balance.
- Stopped services keep billing (see gotcha above).
- Destroyed services do not bill.
- When your balance hits zero, the service is **suspended** (powered off). It stays in `suspended` for the configured grace period (default 7 days). After the grace period it's destroyed automatically and the IP is freed.
- LXC resize uses "Option D" billing: the container is resized immediately but the new hourly rate kicks in at the next hourly tick. The in-progress hour is charged at the old rate. `pending_hourly_rate_vnd` shows the queued rate.

### 12. Common error responses

| HTTP | Meaning | What to do |
|---|---|---|
| `401` | Missing / invalid / expired token | Re-check the `Authorization: Bearer ...` header, or re-run the auth script. `vc_live_*` tokens are also rejected by `/api/me` and the payment endpoints — those need a UI session. |
| `402` | Insufficient credit for the requested service | Ask the human to top up via `https://vibecloud.vn`. |
| `404` | Service / job / package not found, or `package_slug` references an inactive/deleted package | Double-check the id / slug. Use `GET /api/packages` to list current valid slugs. |
| `409` | Conflicting state (e.g. trying to delete a running LXC, resize while provisioning), OR **service-quota cap reached** on `POST /api/lxc` or `POST /api/databases` | Read the `detail` field. If it's a quota cap, the message includes `used/limit` and tier — the human must request a quota increase via the UI. |
| `422` | Schema validation — typo in field, wrong type, both `package_slug` and explicit dims passed at once | Read the `detail` array; it points at the failing field. |

### Service quotas and network cap

Every account starts with a small service cap:

- **Free tier** (never paid) — 2 VPS + 2 database
- **Paid tier** (paid at least once) — 10 VPS + 10 database

Customers can request higher limits via the UI; an admin approves or
denies, and the new cap is in effect immediately for subsequent agent
calls. Trying to exceed the cap returns the 409 above.

Every VPS NIC is bandwidth-capped at **200 Mbps** (25 MB/s). If you
benchmark with `iperf3 -c …` and see ~190–200 Mbps, that's the
provisioned cap, not a transient throttle.

---

## Tiếng Việt

### 1. Cách dùng file này

Tải file `vibecloud_guide.md` từ giao diện VibeCloud và đặt file này ở thư mục gốc của repository ứng dụng.

Trước khi yêu cầu Claude (hoặc agent AI bất kỳ) deploy, hãy bảo nó đọc `vibecloud_guide.md` trước. File này hướng dẫn agent: xác thực, liệt kê package, tạo VPS hoặc database, poll job provisioning, dùng credential trả về để deploy, quản lý service, và xử lý các vấn đề thường gặp.

Cấu trúc repository khuyến nghị:

```text
my-application/
  vibecloud_guide.md
  .env_vibecloud
  package.json
  src/
```

Dùng `.env_vibecloud` để lưu VibeCloud API URL và API token. Không commit `.env_vibecloud` lên git.

> **Hosts (quan trọng):**
> - **Web UI:** `https://vibecloud.vn` — người dùng đăng nhập, quản lý service, nạp tiền, tạo token.
> - **API:** `https://api.vibecloud.vn` — mọi lệnh `POST /api/...` / `GET /api/...` trong tài liệu này đều gọi tới host này. Host UI **không** phục vụ `/api`.

### 2. Lấy API token

Mở `https://vibecloud.vn`, đăng nhập, vào **API Keys** và tạo key cho agent automation. Key có prefix `vc_live_`.

Hoặc dùng helper script (truyền **API host**):

```bash
./scripts/vibecloud-auth.sh https://api.vibecloud.vn
```

Trên Windows PowerShell:

```powershell
.\scripts\vibecloud-auth.ps1 -ApiUrl https://api.vibecloud.vn
```

Lệnh tạo file `.env_vibecloud` ở thư mục hiện tại:

```env
VIBECLOUD_API_URL=https://api.vibecloud.vn
VIBECLOUD_API_TOKEN=vc_live_xxx
```

Mọi request gắn header:

```bash
curl -H "Authorization: Bearer $VIBECLOUD_API_TOKEN" ...
```

### 3. Token `vc_live_*` làm được gì và không làm được gì

| Khả năng | Endpoint | `vc_live_*` được? |
|---|---|---|
| Liệt kê package | `GET /api/packages` | ✅ (không cần auth) |
| Xem giá public | `GET /api/prices` | ✅ (không cần auth) |
| Tạo LXC / database | `POST /api/lxc`, `POST /api/databases` | ✅ |
| Poll job | `GET /api/jobs/:id` | ✅ |
| List / get / stop / start / delete / rebuild / resize service | `/api/services/*`, `/api/lxc/:id/*` | ✅ |
| Xem số dư tài khoản | `GET /api/me` | ❌ HTTP 401 (chỉ UI session) |
| Nạp tiền | `POST /api/payments/vietqr` | ❌ HTTP 401 (chỉ UI session) |
| Quản lý API key | `POST /api/api-keys`, `DELETE /api/api-keys/:id` | ❌ HTTP 401 (chỉ UI session) |

Nếu agent cần kiểm tra số dư, người dùng nên nạp tiền qua UI rồi báo "bạn đủ tiền". Agent sẽ thấy HTTP 402 `Insufficient credit` nếu cố tạo service vượt quá số dư — xem §11.

### 4. Liệt kê các package có sẵn (khuyến nghị)

```bash
curl "$VIBECLOUD_API_URL/api/packages"
```

Trả về danh sách package preset gồm `slug`, `name`, `cpu`, `ram_gb`, `disk_gb`. Chọn `slug` như `standard-2` để dùng ở §5/§6.

### 5. Tạo LXC VPS

VibeCloud nhận **hai dạng sizing**. Chọn dạng tiện hơn:

- **A. Theo package** — `package_slug` được expand server-side ra cpu/ram_gb/disk_gb.
- **B. Custom sizing** — truyền thẳng `cpu`, `ram_gb`, `disk_gb`.

Truyền cả hai cùng lúc sẽ trả HTTP 422.

#### Theo package

```bash
curl -X POST "$VIBECLOUD_API_URL/api/lxc" \
  -H "Authorization: Bearer $VIBECLOUD_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"app_name":"my-app","package_slug":"standard-2"}'
```

#### Custom sizing

```bash
curl -X POST "$VIBECLOUD_API_URL/api/lxc" \
  -H "Authorization: Bearer $VIBECLOUD_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"app_name":"my-app","cpu":2,"ram_gb":2,"disk_gb":30}'
```

Response là một **job**, không phải VPS đã hoàn tất:

```jsonc
{
  "id": "65f00000000000000000000a",
  "type": "create_lxc",
  "status": "pending",
  "result": null,
  "error": null,
  "attempts": 0,
  "max_attempts": 3
}
```

Provisioning mất 60–180 giây. Poll job (xem §7).

### 6. Tạo database instance

Hai dạng tương tự. `engine` bắt buộc, là một trong: `mongodb`, `postgresql`, `mysql`.

#### Theo package

```bash
curl -X POST "$VIBECLOUD_API_URL/api/databases" \
  -H "Authorization: Bearer $VIBECLOUD_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"app_name":"my-app","engine":"mongodb","package_slug":"standard-2"}'
```

#### Custom sizing

```bash
curl -X POST "$VIBECLOUD_API_URL/api/databases" \
  -H "Authorization: Bearer $VIBECLOUD_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"app_name":"my-app","engine":"postgresql","cpu":2,"ram_gb":2,"disk_gb":30}'
```

### 7. Poll job tới khi xong

```bash
curl "$VIBECLOUD_API_URL/api/jobs/<job_id>" \
  -H "Authorization: Bearer $VIBECLOUD_API_TOKEN"
```

`status` đi qua một trong các trạng thái:

| status | nghĩa | hành động |
|---|---|---|
| `pending` | đang chờ | poll lại sau 3–5 giây |
| `running` | đang chạy | poll lại sau 3–5 giây |
| `retrying` | lần thử trước fail, sẽ auto retry | poll lại sau 10–30 giây |
| `succeeded` | xong — đọc `result` | sang §8 |
| `failed` | hết retry — đọc `error` | xem `error`; có thể `POST /api/jobs/:id/retry` sau khi fix |
| `cancelled` | admin huỷ | dừng poll |

Pattern poll khuyến nghị (bash):

```bash
JOB_ID="...id từ lệnh create..."
for i in {1..60}; do
  RESP=$(curl -s "$VIBECLOUD_API_URL/api/jobs/$JOB_ID" \
    -H "Authorization: Bearer $VIBECLOUD_API_TOKEN")
  STATUS=$(echo "$RESP" | python3 -c 'import json,sys; print(json.load(sys.stdin)["status"])')
  if [ "$STATUS" = "succeeded" ]; then echo "$RESP" | python3 -m json.tool; break; fi
  if [ "$STATUS" = "failed" ] || [ "$STATUS" = "cancelled" ]; then echo "$RESP" >&2; exit 1; fi
  sleep 5
done
```

Khi `status=succeeded`, `result` là service object đầy đủ: `id`, `kind`, `status`, `name`, `ip_address`, `cpu`/`ram_gb`/`disk_gb`, `power_state`, `hourly_rate_vnd`, `credentials` (LXC) hoặc `databases[]` (database), v.v.

### 8. Dùng credential

#### LXC — SSH vào để deploy

`result.credentials` có `root_password`, `ssh_private_key` (PEM), `ssh_public_key`. `result.ip_address` là IP public.

PEM trả về là JSON string chuẩn (xuống dòng escape `\n` — dùng parser JSON nào cũng được). Lưu file và chmod 600:

```bash
mkdir -p ~/.ssh
python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["result"]["credentials"]["ssh_private_key"])' job.json > ~/.ssh/vibecloud_my_app
chmod 600 ~/.ssh/vibecloud_my_app
ssh -i ~/.ssh/vibecloud_my_app root@<ip_address>
```

Image là Ubuntu 24.04 LXC fresh, **không có sẵn `curl` và `ca-certificates`**. Luôn chạy trước khi tải gì:

```bash
ssh -i ~/.ssh/vibecloud_my_app root@<ip_address> \
  'DEBIAN_FRONTEND=noninteractive apt-get update -q && apt-get install -yq curl ca-certificates'
```

#### Database — connect bằng connection string

`result.databases[0]` có `engine`, `host`, `port`, `database`, `username`, `password`, `connection_string`. Connection string sẵn để dùng:

```bash
export DATABASE_URL=$(jq -r '.result.databases[0].connection_string' job.json)
```

Tạo nhiều DB logic trên cùng instance, xem §9.

### 9. Quản lý service

```bash
# List service của bạn
curl "$VIBECLOUD_API_URL/api/services" \
  -H "Authorization: Bearer $VIBECLOUD_API_TOKEN"

# Get một service (kèm credentials)
curl "$VIBECLOUD_API_URL/api/services/<service_id>" \
  -H "Authorization: Bearer $VIBECLOUD_API_TOKEN"

# Stop / start (stop vẫn tính tiền — destroy nếu không dùng nữa)
curl -X POST "$VIBECLOUD_API_URL/api/services/<service_id>/stop"  -H "Authorization: Bearer $VIBECLOUD_API_TOKEN"
curl -X POST "$VIBECLOUD_API_URL/api/services/<service_id>/start" -H "Authorization: Bearer $VIBECLOUD_API_TOKEN"

# Xoá vĩnh viễn (IP được trả về pool sau 3 giờ cooldown để tránh stale ARP)
curl -X DELETE "$VIBECLOUD_API_URL/api/services/<service_id>" \
  -H "Authorization: Bearer $VIBECLOUD_API_TOKEN"
```

LXC riêng:

```bash
# Resize CPU / RAM / disk (disk chỉ tăng được). Body theo LxcResizeRequest:
curl -X POST "$VIBECLOUD_API_URL/api/lxc/<service_id>/resize" \
  -H "Authorization: Bearer $VIBECLOUD_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"cpu":4,"ram_gb":8,"disk_gb":60}'

# Rebuild — xoá rồi tạo lại LXC, GIỮ NGUYÊN ip và credentials. Trả về job.
curl -X POST "$VIBECLOUD_API_URL/api/services/<service_id>/rebuild" \
  -H "Authorization: Bearer $VIBECLOUD_API_TOKEN"
```

Database riêng:

```bash
# Thêm DB logic mới trên cùng instance (cùng VPS, DB tách):
curl -X POST "$VIBECLOUD_API_URL/api/databases/<service_id>/databases" \
  -H "Authorization: Bearer $VIBECLOUD_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"app_name":"another-app"}'

# Đổi password của một DB:
curl -X POST "$VIBECLOUD_API_URL/api/databases/<service_id>/databases/<db_name>/change-password" \
  -H "Authorization: Bearer $VIBECLOUD_API_TOKEN"
```

### 10. Các vấn đề thường gặp

**IP tái sử dụng → SSH báo "REMOTE HOST IDENTIFICATION HAS CHANGED"**
Khi `delete` một LXC và sau đó (sau cooldown 3 giờ) có LXC mới nhận lại IP đó, host key SSH đã đổi. `known_hosts` cũ vẫn còn. Clear:

```bash
ssh-keygen -R <ip_address>
# rồi ssh lại như thường, accept fingerprint mới
```

**SMTP outbound (cổng 25/465/587) bị chặn**
Security group `block-smtp` được attach vào mọi LXC mới để chống abuse. Nếu app cần gửi mail thật, dùng nhà cung cấp HTTP API (SendGrid, Mailgun, Resend, AWS SES).

**Stop vẫn bị tính tiền**
`stop` chỉ tắt container — vẫn giữ disk và IP, nên vẫn bị tính phí giờ. Muốn ngưng tính phí, `DELETE` service.

**Provisioning vs power state**
Service `status=active` nghĩa là VibeCloud đã provision xong. `power_state=running` nghĩa là kernel LXC đang chạy. Sau `stop`, `status` vẫn là `active` nhưng `power_state` thành `stopped`.

### 11. Cách tính phí

- Mỗi service active bị tính phí mỗi giờ. Mỗi tick trừ `hourly_rate_vnd` từ số dư.
- Service stop vẫn tính phí (xem mục trên).
- Service destroy thì không tính phí nữa.
- Khi hết tiền, service bị **suspend** (tắt nguồn), giữ trong grace period (mặc định 7 ngày). Hết grace, service bị destroy tự động và IP được giải phóng.
- LXC resize dùng "Option D": container resize ngay nhưng rate mới chỉ áp dụng từ tick giờ tiếp theo. Giờ đang chạy vẫn tính rate cũ. `pending_hourly_rate_vnd` cho thấy rate sẽ áp.

### 12. Các lỗi thường gặp

| HTTP | Nghĩa | Cách xử lý |
|---|---|---|
| `401` | Thiếu / sai / hết hạn token | Check `Authorization: Bearer ...`, hoặc chạy lại auth script. Token `vc_live_*` bị từ chối ở `/api/me` và payments — cần UI session. |
| `402` | Không đủ tiền cho service yêu cầu | Nhờ người dùng nạp qua `https://vibecloud.vn`. |
| `404` | Không thấy service / job / package, hoặc `package_slug` trỏ tới package inactive/đã xoá | Check lại id / slug. Dùng `GET /api/packages` xem slug còn hiệu lực. |
| `409` | Conflict state (ví dụ xoá LXC đang chạy, resize khi đang provisioning), HOẶC **đã đạt giới hạn quota service** khi `POST /api/lxc` / `POST /api/databases` | Đọc `detail`. Nếu là quota, message có `used/limit` và tier — user phải request tăng quota qua UI. |
| `422` | Validation schema — sai field, sai type, truyền cả `package_slug` lẫn dims cùng lúc | Đọc `detail`, nó trỏ tới field bị lỗi. |

### Giới hạn quota và băng thông

Mỗi account có hạn mức service mặc định:

- **Free tier** (chưa từng nạp tiền) — 2 VPS + 2 database
- **Paid tier** (đã nạp ít nhất 1 lần) — 10 VPS + 10 database

User có thể request tăng giới hạn qua UI; admin duyệt/từ chối, sau đó
hạn mức mới áp dụng ngay cho các lệnh agent kế tiếp. Vượt hạn → 409 ở
trên.

Mỗi VPS NIC bị cap băng thông **200 Mbps** (25 MB/s). Nếu bench `iperf3`
ra ~190–200 Mbps thì đó là cap đã set, không phải throttle.
