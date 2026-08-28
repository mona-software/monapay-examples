import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';

import { verifyWebhook } from '../../../sdk/node/dist/index.js';

function signature(rawBody, timestamp, secret) {
  return `sha256=${createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex')}`;
}

test('SDK xác thực raw body HMAC-SHA256 hợp lệ', () => {
  const secret = 'webhook-secret-test-at-least-32-chars';
  const timestamp = Math.floor(Date.now() / 1000);
  const rawBody = JSON.stringify({
    amount: 890000,
    description: 'Thanh toan DHABC123',
    transfer_date: '2026-08-29 10:30:00',
    transaction_code: 'FT26241000002',
    account_number: 'MONA0000012345',
    bank_name: 'ACB',
    type: 'income',
  });
  const result = verifyWebhook({
    rawBody,
    secret,
    headers: {
      'x-mona-timestamp': String(timestamp),
      'x-mona-signature': signature(rawBody, timestamp, secret),
    },
  });
  assert.equal(result.ok, true);
  assert.equal(result.payload.transaction_code, 'FT26241000002');
});

test('SDK từ chối timestamp quá 300 giây dù chữ ký đúng', () => {
  const secret = 'webhook-secret-test-at-least-32-chars';
  const timestamp = Math.floor(Date.now() / 1000) - 301;
  const rawBody = '{}';
  const result = verifyWebhook({
    rawBody,
    secret,
    headers: {
      'x-mona-timestamp': String(timestamp),
      'x-mona-signature': signature(rawBody, timestamp, secret),
    },
  });
  assert.deepEqual(result, { ok: false, reason: 'timestamp_out_of_tolerance' });
});
