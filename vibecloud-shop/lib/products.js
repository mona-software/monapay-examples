export const products = Object.freeze([
  Object.freeze({
    slug: 'bo-pha-ca-phe-viet-01',
    sku: 'BEP-CP01',
    name: 'Bộ pha cà phê Việt 01',
    eyebrow: 'Pha chậm, sáng nhanh',
    price: 890000,
    description: 'Một bộ pha gọn cho bàn bếp Việt: phin thép, bình giữ nhiệt và hai ly men nung ở Bát Tràng.',
    features: ['Phin thép 304', 'Bình 600 ml', '2 ly men thủ công'],
    tone: 'orange',
  }),
  Object.freeze({
    slug: 'hop-gia-vi-bep-gon',
    sku: 'BEP-GV02',
    name: 'Hộp gia vị Bếp Gọn',
    eyebrow: 'Sáu vị, một hàng',
    price: 540000,
    description: 'Khay thép sơn tĩnh điện cùng sáu hũ thủy tinh có nhãn tiếng Việt, vừa kệ bếp sâu 12 cm.',
    features: ['6 hũ 180 ml', 'Nhãn chống nước', 'Khay rộng 36 cm'],
    tone: 'yellow',
  }),
  Object.freeze({
    slug: 'khay-sang-cuoi-tuan',
    sku: 'BEP-KS03',
    name: 'Khay sáng cuối tuần',
    eyebrow: 'Đủ chỗ cho hai người',
    price: 690000,
    description: 'Khay gỗ cao su ghép mộng, tay cầm thấp và bề mặt phủ dầu an toàn cho thực phẩm.',
    features: ['Gỗ Việt Nam', '42 × 28 cm', 'Bảo hành 12 tháng'],
    tone: 'blue',
  }),
]);

export function findProduct(slug) {
  return products.find((product) => product.slug === slug);
}

export function formatVnd(amount) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}
