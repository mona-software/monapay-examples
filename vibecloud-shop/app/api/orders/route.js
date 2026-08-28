import { createPaymentQr } from '../../../lib/monapay.js';
import { createOrderDraft, publicOrder, saveOrder } from '../../../lib/orders.js';
import { findProduct } from '../../../lib/products.js';

export const runtime = 'nodejs';

function json(body, status = 200) {
  return Response.json(body, { status, headers: { 'cache-control': 'no-store' } });
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ message: 'Body phải là JSON hợp lệ.' }, 400);
  }

  const product = findProduct(String(body.productSlug || ''));
  const quantity = Number(body.quantity);
  if (!product) return json({ message: 'Không tìm thấy sản phẩm.' }, 404);
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 5) {
    return json({ message: 'Số lượng phải là số nguyên từ 1 đến 5.' }, 422);
  }

  const order = createOrderDraft(product, quantity);
  if (order.amount > 1_000_000_000) return json({ message: 'Đơn vượt giới hạn VietQR.' }, 422);

  try {
    const qr = await createPaymentQr(order);
    const saved = await saveOrder(order, qr);
    return json({ order: publicOrder(saved) }, 201);
  } catch (error) {
    console.error('Không thể tạo đơn MONA Pay', { message: error.message, status: error.status });
    return json({ message: 'Chưa thể tạo VietQR. Vui lòng kiểm tra cấu hình MONA Pay hoặc thử lại.' }, 502);
  }
}
