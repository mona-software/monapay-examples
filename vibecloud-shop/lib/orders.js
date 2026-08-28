import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

let mutationQueue = Promise.resolve();

function storePath() {
  return resolve(process.env.ORDER_STORE_PATH || 'data/orders.json');
}

function emptyStore() {
  return { version: 1, orders: [], transactions: [] };
}

async function readStore() {
  try {
    const parsed = JSON.parse(await readFile(storePath(), 'utf8'));
    if (!Array.isArray(parsed.orders) || !Array.isArray(parsed.transactions)) {
      throw new Error('Order store không đúng cấu trúc');
    }
    return parsed;
  } catch (error) {
    if (error.code === 'ENOENT') return emptyStore();
    throw error;
  }
}

async function writeStore(store) {
  const target = storePath();
  await mkdir(dirname(target), { recursive: true });
  const temporary = `${target}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(store, null, 2)}\n`, { mode: 0o600 });
  await rename(temporary, target);
}

function mutate(operation) {
  const result = mutationQueue.then(operation, operation);
  mutationQueue = result.then(() => undefined, () => undefined);
  return result;
}

export function createOrderDraft(product, quantity) {
  const suffix = randomUUID().replaceAll('-', '').slice(0, 5).toUpperCase();
  const time = Date.now().toString(36).toUpperCase();
  return {
    id: `DH${time}${suffix}`,
    product: {
      slug: product.slug,
      sku: product.sku,
      name: product.name,
      unitPrice: product.price,
    },
    quantity,
    amount: product.price * quantity,
    status: 'pending',
    createdAt: new Date().toISOString(),
    paidAt: null,
    transactionCode: null,
    qr: null,
  };
}

export async function saveOrder(order, qr) {
  return mutate(async () => {
    const store = await readStore();
    if (store.orders.some((candidate) => candidate.id === order.id)) {
      throw new Error('Mã đơn đã tồn tại');
    }
    const saved = { ...order, qr };
    store.orders.push(saved);
    await writeStore(store);
    return saved;
  });
}

export async function findOrder(id) {
  const store = await readStore();
  return store.orders.find((order) => order.id === id) || null;
}

function identifyOrder(orders, payload) {
  const accountNumber = String(payload.account_number || '').trim();
  if (accountNumber) {
    const byAccount = orders.find((order) => order.qr?.virtualAccountNumber === accountNumber);
    if (byAccount) return byAccount;
  }
  const explicitId = String(payload.order_id || '').trim().toUpperCase();
  if (explicitId) {
    const byId = orders.find((order) => order.id.toUpperCase() === explicitId);
    if (byId) return byId;
  }
  const description = String(payload.description || '').toUpperCase();
  return orders.find((order) => description.includes(order.id.toUpperCase())) || null;
}

export function validateWebhookPayload(payload) {
  if (!payload || typeof payload !== 'object') return 'invalid_payload';
  if (!Number.isSafeInteger(payload.amount) || payload.amount < 0) return 'invalid_amount';
  if (!String(payload.transaction_code || '').trim()) return 'missing_transaction_code';
  if (payload.type !== 'income') return 'unsupported_transaction_type';
  return null;
}

export function isMonaPayTestPayload(payload) {
  return payload?.transaction_code === 'DUMMY123'
    && payload?.description === 'DUMMY TRANSACTION MONAPAY';
}

export async function markPaidFromWebhook(payload) {
  const validationError = validateWebhookPayload(payload);
  if (validationError) return { ok: false, reason: validationError };

  return mutate(async () => {
    const store = await readStore();
    const transactionCode = String(payload.transaction_code).trim();
    const existing = store.transactions.find((item) => item.transactionCode === transactionCode);
    if (existing) {
      if (existing.amount !== payload.amount) {
        return { ok: false, reason: 'transaction_conflict', orderId: existing.orderId };
      }
      return { ok: true, duplicate: true, orderId: existing.orderId };
    }

    const order = identifyOrder(store.orders, payload);
    if (!order) return { ok: false, reason: 'order_not_found' };
    if (order.amount !== payload.amount) return { ok: false, reason: 'amount_mismatch', orderId: order.id };
    if (order.status === 'paid') return { ok: false, reason: 'order_already_paid', orderId: order.id };

    order.status = 'paid';
    order.paidAt = new Date().toISOString();
    order.transactionCode = transactionCode;
    store.transactions.push({
      transactionCode,
      orderId: order.id,
      amount: payload.amount,
      receivedAt: order.paidAt,
    });
    await writeStore(store);
    return { ok: true, duplicate: false, orderId: order.id };
  });
}

export function publicOrder(order) {
  if (!order) return null;
  return {
    id: order.id,
    product: order.product,
    quantity: order.quantity,
    amount: order.amount,
    status: order.status,
    createdAt: order.createdAt,
    paidAt: order.paidAt,
    transactionCode: order.transactionCode,
    beneficiaryName: order.qr?.beneficiaryName || null,
    virtualAccountNumber: order.qr?.virtualAccountNumber || null,
  };
}
