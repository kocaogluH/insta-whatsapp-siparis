import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSellerSession } from '@/lib/auth';
import { verifyCsrfOrigin, csrfErrorResponse } from '@/lib/csrf';

export async function POST(req: Request) {
  try {
    if (!verifyCsrfOrigin(req)) {
      return csrfErrorResponse();
    }

    const session = await getSellerSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Yetkisiz işlem. Lütfen satıcı girişi yapın.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
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

    if (!name || price === undefined) {
      return NextResponse.json(
        { error: 'Ürün adı ve fiyat zorunludur' },
        { status: 400 }
      );
    }

    const variantList = Array.isArray(variants) ? variants : [];
    const totalStock =
      variantList.length > 0
        ? variantList.reduce(
            (acc: number, v: { stock?: number }) => acc + Math.max(0, Number(v.stock || 0)),
            0
          )
        : Math.max(0, Number(stock || 0));

    // GÜVENLİK: storeId asla client'tan alınmaz; doğrudan doğrulanmış oturumdaki session.storeId kullanılır!
    const product = await prisma.product.create({
      data: {
        storeId: session.storeId,
        name: String(name).slice(0, 150).trim(),
        description: description ? String(description).slice(0, 2000).trim() : null,
        price: Math.max(0, Number(price)),
        compareAtPrice: compareAtPrice ? Math.max(0, Number(compareAtPrice)) : null,
        imageUrl:
          imageUrl && String(imageUrl).startsWith('http')
            ? String(imageUrl).slice(0, 500)
            : 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=800&q=80',
        category: category ? String(category).slice(0, 50).trim() : 'Genel',
        sku: sku ? String(sku).slice(0, 50).trim() : null,
        barcode: barcode ? String(barcode).slice(0, 50).trim() : null,
        stock: totalStock,
        isActive: true,
        hideWhenOutOfStock: Boolean(hideWhenOutOfStock),
        instagramPostUrl:
          instagramPostUrl && String(instagramPostUrl).startsWith('http')
            ? String(instagramPostUrl).slice(0, 300)
            : null,
        variants: {
          create: variantList.map(
            (v: {
              name: string;
              sku?: string;
              barcode?: string;
              priceDiff?: number;
              stock?: number;
            }) => ({
              name: String(v.name).slice(0, 50).trim(),
              sku: v.sku ? String(v.sku).slice(0, 50).trim() : null,
              barcode: v.barcode ? String(v.barcode).slice(0, 50).trim() : null,
              priceDiff: Number(v.priceDiff || 0),
              stock: Math.max(0, Number(v.stock || 0)),
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
