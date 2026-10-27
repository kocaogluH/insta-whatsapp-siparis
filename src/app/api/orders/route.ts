import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      storeId,
      customerName,
      customerPhone,
      customerAddress,
      deliveryType,
      paymentMethod,
      channel,
      subtotal,
      shippingCost,
      totalAmount,
      note,
      items,
    } = body;

    if (!storeId || !customerName || !customerPhone || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Eksik sipariş bilgisi' },
        { status: 400 }
      );
    }

    const orderCount = await prisma.order.count({ where: { storeId } });
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const orderNumber = `SIP-${1001 + orderCount}-${randomSuffix}`;

    const order = await prisma.order.create({
      data: {
        orderNumber,
        storeId,
        customerName,
        customerPhone,
        customerAddress:
          deliveryType === 'STORE_PICKUP'
            ? 'Mağazadan Teslim (Gel-Al)'
            : customerAddress || 'Belirtilmedi',
        deliveryType: deliveryType || 'SHIPPING',
        paymentMethod: paymentMethod || 'IBAN_TRANSFER',
        channel: channel || 'WHATSAPP',
        subtotal: Number(subtotal),
        shippingCost: Number(shippingCost),
        totalAmount: Number(totalAmount),
        status: 'NEW',
        note: note || null,
        items: {
          create: items.map(
            (item: {
              productId?: string;
              variantId?: string;
              productName: string;
              variantName?: string;
              sku?: string;
              barcode?: string;
              quantity: number;
              unitPrice: number;
            }) => ({
              productId: item.productId || null,
              variantId: item.variantId || null,
              productName: item.productName,
              variantName: item.variantName || null,
              sku: item.sku || null,
              barcode: item.barcode || null,
              quantity: Number(item.quantity),
              unitPrice: Number(item.unitPrice),
            })
          ),
        },
      },
      include: { items: true },
    });

    // Decrement stock automatically so online and physical store inventory stay synced
    for (const item of items) {
      const qty = Number(item.quantity || 1);
      if (item.variantId && item.productId) {
        const variant = await prisma.productVariant.findUnique({
          where: { id: item.variantId },
        });
        if (variant) {
          await prisma.productVariant.update({
            where: { id: variant.id },
            data: { stock: Math.max(0, variant.stock - qty) },
          });
          const allVariants = await prisma.productVariant.findMany({
            where: { productId: item.productId },
          });
          const newTotal = allVariants.reduce((s, v) => s + v.stock, 0);
          await prisma.product.update({
            where: { id: item.productId },
            data: { stock: newTotal },
          });
        }
      } else if (item.productId) {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
        });
        if (product) {
          await prisma.product.update({
            where: { id: product.id },
            data: { stock: Math.max(0, product.stock - qty) },
          });
        }
      }
    }

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error('POST /api/orders error:', error);
    return NextResponse.json(
      { error: 'Sipariş kaydedilemedi' },
      { status: 500 }
    );
  }
}
