import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureDemoStore } from '@/lib/ensureSeed';
import { getSellerSession } from '@/lib/auth';
import { verifyCsrfOrigin, csrfErrorResponse } from '@/lib/csrf';

/**
 * GET /api/store/[slug] - Herkese Açık Vitrin Verisi (Public Catalog)
 * GÜVENLİK: pinCode, pinHash, ibanInfo ve müşteri sipariş verileri KESİNLİKLE DÖNMEZ!
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    await ensureDemoStore();

    const store = await prisma.store.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        name: true,
        tagline: true,
        description: true,
        logoUrl: true,
        bannerUrl: true,
        themeColor: true,
        whatsappPhone: true,
        instagramHandle: true,
        shippingFee: true,
        freeShippingThreshold: true,
        address: true,
        allowStorePickup: true,
        // DİKKAT: pinCode, pinHash, ibanInfo ve orders BİLEREK SEÇİLMEMİŞTİR (KVKK & Finansal Güvenlik)
        stories: {
          orderBy: { orderIndex: 'asc' },
          select: {
            id: true,
            title: true,
            imageUrl: true,
            linkUrl: true,
            orderIndex: true,
          },
        },
        products: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            compareAtPrice: true,
            imageUrl: true,
            category: true,
            sku: true,
            barcode: true,
            stock: true,
            isActive: true,
            hideWhenOutOfStock: true,
            instagramPostUrl: true,
            variants: {
              select: {
                id: true,
                name: true,
                sku: true,
                barcode: true,
                priceDiff: true,
                stock: true,
              },
            },
          },
        },
      },
    });

    if (!store) {
      return NextResponse.json({ error: 'Mağaza bulunamadı' }, { status: 404 });
    }

    return NextResponse.json(store);
  } catch (error) {
    console.error('GET /api/store/[slug] error:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

/**
 * PATCH /api/store/[slug] - Mağaza Ayarlarını Güncelleme
 * GÜVENLİK: Yalnızca doğrulanmış ve bu mağazanın sahibi olan satıcı oturumu ile çalışır (IDOR Önleme).
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    if (!verifyCsrfOrigin(req)) {
      return csrfErrorResponse();
    }

    const { slug } = await params;
    const session = await getSellerSession();

    if (!session || session.slug !== slug) {
      return NextResponse.json(
        { error: 'Yetkisiz erişim. Mağaza ayarlarını sadece mağaza sahibi güncelleyebilir.' },
        { status: 403 }
      );
    }

    const body = await req.json();

    const updated = await prisma.store.update({
      where: { id: session.storeId },
      data: {
        name: body.name ? String(body.name).slice(0, 100) : undefined,
        tagline: body.tagline !== undefined ? (body.tagline ? String(body.tagline).slice(0, 200) : null) : undefined,
        description: body.description !== undefined ? (body.description ? String(body.description).slice(0, 1000) : null) : undefined,
        whatsappPhone: body.whatsappPhone ? String(body.whatsappPhone).replace(/\D/g, '').slice(0, 15) : undefined,
        instagramHandle: body.instagramHandle !== undefined ? (body.instagramHandle ? String(body.instagramHandle).replace(/^@/, '').slice(0, 50) : '') : undefined,
        shippingFee: body.shippingFee !== undefined ? Math.max(0, Number(body.shippingFee)) : undefined,
        freeShippingThreshold: body.freeShippingThreshold !== undefined ? Math.max(0, Number(body.freeShippingThreshold)) : undefined,
        address: body.address !== undefined ? (body.address ? String(body.address).slice(0, 300) : null) : undefined,
        allowStorePickup: body.allowStorePickup !== undefined ? Boolean(body.allowStorePickup) : undefined,
        ibanInfo: body.ibanInfo !== undefined ? (body.ibanInfo ? String(body.ibanInfo).slice(0, 150) : null) : undefined,
      },
      select: {
        id: true,
        slug: true,
        name: true,
        tagline: true,
        description: true,
        whatsappPhone: true,
        instagramHandle: true,
        shippingFee: true,
        freeShippingThreshold: true,
        address: true,
        allowStorePickup: true,
        ibanInfo: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PATCH /api/store/[slug] error:', error);
    return NextResponse.json({ error: 'Mağaza güncellenemedi' }, { status: 500 });
  }
}
