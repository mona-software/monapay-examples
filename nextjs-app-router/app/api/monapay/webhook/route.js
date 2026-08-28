import { verifyWebhook } from '@monapay/node';

import { markPaidOnce } from '../../../../lib/orders.js';

function orderIdFrom(payload) {
  const match = String(payload.description || '').match(/\bDH\d+\b/i);
  return payload.order_id || match?.[0];
}

export async function POST(request) {
  const rawBody = new Uint8Array(await request.arrayBuffer());
  const verified = verifyWebhook({
    rawBody,
    headers: request.headers,
    secret: process.env.MONAPAY_WEBHOOK_SECRET,
  });
  if (!verified.ok) return Response.json({ ok: false, reason: verified.reason }, { status: 401 });

  const payload = verified.payload;
  const result = markPaidOnce(orderIdFrom(payload), payload.amount, payload.transaction_code);
  if (!result.ok) return Response.json(result, { status: result.reason === 'order_not_found' ? 404 : 409 });
  return Response.json({ ok: true, duplicate: result.duplicate });
}

export const runtime = 'nodejs';
