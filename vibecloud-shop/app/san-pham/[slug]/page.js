import React from 'react';
import { notFound } from 'next/navigation';
import { findProduct, formatVnd } from '../../../lib/products.js';
import { Footer, Header, ProductArt } from '../../ui.js';
import BuyPanel from './buy-panel.js';

const h = React.createElement;

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const product = findProduct(slug);
  return product ? { title: product.name, description: product.description } : {};
}

export default async function ProductPage({ params }) {
  const { slug } = await params;
  const product = findProduct(slug);
  if (!product) notFound();

  return h(React.Fragment, null,
    h(Header),
    h('main', { className: 'product-page' },
      h('a', { href: '/#san-pham', className: 'back-link' }, '← Trở lại danh mục'),
      h('section', { className: 'product-detail' },
        h('div', { className: 'product-detail-visual' }, h(ProductArt, { tone: product.tone })),
        h('div', { className: 'product-detail-copy' },
          h('p', { className: 'edition-label' }, `${product.sku} / ${product.eyebrow}`),
          h('h1', null, product.name),
          h('p', { className: 'detail-price' }, formatVnd(product.price)),
          h('p', { className: 'detail-description' }, product.description),
          h('ul', { className: 'feature-list' },
            ...product.features.map((feature, index) => h('li', { key: feature },
              h('span', null, String(index + 1).padStart(2, '0')),
              feature,
            )),
          ),
          h(BuyPanel, { product: { slug: product.slug, name: product.name, price: product.price } }),
        ),
      ),
    ),
    h(Footer),
  );
}
