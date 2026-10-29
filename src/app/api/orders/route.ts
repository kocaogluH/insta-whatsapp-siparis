import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyCsrfOrigin, csrfErrorResponse } from '@/lib/csrf';
import { getClientIp, orderLimiter } from '@/lib/ratelimit';
import { orderCreateSchema } from '@/lib/validations';

export async function POST(req: Request) {
  try {
    if (!verifyCsrfOrigin(req)) {
      return csrfErrorResponse();
    }

    // 1. Hız Sınırı (IP başına dakikada 10 sipariş)
    const ip = getClientIp(req);
    const limitResult = await orderLimiter.limit(ip);
    if (!limitResult.success) {
      return NextResponse.json(
        { error: 'Kısa süre içinde çok fazla sipariş denemesi yapıldı. Lütfen 1 dakika sonra tekrar deneyin.' },
        { status: 429 }
      );
    }

    const rawBody = await req.json();

    // 2. Zod ile Girdi Doğrulama & Uzunluk Sınırları
    const parseResult = orderCreateSchema.safeParse(rawBody);
    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0]?.message || 'Eksik veya geçersiz sipariş bilgisi.';
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const validated = parseResult.data;
    const {
      storeSlug,
      storeId,
      customerName,
      customerPhone,
      customerAddress,
      deliveryType,
      paymentMethod,
      channel,
      note,
      items,
    } = validated;

    // 3. Mağazayı doğrula ve kargo / IBAN kurallarını çek
    const store = await prisma.store.findFirst({
      where: storeSlug ? { slug: storeSlug, isActive: true } : { id: storeId, isActive: true },
      select: {
        id: true,
        slug: true,
        name: true,
        shippingFee: true,
        freeShippingThreshold: true,
        ibanInfo: true,
        allowStorePickup: true,
      },
    });

    if (!store) {
      return NextResponse.json(
        { error: 'Mağaza bulunamadı veya sipariş kabul etmiyor.' },
        { status: 404 }
      );
    }

    const isPickup = deliveryType === 'STORE_PICKUP';
    if (isPickup && !store.allowStorePickup) {
      return NextResponse.json(
        { error: 'Bu mağaza elden teslim (gel-al) seçeneğini desteklemiyor.' },
        { status: 400 }
      );
    }

    // 4. ATOMİK PRISMA TRANSACTION İLE STOK KONTROLÜ, DÜŞÜMÜ VE SİPARİŞ OLUŞTURMA
    // Concurrency / Race Condition Koruması:
    // Koşullu updateMany (stock >= qty) ile yapılır. Eşzamanlı isteklerde satır sayısı 0 ise
    // işlem derhal hata fırlatarak geri alınır (rollback); stok ASLA negatife düşmez.
    try {
      const result = await prisma.$transaction(async (tx) => {
        let calculatedSubtotal = 0;
        const processedItems: {
          productId: string;
          variantId: string | null;
          productName: string;
          variantName: string | null;
          sku: string | null;
          barcode: string | null;
          quantity: number;
          unitPrice: number;
        }[] = [];

        for (const item of items) {
          const qty = item.quantity;

          // Ürünü ve varyantı veritabanından güncel fiyatıyla çek (Fiyat manipülasyonu engeli)
          const product = await tx.product.findUnique({
            where: { id: item.productId, storeId: store.id, isActive: true },
            include: { variants: true },
          });

          if (!product) {
            throw new Error(`STOK_HATA:Siparişteki ürünlerden biri (${item.productId}) satışta değil.`);
          }

          let unitPrice = product.price;
          let variantName: string | null = null;
          let sku = product.sku;
          let barcode = product.barcode;

          if (item.variantId) {
            const variant = product.variants.find((v) => v.id === item.variantId);
            if (!variant) {
              throw new Error(`STOK_HATA:"${product.name}" için seçilen varyant bulunamadı.`);
            }

            unitPrice = product.price + (variant.priceDiff || 0);
            variantName = variant.name;
            sku = variant.sku || sku;
            barcode = variant.barcode || barcode;

            // Koşullu Varyant Stok Düşümü (Atomic Conditional Update)
            const variantUpdate = await tx.productVariant.updateMany({
              where: {
                id: item.variantId,
                productId: item.productId,
                stock: { gte: qty },
              },
              data: {
                stock: { decrement: qty },
              },
            });

            if (variantUpdate.count === 0) {
              throw new Error(
                `STOK_HATA:"${product.name} (${variant.name})" için yeterli stok kalmadı.`
              );
            }

            // Varyantlı ürünlerde ana ürün toplam stoğunu da atomik olarak düşür (Tutarlılık Koruması)
            const productUpdate = await tx.product.updateMany({
              where: {
                id: item.productId,
                storeId: store.id,
                stock: { gte: qty },
              },
              data: {
                stock: { decrement: qty },
              },
            });

            if (productUpdate.count === 0) {
              throw new Error(`STOK_HATA:"${product.name}" için yeterli stok kalmadı.`);
            }
          } else {
            // Varyantsız Ürün İçin Koşullu Stok Düşümü
            const productUpdate = await tx.product.updateMany({
              where: {
                id: item.productId,
                storeId: store.id,
                stock: { gte: qty },
              },
              data: {
                stock: { decrement: qty },
              },
            });

            if (productUpdate.count === 0) {
              throw new Error(`STOK_HATA:"${product.name}" için yeterli stok kalmadı.`);
            }
          }

          calculatedSubtotal += unitPrice * qty;
          processedItems.push({
            productId: product.id,
            variantId: item.variantId || null,
            productName: product.name,
            variantName,
            sku,
            barcode,
            quantity: qty,
            unitPrice,
          });
        }

        // Kargo & Toplam Tutar Hesabı
        const calculatedShippingCost =
          isPickup || (store.freeShippingThreshold > 0 && calculatedSubtotal >= store.freeShippingThreshold)
            ? 0
            : store.shippingFee;
        const calculatedTotalAmount = calculatedSubtotal + calculatedShippingCost;

        // Sipariş Numarası
        const orderCount = await tx.order.count({ where: { storeId: store.id } });
        const randomSuffix = Math.floor(100 + Math.random() * 900);
        const orderNumber = `SIP-${1001 + orderCount}-${randomSuffix}`;

        // Siparişi Veritabanına Yaz
        const order = await tx.order.create({
          data: {
            orderNumber,
            storeId: store.id,
            customerName,
            customerPhone: customerPhone.replace(/\D/g, '').slice(0, 15),
            customerAddress: isPickup
              ? 'Mağazadan Teslim (Gel-Al)'
              : (customerAddress || 'Belirtilmedi').slice(0, 300).trim(),
            deliveryType: isPickup ? 'STORE_PICKUP' : 'SHIPPING',
            paymentMethod,
            channel,
            subtotal: calculatedSubtotal,
            shippingCost: calculatedShippingCost,
            totalAmount: calculatedTotalAmount,
            status: 'NEW',
            note: note || null,
            items: {
              create: processedItems.map((it) => ({
                productId: it.productId,
                variantId: it.variantId,
                productName: it.productName,
                variantName: it.variantName,
                sku: it.sku,
                barcode: it.barcode,
                quantity: it.quantity,
                unitPrice: it.unitPrice,
              })),
            },
          },
          include: { items: true },
        });

        return order;
      });

      // Başarılı sipariş yanıtı (Havale ise IBAN sadece burada sunulur)
      return NextResponse.json(
        {
          success: true,
          order: result,
          ibanInfo: paymentMethod === 'IBAN_TRANSFER' ? store.ibanInfo : null,
        },
        { status: 201 }
      );
    } catch (txError: unknown) {
      if (txError instanceof Error && txError.message.startsWith('STOK_HATA:')) {
        const errorMsg = txError.message.replace('STOK_HATA:', '');
        return NextResponse.json({ error: errorMsg }, { status: 400 });
      }
      throw txError;
    }
  } catch (error) {
    console.error('POST /api/orders error:', error);
    return NextResponse.json(
      { error: 'Sipariş oluşturulurken bir hata oluştu.' },
      { status: 500 }
    );
  }
}
