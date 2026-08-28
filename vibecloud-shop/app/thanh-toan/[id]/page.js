import React from 'react';
import { notFound } from 'next/navigation';
import { findOrder, publicOrder } from '../../../lib/orders.js';
import { formatVnd } from '../../../lib/products.js';
import { Footer, Header } from '../../ui.js';
import PaymentStatus from './payment-status.js';

const h = React.createElement;

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Thanh toán đơn hàng' };

export default async function PaymentPage({ params }) {
  const { id } = await params;
  const storedOrder = await findOrder(id);
  if (!storedOrder) notFound();
  const order = publicOrder(storedOrder);

  return h(React.Fragment, null,
    h(Header),
    h('main', { className: 'payment-page' },
      h('div', { className: 'payment-heading' },
        h('p', { className: 'edition-label' }, `ĐƠN ${order.id}`),
        h('h1', null, order.status === 'paid' ? 'Đã nhận thanh toán.' : 'Quét mã. Phần còn lại để shop lo.'),
        h('p', null, 'Trang tự kiểm tra trạng thái đơn; anh chị không cần gửi ảnh chụp giao dịch.'),
      ),
      h('section', { className: 'payment-layout' },
        h('div', { className: 'qr-panel' },
          h('div', { className: 'qr-frame' },
            h('img', {
              src: `/api/orders/${encodeURIComponent(order.id)}/qr`,
              width: '360',
              height: '360',
              alt: `Mã VietQR thanh toán đơn ${order.id}`,
            }),
          ),
          h('div', { className: 'qr-caption' },
            h('span', null, 'SỐ TIỀN'),
            h('strong', null, formatVnd(order.amount)),
          ),
          h(PaymentStatus, { initialOrder: order }),
        ),
        h('aside', { className: 'order-receipt' },
          h('div', { className: 'receipt-top' },
            h('span', null, 'BẾP GỌN / PHIẾU THANH TOÁN'),
            h('b', null, order.id),
          ),
          h('dl', null,
            h('div', null, h('dt', null, 'Sản phẩm'), h('dd', null, order.product.name)),
            h('div', null, h('dt', null, 'Số lượng'), h('dd', null, String(order.quantity))),
            h('div', null, h('dt', null, 'Tài khoản nhận'), h('dd', null, order.virtualAccountNumber || 'Có trong VietQR')),
            h('div', null, h('dt', null, 'Người hưởng'), h('dd', null, order.beneficiaryName || 'Hiển thị trong app ngân hàng')),
            h('div', { className: 'receipt-total' }, h('dt', null, 'Tổng cộng'), h('dd', null, formatVnd(order.amount))),
          ),
          h('ol', { className: 'scan-help' },
            h('li', null, h('b', null, '01'), h('p', null, 'Mở ứng dụng ngân hàng và chọn quét QR.')),
            h('li', null, h('b', null, '02'), h('p', null, 'Kiểm tra đúng số tiền rồi xác nhận chuyển.')),
            h('li', null, h('b', null, '03'), h('p', null, 'Giữ trang này mở để nhận kết quả tự động.')),
          ),
          h('p', { className: 'receipt-security' }, 'VietQR động bởi MONA Pay · Webhook xác thực HMAC-SHA256'),
        ),
      ),
    ),
    h(Footer),
  );
}
