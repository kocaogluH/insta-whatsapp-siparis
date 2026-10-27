const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.store.findUnique({ where: { slug: 'butikmoda' } });
  if (existing) {
    console.log('Seed data already exists for butikmoda');
    return;
  }

  const store = await prisma.store.create({
    data: {
      slug: 'butikmoda',
      name: 'Nişantaşı Butik & Atölye',
      description: 'Yeni sezon kadın giyim & aksesuar. Hem mağazamızdan gel-al hem Türkiye geneli hızlı kargo!',
      whatsappPhone: '905551234567',
      instagramHandle: 'nisantasibutik.demo',
      shippingFee: 59.90,
      freeShippingThreshold: 1000.0,
      address: 'Teşvikiye Mah. Valikonağı Cad. No:42 Şişli/İstanbul',
      allowStorePickup: true,
      ibanInfo: 'TR12 0006 2000 0000 0123 4567 89 (Nişantaşı Butik Tekstil)',
    },
  });

  const p1 = await prisma.product.create({
    data: {
      storeId: store.id,
      name: 'Oversize Keten Gölek - Doğal Dokulu',
      description: '%100 pamuk-keten karışımlı nefes alan kumaş. Yaz ve bahar ayları için ideal.',
      price: 649.90,
      compareAtPrice: 850.00,
      imageUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=800&q=80',
      category: 'Üst Giyim',
      sku: 'KTN-GML-001',
      barcode: '8690001001014',
      stock: 16,
      isActive: true,
      hideWhenOutOfStock: false,
      instagramPostUrl: 'https://instagram.com/p/demo1',
      variants: {
        create: [
          { name: 'S / Ekru', sku: 'KTN-GML-001-S-EKR', barcode: '8690001001021', priceDiff: 0, stock: 5 },
          { name: 'M / Ekru', sku: 'KTN-GML-001-M-EKR', barcode: '8690001001038', priceDiff: 0, stock: 7 },
          { name: 'L / Zeytin Yeşili', sku: 'KTN-GML-001-L-ZYT', barcode: '8690001001045', priceDiff: 0, stock: 4 },
        ],
      },
    },
  });

  const p2 = await prisma.product.create({
    data: {
      storeId: store.id,
      name: 'El Yapımı Deri Omuz Çantası',
      description: 'Hakiki yumuşak deri, ayarlanabilir askılı ve mıknatıs kapamalı günlük çanta.',
      price: 1290.00,
      compareAtPrice: 1590.00,
      imageUrl: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=80',
      category: 'Çanta & Aksesuar',
      sku: 'CNT-DR-042',
      barcode: '8690001002011',
      stock: 6,
      isActive: true,
      hideWhenOutOfStock: false,
      instagramPostUrl: 'https://instagram.com/p/demo2',
      variants: {
        create: [
          { name: 'Taba', sku: 'CNT-DR-042-TB', barcode: '8690001002028', priceDiff: 0, stock: 4 },
          { name: 'Siyah', sku: 'CNT-DR-042-SYH', barcode: '8690001002035', priceDiff: 0, stock: 2 },
        ],
      },
    },
  });

  const p3 = await prisma.product.create({
    data: {
      storeId: store.id,
      name: 'Yüksek Bel Palazzo Pantolon',
      description: 'Akışkan krep kumaş, tam kalıp yüksek bel kesim.',
      price: 780.00,
      compareAtPrice: null,
      imageUrl: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=800&q=80',
      category: 'Alt Giyim',
      sku: 'PLT-PLZ-019',
      barcode: '8690001003018',
      stock: 9,
      isActive: true,
      hideWhenOutOfStock: true,
      variants: {
        create: [
          { name: '36 Beden / Bej', sku: 'PLT-PLZ-019-36', barcode: '8690001003025', priceDiff: 0, stock: 3 },
          { name: '38 Beden / Bej', sku: 'PLT-PLZ-019-38', barcode: '8690001003032', priceDiff: 0, stock: 6 },
          { name: '40 Beden / Siyah (Tükendi)', sku: 'PLT-PLZ-019-40', barcode: '8690001003049', priceDiff: 0, stock: 0 },
        ],
      },
    },
  });

  await prisma.order.create({
    data: {
      orderNumber: 'SIP-1001',
      storeId: store.id,
      customerName: 'Zeynep Kaya',
      customerPhone: '0532 987 65 43',
      customerAddress: 'Caferağa Mah. Moda Cad. No:18 Kadıköy/İstanbul',
      deliveryType: 'SHIPPING',
      paymentMethod: 'IBAN_TRANSFER',
      channel: 'WHATSAPP',
      subtotal: 1299.80,
      shippingCost: 0,
      totalAmount: 1299.80,
      status: 'NEW',
      note: 'Hediye paketi yapılabilirse çok sevinirim.',
      items: {
        create: [
          {
            productId: p1.id,
            productName: p1.name,
            variantName: 'M / Ekru',
            sku: 'KTN-GML-001-M-EKR',
            barcode: '8690001001038',
            quantity: 2,
            unitPrice: 649.90,
          },
        ],
      },
    },
  });

  await prisma.order.create({
    data: {
      orderNumber: 'SIP-1002',
      storeId: store.id,
      customerName: 'Elif Demir',
      customerPhone: '0544 111 22 33',
      customerAddress: 'Mağazadan Teslim (Gel-Al)',
      deliveryType: 'STORE_PICKUP',
      paymentMethod: 'PAY_AT_STORE',
      channel: 'INSTAGRAM_DM',
      subtotal: 1290.00,
      shippingCost: 0,
      totalAmount: 1290.00,
      status: 'PREPARING',
      note: 'Cumartesi saat 15:00 gibi dükkandan teslim alacağım.',
      items: {
        create: [
          {
            productId: p2.id,
            productName: p2.name,
            variantName: 'Taba',
            sku: 'CNT-DR-042-TB',
            barcode: '8690001002028',
            quantity: 1,
            unitPrice: 1290.00,
          },
        ],
      },
    },
  });

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
