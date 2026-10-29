import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSellerSession } from '@/lib/auth';
import { verifyCsrfOrigin, csrfErrorResponse } from '@/lib/csrf';
import { productCreateSchema } from '@/lib/validations';

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

    // Zod Girdi Doğrulama
    const parseResult = productCreateSchema.safeParse(body);
    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0]?.message || 'Geçersiz ürün bilgileri.';
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const validated = parseResult.data;
    const variantList = validated.variants || [];
    const totalStock =
      variantList.length > 0
        ? variantList.reduce((acc, v) => acc + v.stock, 0)
        : validated.stock;

    // GÜVENLİK: storeId asla client'tan alınmaz; doğrudan doğrulanmış oturumdaki session.storeId kullanılır!
    const product = await prisma.product.create({
      data: {
        storeId: session.storeId,
        name: validated.name,
        description: validated.description,
        price: validated.price,
        compareAtPrice: validated.compareAtPrice,
        imageUrl: validated.imageUrl,
        category: validated.category,
        sku: (body.sku ? String(body.sku).slice(0, 50).trim() : null),
        barcode: (body.barcode ? String(body.barcode).slice(0, 50).trim() : null),
        stock: totalStock,
        isActive: validated.isActive,
        hideWhenOutOfStock: validated.hideWhenOutOfStock,
        instagramPostUrl: validated.instagramPostUrl,
        variants: {
          create: variantList.map((v) => ({
            name: v.name,
            priceDiff: v.priceDiff,
            stock: v.stock,
          })),
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
