import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, test } from 'node:test';

import {
  createOrderDraft,
  findOrder,
  isMonaPayTestPayload,
  markPaidFromWebhook,
  saveOrder,
  validateWebhookPayload,
} from '../lib/orders.js';
import { products } from '../lib/products.js';

let testDirectory;

beforeEach(async () => {
  testDirectory = await mkdtemp(join(tmpdir(), 'monapay-vibecloud-shop-'));
  process.env.ORDER_STORE_PATH = join(testDirectory, 'orders.json');
});

afterEach(async () => {
  delete process.env.ORDER_STORE_PATH;
  await rm(testDirectory, { recursive: true, force: true });
});

async function pendingOrder() {
  const draft = createOrderDraft(products[0], 2);
  return saveOrder(draft, {
    id: 'qr-1',
    data: '000201010212',
    virtualAccountNumber: 'MONA0000012345',
    beneficiaryName: 'CONG TY ABC',
  });
}

test('webhook đánh dấu đơn paid và transaction_code chỉ được xử lý một lần', async () => {
  const order = await pendingOrder();
  const payload = {
    amount: order.amount,
    description: `Thanh toan ${order.id}`,
    transfer_date: '2026-08-29 10:30:00',
    transaction_code: 'FT26241000001',
    account_number: 'MONA0000012345',
    bank_name: 'ACB',
    type: 'income',
  };

  assert.deepEqual(await markPaidFromWebhook(payload), {
    ok: true,
    duplicate: false,
    orderId: order.id,
  });
  assert.deepEqual(await markPaidFromWebhook(payload), {
    ok: true,
    duplicate: true,
    orderId: order.id,
  });

  assert.deepEqual(await markPaidFromWebhook({ ...payload, amount: order.amount + 1 }), {
    ok: false,
    reason: 'transaction_conflict',
    orderId: order.id,
  });

  const saved = await findOrder(order.id);
  assert.equal(saved.status, 'paid');
  assert.equal(saved.transactionCode, 'FT26241000001');
  assert.ok(saved.paidAt);
});

test('webhook sai số tiền bị từ chối và không đổi trạng thái đơn', async () => {
  const order = await pendingOrder();
  const result = await markPaidFromWebhook({
    amount: order.amount - 1000,
    description: `Thanh toan ${order.id}`,
    transaction_code: 'FT-BAD-AMOUNT',
    account_number: 'MONA0000012345',
    type: 'income',
  });

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'amount_mismatch');
  assert.equal((await findOrder(order.id)).status, 'pending');
});

test('khớp đơn theo mô tả khi payload không có số VA', async () => {
  const order = await pendingOrder();
  const result = await markPaidFromWebhook({
    amount: order.amount,
    description: `THANH TOAN ${order.id} TU APP`,
    transaction_code: 'FT-DESCRIPTION',
    account_number: '',
    type: 'income',
  });
  assert.equal(result.ok, true);
  assert.equal(result.orderId, order.id);
});

test('validate payload bắt buộc amount nguyên, transaction_code và type income', () => {
  assert.equal(validateWebhookPayload(null), 'invalid_payload');
  assert.equal(validateWebhookPayload({ amount: 1.5, transaction_code: 'FT1', type: 'income' }), 'invalid_amount');
  assert.equal(validateWebhookPayload({ amount: 1, transaction_code: '', type: 'income' }), 'missing_transaction_code');
  assert.equal(validateWebhookPayload({ amount: 1, transaction_code: 'FT1', type: 'outcome' }), 'unsupported_transaction_type');
  assert.equal(validateWebhookPayload({ amount: 1, transaction_code: 'FT1', type: 'income' }), null);
});

test('nhận diện đúng payload dummy chính thức để webhook test trả 200 mà không sửa đơn', () => {
  assert.equal(isMonaPayTestPayload({
    transaction_code: 'DUMMY123',
    description: 'DUMMY TRANSACTION MONAPAY',
  }), true);
  assert.equal(isMonaPayTestPayload({
    transaction_code: 'DUMMY123',
    description: 'Thanh toan DH123',
  }), false);
});
