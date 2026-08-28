'use client';

import React, { useState } from 'react';

const h = React.createElement;

function money(amount) {
  return new Intl.NumberFormat('vi-VN').format(amount) + '₫';
}

export default function BuyPanel({ product }) {
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function createOrder() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ productSlug: product.slug, quantity }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Chưa thể tạo đơn');
      window.location.assign(`/thanh-toan/${result.order.id}`);
    } catch (requestError) {
      setError(requestError.message || 'Có lỗi xảy ra, vui lòng thử lại.');
      setLoading(false);
    }
  }

  return h('div', { className: 'buy-panel' },
    h('div', { className: 'quantity-control' },
      h('span', null, 'Số lượng'),
      h('div', null,
        h('button', {
          type: 'button',
          onClick: () => setQuantity((value) => Math.max(1, value - 1)),
          disabled: loading || quantity <= 1,
          'aria-label': 'Giảm số lượng',
        }, '−'),
        h('output', { 'aria-live': 'polite' }, String(quantity)),
        h('button', {
          type: 'button',
          onClick: () => setQuantity((value) => Math.min(5, value + 1)),
          disabled: loading || quantity >= 5,
          'aria-label': 'Tăng số lượng',
        }, '+'),
      ),
    ),
    h('button', { type: 'button', className: 'button button-buy', onClick: createOrder, disabled: loading },
      h('span', null, loading ? 'Đang tạo VietQR…' : 'Mua và nhận VietQR'),
      h('strong', null, money(product.price * quantity)),
    ),
    error ? h('p', { className: 'form-error', role: 'alert' }, error) : null,
    h('p', { className: 'buy-note' }, 'Thanh toán chuyển khoản trực tiếp vào tài khoản của cửa hàng. MONA Pay không giữ tiền.'),
  );
}
