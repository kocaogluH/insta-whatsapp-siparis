import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyCsrfOrigin, csrfErrorResponse } from '@/lib/csrf';

export async function POST(req: Request) {
  try {
    if (!verifyCsrfOrigin(req)) {
      return csrfErrorResponse();
    }

    const body = await req.json();
    const {
      storeId,
      customerName,
      customerPhone,
      customerAddress,
      deliveryType,
      paymentMethod,
      channel,
      note,
      items,
    } = body;

    if (
      !storeId ||
      !customerName ||
      !customerPhone ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return NextResponse.json(
        { error: 'Eksik veya geçersiz sipariş bilgisi' },
        { status: 400 }
      );
    }

    // 1. Mağazayı doğrula ve kargo kurallarını çek
    const store = await prisma.store.findUnique({
      where: { id: storeId, isActive: true },
      select: {
        id: true,
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

    // 2. SUNUCU TARAFLI FİYAT HESAPLAMA & STOK KONTROLÜ (Price Tampering & Stock Fix)
    let calculatedSubtotal = 0;
    const validatedItems: {
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
      const qty = Math.max(1, Math.min(100, Math.floor(Number(item.quantity) || 1)));

      const product = await prisma.product.findUnique({
        where: { id: item.productId, storeId: store.id, isActive: true },
        include: { variants: true },
      });

      if (!product) {
        return NextResponse.json(
          { error: `Siparişteki ürünlerden biri bulunamadı veya satışta değil.` },
          { status: 400 }
        );
      }

      let unitPrice = product.price;
      let variantName: string | null = null;
      let sku = product.sku;
      let barcode = product.barcode;

      if (item.variantId) {
        const variant = product.variants.find((v) => v.id === item.variantId);
        if (!variant) {
          return NextResponse.json(
            { error: `"${product.name}" için seçilen varyant bulunamadı.` },
            { status: 400 }
          );
        }

        // STOK KONTROLÜ: Yeterli stok var mı?
        if (variant.stock < qty) {
          return NextResponse.json(
            {
              error: `"${product.name} (${variant.name})" için yeterli stok bulunmuyor. Mevcut stok: ${variant.stock}`,
            },
            { status: 400 }
          );
        }

        unitPrice = product.price + (variant.priceDiff || 0);
        variantName = variant.name;
        sku = variant.sku || sku;
        barcode = variant.barcode || barcode;
      } else {
        // STOK KONTROLÜ: Ana ürün stoğu
        if (product.stock < qty) {
          return NextResponse.json(
            {
              error: `"${product.name}" için yeterli stok bulunmuyor. Mevcut stok: ${product.stock}`,
            },
            { status: 400 }
          );
        }
      }

      calculatedSubtotal += unitPrice * qty;
      validatedItems.push({
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

    // 3. Sunucuda Kargo ve Toplam Tutar Hesaplama
    const isPickup = deliveryType === 'STORE_PICKUP';
    if (isPickup && !store.allowStorePickup) {
      return NextResponse.json(
        { error: 'Bu mağaza elden teslim (gel-al) seçeneğini desteklemiyor.' },
        { status: 400 }
      );
    }

    const calculatedShippingCost =
      isPickup || calculatedSubtotal >= store.freeShippingThreshold
        ? 0
        : store.shippingFee;
    const calculatedTotalAmount = calculatedSubtotal + calculatedShippingCost;

    // 4. Sipariş Numarası Üretme
    const orderCount = await prisma.order.count({ where: { storeId: store.id } });
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const orderNumber = `SIP-${1001 + orderCount}-${randomSuffix}`;

    // 5. Sipariş ve Stok Güncelleme Transaction'ı
    const createdOrder = await prisma.$transaction(async (tx) => {
      // Siparişi kaydet
      const order = await tx.order.create({
        data: {
          orderNumber,
          storeId: store.id,
          customerName: String(customerName).slice(0, 100).trim(),
          customerPhone: String(customerPhone).replace(/\D/g, '').slice(0, 15),
          customerAddress: isPickup
            ? 'Mağazadan Teslim (Gel-Al)'
            : String(customerAddress || 'Belirtilmedi').slice(0, 300).trim(),
          deliveryType: isPickup ? 'STORE_PICKUP' : 'SHIPPING',
          paymentMethod: paymentMethod === 'STORE_PAY' ? 'STORE_PAY' : 'IBAN_TRANSFER',
          channel: channel === 'INSTAGRAM_DM' ? 'INSTAGRAM_DM' : 'WHATSAPP',
          subtotal: calculatedSubtotal,
          shippingCost: calculatedShippingCost,
          totalAmount: calculatedTotalAmount,
          status: 'NEW',
          note: note ? String(note).slice(0, 500).trim() : null,
          items: {
            create: validatedItems.map((it) => ({
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

      // Stok düşürme
      for (const item of validatedItems) {
        if (item.variantId) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: { decrement: item.quantity } },
          });

          // Ana ürün toplam stoğunu güncelle
          const allVariants = await tx.productVariant.findMany({
            where: { productId: item.productId },
          });
          const newTotal = allVariants.reduce((s, v) => s + v.stock, 0);
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: newTotal },
          });
        } else {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } },
          });
        }
      }

      return order;
    });

    // 6. Yanıt: Havale seçildiyse IBAN sadece sipariş tamamlama ekranına özel döndürülür
    return NextResponse.json({
      success: true,
      order: createdOrder,
      ibanInfo: paymentMethod === 'IBAN_TRANSFER' ? store.ibanInfo : null,
    });
  } catch (error) {
    console.error('POST /api/orders error:', error);
    return NextResponse.json(
      { error: 'Sipariş oluşturulurken bir hata oluştu.' },
      { status: 500 }
    );
  }
}
