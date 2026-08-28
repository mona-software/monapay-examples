import express from 'express';
import { MonaPay, verifyWebhook } from '@monapay/node';

const app = express();
const orders = new Map([
  ['DH10234', { id: 'DH10234', amount: 2500000, status: 'pending', transactionCode: null }],
]);
const monapay = new MonaPay({
  username: process.env.MONAPAY_USERNAME,
  password: process.env.MONAPAY_PASSWORD,
  clientSecret: process.env.MONAPAY_CLIENT_SECRET,
});

app.post('/webhooks/monapay', express.raw({ type: 'application/json', limit: '1mb' }), (request, response) => {
  const verified = verifyWebhook({
    rawBody: request.body,
    headers: request.headers,
    secret: process.env.MONAPAY_WEBHOOK_SECRET,
  });
  if (!verified.ok) return response.status(401).json({ ok: false, reason: verified.reason });

  const payload = verified.payload;
  const orderId = payload.order_id || String(payload.description || '').match(/\bDH\d+\b/i)?.[0];
  const order = orders.get(orderId);
  if (!order) return response.status(404).json({ ok: false, reason: 'order_not_found' });
  if (order.amount !== payload.amount) return response.status(409).json({ ok: false, reason: 'amount_mismatch' });
  if (order.transactionCode === payload.transaction_code) return response.json({ ok: true, duplicate: true });
  if (order.status === 'paid') return response.status(409).json({ ok: false, reason: 'order_already_paid' });
  order.status = 'paid';
  order.transactionCode = payload.transaction_code;
  return response.json({ ok: true, duplicate: false });
});

app.use(express.json());

app.post('/orders/:id/qr', async (request, response, next) => {
  try {
    const order = orders.get(request.params.id);
    if (!order) return response.status(404).json({ error: 'Không tìm thấy đơn' });
    const qr = await monapay.qr.generate({
      ownerNumber: process.env.MONAPAY_OWNER_NUMBER,
      ownerType: process.env.MONAPAY_OWNER_TYPE || 'ORG',
      merchantId: process.env.MONAPAY_MERCHANT_ID,
      terminalId: process.env.MONAPAY_TERMINAL_ID,
      orderId: order.id,
      virtualAccountPrefix: process.env.MONAPAY_VA_PREFIX,
      beneficiaryName: process.env.MONAPAY_BENEFICIARY_NAME,
      amount: order.amount,
      description: `Thanh toan ${order.id}`,
    });
    return response.json({ order, qr });
  } catch (error) {
    return next(error);
  }
});

app.use((error, _request, response, _next) => {
  response.status(error.status || 500).json({ error: error.message });
});

app.listen(Number(process.env.PORT || 3000), () => {
  console.log(`Express đang nghe tại http://localhost:${process.env.PORT || 3000}`);
});
