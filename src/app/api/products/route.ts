import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      storeId,
      name,
      description,
      price,
      compareAtPrice,
      imageUrl,
      category,
      sku,
      barcode,
      stock,
      hideWhenOutOfStock,
      instagramPostUrl,
      variants,
    } = body;

    const variantList = Array.isArray(variants) ? variants : [];
    const totalStock =
      variantList.length > 0
        ? variantList.reduce((acc: number, v: { stock?: number }) => acc + Number(v.stock || 0), 0)
        : Number(stock || 0);

    const product = await prisma.product.create({
      data: {
        storeId,
        name,
        description: description || null,
        price: Number(price),
        compareAtPrice: compareAtPrice ? Number(compareAtPrice) : null,
        imageUrl:
          imageUrl ||
          'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=800&q=80',
        category: category || 'Genel',
        sku: sku || null,
        barcode: barcode || null,
        stock: totalStock,
        isActive: true,
        hideWhenOutOfStock: Boolean(hideWhenOutOfStock),
        instagramPostUrl: instagramPostUrl || null,
        variants: {
          create: variantList.map(
            (v: {
              name: string;
              sku?: string;
              barcode?: string;
              priceDiff?: number;
              stock?: number;
            }) => ({
              name: v.name,
              sku: v.sku || null,
              barcode: v.barcode || null,
              priceDiff: Number(v.priceDiff || 0),
              stock: Number(v.stock || 0),
            })
          ),
        },
      },
      include: { variants: true },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('POST /api/products error:', error);
    return NextResponse.json({ error: 'Ürün eklenemedi' }, { status: 500 });
  }
}
