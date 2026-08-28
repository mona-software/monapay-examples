import { monapay, qrBody } from '../../../../../lib/monapay.js';
import { findOrder } from '../../../../../lib/orders.js';

export async function POST(_request, { params }) {
  const { id } = await params;
  const order = findOrder(id);
  if (!order) return Response.json({ error: 'Không tìm thấy đơn' }, { status: 404 });
  const qr = await monapay.qr.generate(qrBody(order));
  return Response.json({ order, qr });
}
