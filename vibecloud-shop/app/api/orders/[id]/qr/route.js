import { findOrder } from '../../../../../lib/orders.js';
import { qrPng } from '../../../../../lib/qrcode.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request, { params }) {
  const { id } = await params;
  const order = await findOrder(id);
  if (!order?.qr?.data) return new Response('Không tìm thấy QR', { status: 404 });

  return new Response(qrPng(order.qr.data, { scale: 7, quietZone: 4 }), {
    headers: {
      'content-type': 'image/png',
      'cache-control': 'private, no-store, max-age=0',
      'content-disposition': `inline; filename="vietqr-${order.id}.png"`,
      'x-content-type-options': 'nosniff',
    },
  });
}
