'use client';

import React, { useEffect, useState } from 'react';

const h = React.createElement;

export default function PaymentStatus({ initialOrder }) {
  const [order, setOrder] = useState(initialOrder);
  const [connectionError, setConnectionError] = useState(false);

  useEffect(() => {
    if (order.status === 'paid') return undefined;
    let active = true;

    async function poll() {
      try {
        const response = await fetch(`/api/orders/${encodeURIComponent(initialOrder.id)}`, { cache: 'no-store' });
        if (!response.ok) throw new Error('poll_failed');
        const result = await response.json();
        if (active) {
          setOrder(result.order);
          setConnectionError(false);
        }
      } catch {
        if (active) setConnectionError(true);
      }
    }

    poll();
    const timer = window.setInterval(poll, 2500);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [initialOrder.id, order.status]);

  if (order.status === 'paid') {
    return h('div', { className: 'payment-state payment-state-paid', role: 'status' },
      h('span', { className: 'state-dot', 'aria-hidden': 'true' }, '✓'),
      h('div', null,
        h('strong', null, 'Thanh toán thành công'),
        h('p', null, order.transactionCode ? `Mã giao dịch ${order.transactionCode}` : 'MONA Pay đã xác nhận tiền vào.'),
      ),
    );
  }

  return h('div', { className: 'payment-state', role: 'status' },
    h('span', { className: 'state-pulse', 'aria-hidden': 'true' }),
    h('div', null,
      h('strong', null, connectionError ? 'Đang nối lại…' : 'Đang chờ thanh toán'),
      h('p', null, connectionError ? 'Đơn vẫn an toàn; trang sẽ tự thử lại.' : 'Cập nhật tự động mỗi 2,5 giây.'),
    ),
  );
}
