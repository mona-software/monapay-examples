import React from 'react';
import { formatVnd } from '../lib/products.js';

const h = React.createElement;

export function Header() {
  return h('header', { className: 'site-header' },
    h('a', { className: 'brand', href: '/', 'aria-label': 'Bếp Gọn — trang chủ' },
      h('span', { className: 'brand-mark', 'aria-hidden': 'true' }, 'BG'),
      h('span', null, 'BẾP GỌN'),
    ),
    h('nav', { className: 'site-nav', 'aria-label': 'Điều hướng chính' },
      h('a', { href: '/#san-pham' }, 'Sản phẩm'),
      h('a', { href: '/#cach-mua' }, 'Cách mua'),
    ),
  );
}

export function Footer() {
  return h('footer', { className: 'site-footer' },
    h('div', null,
      h('span', { className: 'footer-kicker' }, 'BẾP GỌN / SHOP TEMPLATE 01'),
      h('p', null, 'Một storefront mẫu có thu tiền thật, dựng bằng Next.js và MONA Pay.'),
    ),
    h('div', { className: 'footer-links' },
      h('a', { href: 'https://monapay.vn/docs' }, 'Tài liệu MONA Pay'),
      h('a', { href: 'mailto:info@themona.global' }, 'info@themona.global'),
      h('a', { href: 'tel:1900636648' }, '1900 636 648'),
    ),
  );
}

export function ProductArt({ tone = 'orange', compact = false }) {
  const className = `product-art tone-${tone}${compact ? ' product-art-compact' : ''}`;
  return h('div', { className, 'aria-hidden': 'true' },
    h('svg', { viewBox: '0 0 520 420', role: 'presentation' },
      h('path', { d: 'M55 325H470', className: 'art-line' }),
      h('path', { d: 'M128 273c0-52 42-94 94-94h96c52 0 94 42 94 94v52H128z', className: 'art-main' }),
      h('path', { d: 'M191 179V99h158v80', className: 'art-top' }),
      h('path', { d: 'M216 99V66h108v33', className: 'art-detail' }),
      h('circle', { cx: '270', cy: '251', r: '26', className: 'art-knob' }),
      h('path', { d: 'M156 324v34m228-34v34', className: 'art-feet' }),
      h('path', { d: 'M105 145h70m-35-35v70', className: 'art-spark' }),
      h('text', { x: '270', y: '307', textAnchor: 'middle', className: 'art-label' }, 'BẾP GỌN'),
    ),
    h('span', { className: 'art-stamp' }, 'MADE FOR\nVIỆT HOME'),
  );
}

export function ProductCard({ product, index }) {
  return h('article', { className: `product-card product-card-${index + 1}` },
    h('a', { href: `/san-pham/${product.slug}`, className: 'product-visual-link', 'aria-label': `Xem ${product.name}` },
      h(ProductArt, { tone: product.tone, compact: true }),
    ),
    h('div', { className: 'product-card-copy' },
      h('span', { className: 'index-label' }, String(index + 1).padStart(2, '0')),
      h('p', { className: 'eyebrow' }, product.eyebrow),
      h('h3', null, h('a', { href: `/san-pham/${product.slug}` }, product.name)),
      h('div', { className: 'product-card-meta' },
        h('strong', null, formatVnd(product.price)),
        h('a', { href: `/san-pham/${product.slug}`, className: 'arrow-link', 'aria-label': `Mua ${product.name}` }, 'Xem →'),
      ),
    ),
  );
}
