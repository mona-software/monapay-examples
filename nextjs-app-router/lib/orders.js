const orders = globalThis.__monapayOrders || new Map([
  ['DH10234', { id: 'DH10234', amount: 2500000, status: 'pending', transactionCode: null }],
]);
globalThis.__monapayOrders = orders;

export function findOrder(id) {
  return orders.get(id);
}

export function markPaidOnce(id, amount, transactionCode) {
  const order = orders.get(id);
  if (!order) return { ok: false, reason: 'order_not_found' };
  if (order.amount !== amount) return { ok: false, reason: 'amount_mismatch' };
  if (order.transactionCode === transactionCode) return { ok: true, duplicate: true, order };
  if (order.status === 'paid') return { ok: false, reason: 'order_already_paid' };
  order.status = 'paid';
  order.transactionCode = transactionCode;
  return { ok: true, duplicate: false, order };
}
