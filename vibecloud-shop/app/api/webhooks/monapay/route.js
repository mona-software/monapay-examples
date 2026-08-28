import { verifyWebhook } from '@monapay/node';
import { isMonaPayTestPayload, markPaidFromWebhook } from '../../../../lib/orders.js';

export const runtime = 'nodejs';

export async function POST(request) {
  const secret = process.env.MONAPAY_WEBHOOK_SECRET;
  if (!secret) {
    console.error('Thiếu MONAPAY_WEBHOOK_SECRET');
    return Response.json({ ok: false, reason: 'server_not_configured' }, { status: 500 });
  }

  const rawBody = new Uint8Array(await request.arrayBuffer());
  const verified = verifyWebhook({ rawBody, headers: request.headers, secret, toleranceSec: 300 });
  if (!verified.ok) {
    return Response.json({ ok: false, reason: verified.reason }, { status: 401 });
  }

  if (isMonaPayTestPayload(verified.payload)) {
    return Response.json({ ok: true, test: true }, { status: 200 });
  }

  const result = await markPaidFromWebhook(verified.payload);
  if (!result.ok) {
    const status = result.reason === 'order_not_found' ? 404 : 409;
    return Response.json(result, { status });
  }
  return Response.json(result, { status: 200 });
}
