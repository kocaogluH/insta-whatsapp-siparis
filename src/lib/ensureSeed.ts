import { prisma } from './prisma';
import bcrypt from 'bcryptjs';

export async function ensureDemoStore() {
  const existing = await prisma.store.findUnique({
    where: { slug: 'butikmoda' },
    include: { stories: true },
  });

  const DISTINCT_STORIES = [
    {
      title: 'Yeni Sezon',
      imageUrl:
        'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=400&q=80',
      orderIndex: 1,
    },
    {
      title: 'Kombinler',
      imageUrl:
        'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=400&q=80',
      orderIndex: 2,
    },
    {
      title: 'Keten Seri',
      imageUrl:
        'https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=400&q=80',
      orderIndex: 3,
    },
    {
      title: 'Müşteriler',
      imageUrl:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      orderIndex: 4,
    },
  ];

  if (existing) {
    // If stories are missing or using duplicated product images, refresh them
    const hasDuplicates = existing.stories.some(
      (s) =>
        s.imageUrl.includes('photo-1548036328-c9fa89d128fa') ||
        s.imageUrl.includes('photo-1596755094514-f87e34085b2c')
    );

    if (existing.stories.length === 0 || hasDuplicates) {
      await prisma.story.deleteMany({ where: { storeId: existing.id } });
      await prisma.story.createMany({
        data: DISTINCT_STORIES.map((st) => ({
          storeId: existing.id,
          ...st,
        })),
      });
    }

    if (!existing.pinHash) {
      await prisma.store.update({
        where: { id: existing.id },
        data: {
          pinHash: bcrypt.hashSync('1234', 10),
          mustChangePin: true,
          pinVersion: 1,
        },
      });
    }
    return existing;
  }

  const store = await prisma.store.create({
    data: {
      slug: 'butikmoda',
      name: 'Nişantaşı Butik & Atölye',
      tagline: 'Doğal Keten, İpek ve Deri Koleksiyonu',
      description:
        'Sakin tonlar, birinci sınıf kumaşlar ve zamansız tasarımlar. Mağazamızdan hızlı gel-al veya aynı gün kargo.',
      bannerUrl:
        'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1600&q=80',
      logoUrl:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
      themeColor: '#3c302a', // Tan 10 / Koyu Espresso
      whatsappPhone: '905551234567',
      instagramHandle: 'nisantasibutik.demo',
      shippingFee: 59.9,
      freeShippingThreshold: 1000.0,
      address: 'Teşvikiye Mah. Valikonağı Cad. No:42 Şişli/İstanbul',
      allowStorePickup: true,
      pinHash: bcrypt.hashSync('1234', 10),
      pinVersion: 1,
      mustChangePin: true,
      ibanInfo: 'TR12 0006 2000 0000 0123 4567 89 (Nişantaşı Butik Tekstil)',
      stories: {
        create: DISTINCT_STORIES,
      },
    },
  });

  const p1 = await prisma.product.create({
    data: {
      storeId: store.id,
      name: 'Oversize Keten Gömlek - Ekru',
      description:
        '%100 doğal keten kumaş. Rahat kesim, sedef düğme detaylı.',
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
            name: 'S Beden',
            sku: 'KTN-GML-001-S',
            barcode: '8690001001021',
            priceDiff: 0,
            stock: 5,
          },
          {
            name: 'M Beden',
            sku: 'KTN-GML-001-M',
            barcode: '8690001001038',
            priceDiff: 0,
            stock: 7,
          },
          {
            name: 'L Beden',
            sku: 'KTN-GML-001-L',
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
        'Yumuşak dokulu birinci sınıf deri, pirinç toka detaylı günlük çanta.',
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
            name: 'Vizon',
            sku: 'CNT-DR-042-VZN',
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
      description: 'Akışkan keten-krep harmanı kumaş, yüksek bel dökümlü kesim.',
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
            name: '36 Beden',
            sku: 'PLT-PLZ-019-36',
            barcode: '8690001003025',
            priceDiff: 0,
            stock: 3,
          },
          {
            name: '38 Beden',
            sku: 'PLT-PLZ-019-38',
            barcode: '8690001003032',
            priceDiff: 0,
            stock: 6,
          },
        ],
      },
    },
  });

  return store;
}
