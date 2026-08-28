import { findOrder, publicOrder } from '../../../../lib/orders.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request, { params }) {
  const { id } = await params;
  const order = await findOrder(id);
  if (!order) return Response.json({ message: 'Không tìm thấy đơn.' }, { status: 404 });
  return Response.json({ order: publicOrder(order) }, {
    headers: { 'cache-control': 'no-store, max-age=0' },
  });
}
