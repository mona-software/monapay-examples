# VibeCloud prepaid top-up with MONA Pay

A Python example for a pay-as-you-go platform: it creates a prepaid top-up VietQR for each user, receives the MONA Pay webhook and credits the user's wallet exactly once. Charging the credit by the hour stays in the platform's own billing system and is not part of this example.

## Components

| Part | Responsibility |
| --- | --- |
| Platform (VibeCloud) | Chooses `user_id` and the top-up amount, runs `topup_qr.py`, later deducts credit by the hour |
| MONA Pay | Creates the VietQR, receives the bank transaction and sends the HMAC-signed webhook |
| `webhook_server.py` | Verifies signature and timestamp, matches the top-up, deduplicates by `transaction_code`, calls `credit_wallet` |
| SQLite demo | Holds top-up intents, balances and an idempotent credit ledger; replace it with your internal wallet/ledger |

## Run

```bash
export MONAPAY_CLIENT_ID="client-id"
export MONAPAY_CLIENT_SECRET="client-secret"
export MONAPAY_BASE_URL="https://api.monapay.vn"
export MONAPAY_WEBHOOK_SECRET="your-own-hmac-secret"
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

Both scripts share the SQLite file set by `VIBECLOUD_BILLING_DB` (default `vibecloud_billing.sqlite3`).

Register a public HTTPS URL such as `https://billing.example/webhooks/monapay` in your MONA Pay webhook config.

## How it works

- `topup_qr.py` generates a description `VCLOUD_<16 hex characters>`, stores it with `user_id` and amount as a top-up intent, then requests a QR with an idempotency key. If the request fails, the intent is deleted.
- `webhook_server.py` (`POST /webhooks/monapay`) credits the wallet only when the webhook carries that description and the same amount. It returns 404 for an unknown description, 409 for an amount mismatch, and `{"ok": true, "duplicate": true}` for a repeated `transaction_code`.

## Equivalent cURL

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

Do not send hand-made cURL requests to the webhook unless they are signed over the exact raw body. MONA Pay sends `X-Mona-Timestamp` and `X-Mona-Signature: sha256=<hex>`; the server accepts a timestamp at most 300 seconds off.

Documentation: https://monapay.vn/docs

**MONA Pay is part of MONA Cloud by The MONA Group.**
