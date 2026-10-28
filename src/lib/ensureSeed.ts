import { prisma } from './prisma';

export async function ensureDemoStore() {
  const existing = await prisma.store.findUnique({
    where: { slug: 'butikmoda' },
    include: { stories: true },
  });

  if (existing) {
    if (existing.stories.length === 0) {
      await prisma.story.createMany({
        data: [
          {
            storeId: existing.id,
            title: '✨ Yeni Sezon',
            imageUrl:
              'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=400&q=80',
            orderIndex: 1,
          },
          {
            storeId: existing.id,
            title: '🔥 İndirimler',
            imageUrl:
              'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=400&q=80',
            orderIndex: 2,
          },
          {
            storeId: existing.id,
            title: '👗 Kombinler',
            imageUrl:
              'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=400&q=80',
            orderIndex: 3,
          },
          {
            storeId: existing.id,
            title: '⭐ Müşteriler',
            imageUrl:
              'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=400&q=80',
            orderIndex: 4,
          },
        ],
      });
    }
    return existing;
  }

  const store = await prisma.store.create({
    data: {
      slug: 'butikmoda',
      name: 'Nişantaşı Butik & Atölye',
      tagline: 'Yeni Sezon İtalyan Keten & İpek Koleksiyonu',
      description:
        'Özel tasarım kadın giyim & aksesuar. Mağazamızdan hızlı gel-al veya tüm Türkiye’ye aynı gün kargo!',
      bannerUrl:
        'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1600&q=80',
      logoUrl:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
      themeColor: '#0f172a',
      whatsappPhone: '905551234567',
      instagramHandle: 'nisantasibutik.demo',
      shippingFee: 59.9,
      freeShippingThreshold: 1000.0,
      address: 'Teşvikiye Mah. Valikonağı Cad. No:42 Şişli/İstanbul',
      allowStorePickup: true,
      pinCode: '1234',
      ibanInfo: 'TR12 0006 2000 0000 0123 4567 89 (Nişantaşı Butik Tekstil)',
      stories: {
        create: [
          {
            title: '✨ Yeni Sezon',
            imageUrl:
              'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=400&q=80',
            orderIndex: 1,
          },
          {
            title: '🔥 İndirimler',
            imageUrl:
              'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=400&q=80',
            orderIndex: 2,
          },
          {
            title: '👗 Kombinler',
            imageUrl:
              'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=400&q=80',
            orderIndex: 3,
          },
          {
            title: '⭐ Müşteriler',
            imageUrl:
              'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=400&q=80',
            orderIndex: 4,
          },
        ],
      },
    },
  });

  const p1 = await prisma.product.create({
    data: {
      storeId: store.id,
      name: 'Oversize Keten Gömlek - Doğal Dokulu',
      description:
        '%100 pamuk-keten karışımlı nefes alan kumaş. Yaz ve bahar ayları için ideal.',
      price: 649.9,
      compareAtPrice: 850.0,
      imageUrl:
        'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=800&q=80',
      category: 'Üst Giyim',
      sku: 'KTN-GML-001',
      barcode: '8690001001014',
      stock: 16,
      isActive: true,
      hideWhenOutOfStock: false,
      instagramPostUrl: 'https://instagram.com/p/demo1',
      variants: {
        create: [
          {
            name: 'S / Ekru',
            sku: 'KTN-GML-001-S-EKR',
            barcode: '8690001001021',
            priceDiff: 0,
            stock: 5,
          },
          {
            name: 'M / Ekru',
            sku: 'KTN-GML-001-M-EKR',
            barcode: '8690001001038',
            priceDiff: 0,
            stock: 7,
          },
          {
            name: 'L / Zeytin Yeşili',
            sku: 'KTN-GML-001-L-ZYT',
            barcode: '8690001001045',
            priceDiff: 0,
            stock: 4,
          },
        ],
      },
    },
  });

  const p2 = await prisma.product.create({
    data: {
      storeId: store.id,
      name: 'El Yapımı Deri Omuz Çantası',
      description:
        'Hakiki yumuşak deri, ayarlanabilir askılı ve mıknatıs kapamalı günlük çanta.',
      price: 1290.0,
      compareAtPrice: 1590.0,
      imageUrl:
        'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=80',
      category: 'Çanta & Aksesuar',
      sku: 'CNT-DR-042',
      barcode: '8690001002011',
      stock: 6,
      isActive: true,
      hideWhenOutOfStock: false,
      instagramPostUrl: 'https://instagram.com/p/demo2',
      variants: {
        create: [
          {
            name: 'Taba',
            sku: 'CNT-DR-042-TB',
            barcode: '8690001002028',
            priceDiff: 0,
            stock: 4,
          },
          {
            name: 'Siyah',
            sku: 'CNT-DR-042-SYH',
            barcode: '8690001002035',
            priceDiff: 0,
            stock: 2,
          },
        ],
      },
    },
  });

  await prisma.product.create({
    data: {
      storeId: store.id,
      name: 'Yüksek Bel Palazzo Pantolon',
      description: 'Akışkan krep kumaş, tam kalıp yüksek bel kesim.',
      price: 780.0,
      compareAtPrice: 990.0,
      imageUrl:
        'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=800&q=80',
      category: 'Alt Giyim',
      sku: 'PLT-PLZ-019',
      barcode: '8690001003018',
      stock: 9,
      isActive: true,
      hideWhenOutOfStock: true,
      variants: {
        create: [
          {
            name: '36 Beden / Bej',
            sku: 'PLT-PLZ-019-36',
            barcode: '8690001003025',
            priceDiff: 0,
            stock: 3,
          },
          {
            name: '38 Beden / Bej',
            sku: 'PLT-PLZ-019-38',
            barcode: '8690001003032',
            priceDiff: 0,
            stock: 6,
          },
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
      subtotal: 1299.8,
      shippingCost: 0,
      totalAmount: 1299.8,
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
            unitPrice: 649.9,
          },
        ],
      },
    },
  });

  return store;
}
