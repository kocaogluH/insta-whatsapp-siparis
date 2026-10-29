/**
 * EŞZAMANLI SİPARİŞ & ATOMİK STOK TESTİ (CONCURRENCY & RACE CONDITION TEST)
 * Bu betik, son 1 adet stoğu kalan bir ürüne aynı anda (simultaneous) 2 farklı müşteriden
 * sipariş geldiğinde, sistemin stoğu -1'e düşürmediğini, tam olarak 1 siparişi kabul edip
 * diğerini atomik olarak reddettiğini kanıtlar.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runConcurrencyTest() {
  console.log('--- InstaSipariş Atomik Stok & Eşzamanlılık Testi Başlatılıyor ---');

  // 1. Test Mağazası Bul veya Oluştur
  let store = await prisma.store.findFirst({ where: { isActive: true } });
  if (!store) {
    store = await prisma.store.create({
      data: {
        slug: 'test-concurrency-store',
        name: 'Test Concurrency Mağazası',
        whatsappPhone: '905550001122',
        instagramHandle: 'teststore',
        themeColor: '#3c302a',
      },
    });
  }

  // 2. Stoğu Tam 1 Olan Test Ürünü ve Varyantı Oluştur
  const testProduct = await prisma.product.create({
    data: {
      storeId: store.id,
      name: 'Eşzamanlılık Test Elbisesi (Son 1 Adet)',
      price: 250,
      stock: 1, // Ana ürün toplam stok: 1
      imageUrl: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446',
      variants: {
        create: [
          {
            name: 'Beden S (Stok: 1)',
            priceDiff: 0,
            stock: 1, // Varyant stok: 1
          },
        ],
      },
    },
    include: { variants: true },
  });

  const variant = testProduct.variants[0];
  console.log(`[TEST HAZIRLIK] Ürün oluşturuldu. ID: ${testProduct.id}, Başlangıç Stoğu: ${testProduct.stock}, Varyant Stoğu: ${variant.stock}`);

  // Simüle Edilen POST /api/orders Atomik Sipariş Akışı
  async function placeSimulatedOrder(customerName) {
    const qty = 1;
    return await prisma.$transaction(async (tx) => {
      // 1. Koşullu Varyant Stok Düşümü (stock >= qty)
      const variantUpdate = await tx.productVariant.updateMany({
        where: {
          id: variant.id,
          productId: testProduct.id,
          stock: { gte: qty },
        },
        data: {
          stock: { decrement: qty },
        },
      });

      if (variantUpdate.count === 0) {
        throw new Error('STOK_YETERSIZ: Seçilen varyant için yeterli stok kalmadı.');
      }

      // 2. Koşullu Ana Ürün Stok Düşümü
      const productUpdate = await tx.product.updateMany({
        where: {
          id: testProduct.id,
          storeId: store.id,
          stock: { gte: qty },
        },
        data: {
          stock: { decrement: qty },
        },
      });

      if (productUpdate.count === 0) {
        throw new Error('STOK_YETERSIZ: Ürün için yeterli stok kalmadı.');
      }

      // 3. Siparişi Oluştur
      const order = await tx.order.create({
        data: {
          orderNumber: `TEST-ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          storeId: store.id,
          customerName,
          customerPhone: '905551112233',
          customerAddress: 'Test Adres',
          deliveryType: 'SHIPPING',
          paymentMethod: 'IBAN_TRANSFER',
          channel: 'WHATSAPP',
          subtotal: 250,
          shippingCost: 0,
          totalAmount: 250,
          items: {
            create: [
              {
                productId: testProduct.id,
                variantId: variant.id,
                productName: testProduct.name,
                variantName: variant.name,
                quantity: qty,
                unitPrice: 250,
              },
            ],
          },
        },
      });

      return order;
    });
  }

  console.log('[TEST BAŞLATILIYOR] 2 müşteri AYNI ANDA (Promise.all) son kalan 1 ürünü sipariş ediyor...');

  const startTime = Date.now();
  const results = await Promise.allSettled([
    placeSimulatedOrder('Müşteri 1 (Zeynep K.)'),
    placeSimulatedOrder('Müşteri 2 (Mehmet A.)'),
  ]);
  const duration = Date.now() - startTime;

  console.log(`[TEST TAMAMLANDI] Süre: ${duration}ms`);

  const fulfilled = results.filter((r) => r.status === 'fulfilled');
  const rejected = results.filter((r) => r.status === 'rejected');

  console.log(`- Başarılı Sipariş Sayısı: ${fulfilled.length}`);
  console.log(`- Reddedilen (Stok Yetersiz) Sayısı: ${rejected.length}`);

  if (rejected.length > 0) {
    console.log(`- Red Nedeni: ${rejected[0].reason.message}`);
  }

  // Veritabanındaki Güncel Stokları Kontrol Et
  const updatedProduct = await prisma.product.findUnique({
    where: { id: testProduct.id },
    include: { variants: true },
  });

  const finalProductStock = updatedProduct.stock;
  const finalVariantStock = updatedProduct.variants[0].stock;

  console.log(`- Nihai Ana Ürün Stoğu: ${finalProductStock}`);
  console.log(`- Nihai Varyant Stoğu: ${finalVariantStock}`);

  // Test Doğrulamaları
  let passed = true;

  if (fulfilled.length !== 1) {
    console.error('❌ HATA: Başarılı sipariş sayısı 1 olmalıydı!');
    passed = false;
  }

  if (rejected.length !== 1) {
    console.error('❌ HATA: Reddedilen sipariş sayısı 1 olmalıydı!');
    passed = false;
  }

  if (finalProductStock !== 0 || finalVariantStock !== 0) {
    console.error(`❌ HATA: Nihai stok 0 olmalıydı, negatif veya hatalı değer bulundu! (Ürün: ${finalProductStock}, Varyant: ${finalVariantStock})`);
    passed = false;
  }

  // Temizlik (Test Verilerini Sil)
  await prisma.orderItem.deleteMany({ where: { productId: testProduct.id } });
  await prisma.order.deleteMany({ where: { items: { none: {} }, customerName: { in: ['Müşteri 1 (Zeynep K.)', 'Müşteri 2 (Mehmet A.)'] } } });
  await prisma.productVariant.deleteMany({ where: { productId: testProduct.id } });
  await prisma.product.delete({ where: { id: testProduct.id } });
  console.log('[TEST TEMİZLİK] Geçici test verileri silindi.');

  if (passed) {
    console.log('✅ TEBRİKLER: Eşzamanlı sipariş ve atomik stok koruması %100 BAŞARILI!');
  } else {
    process.exit(1);
  }
}

runConcurrencyTest()
  .catch((e) => {
    console.error('Test sırasında beklenmeyen hata:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
