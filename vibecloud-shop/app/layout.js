import React from 'react';
import './styles.css';

const h = React.createElement;

export const metadata = {
  title: {
    default: 'Bếp Gọn — Đồ dùng vừa vặn cho bếp Việt',
    template: '%s — Bếp Gọn',
  },
  description: 'Shop mẫu Next.js nhận thanh toán VietQR động qua MONA Pay, sẵn sàng triển khai trên VibeCloud.',
};

export default function RootLayout({ children }) {
  return h('html', { lang: 'vi' },
    h('body', null, children),
  );
}
