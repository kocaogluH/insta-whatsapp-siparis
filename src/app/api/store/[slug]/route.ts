import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureDemoStore } from '@/lib/ensureSeed';
import { getSellerSession } from '@/lib/auth';
import { verifyCsrfOrigin, csrfErrorResponse } from '@/lib/csrf';
import { storeUpdateSchema } from '@/lib/validations';

/**
 * GET /api/store/[slug] - Herkese Açık Vitrin Verisi (Public Catalog)
 * GÜVENLİK & VERİ AZALTMA (DATA MINIMIZATION):
 * - pinCode, pinHash, ibanInfo, müşteri siparişleri ASLA DÖNMEZ!
 * - sku, barcode ve tam stok sayıları kaldırılmıştır.
 * - Müşteriye yalnızca inStock (boolean) ve lowStock (boolean: stok <= 3) döndürülür.
 * - Mağazanın iç veritabanı ID'si (UUID) gizlenmiştir, slug kullanılır.
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
        // DİKKAT: id, pinCode, pinHash, ibanInfo ve orders BİLEREK SEÇİLMEMİŞTİR
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
            stock: true, // Sunucuda inStock / lowStock hesaplamak için seçilir, istemciye gönderilmez
            isActive: true,
            hideWhenOutOfStock: true,
            instagramPostUrl: true,
            variants: {
              select: {
                id: true,
                name: true,
                priceDiff: true,
                stock: true, // Sunucuda hesaplanır, istemciye gönderilmez
              },
            },
          },
        },
      },
    });

    if (!store) {
      return NextResponse.json({ error: 'Mağaza bulunamadı' }, { status: 404 });
    }

    // Veri Azaltma: Ham stok, SKU, Barkod ve İç ID'leri filtrele
    const sanitizedProducts = store.products.map((p) => {
      const inStock = p.stock > 0;
      const lowStock = p.stock > 0 && p.stock <= 3;

      const sanitizedVariants = p.variants.map((v) => ({
        id: v.id,
        name: v.name,
        priceDiff: v.priceDiff,
        inStock: v.stock > 0,
        lowStock: v.stock > 0 && v.stock <= 3,
      }));

      return {
        id: p.id,
        name: p.name,
        description: p.description,
        price: p.price,
        compareAtPrice: p.compareAtPrice,
        imageUrl: p.imageUrl,
        category: p.category,
        isActive: p.isActive,
        hideWhenOutOfStock: p.hideWhenOutOfStock,
        instagramPostUrl: p.instagramPostUrl,
        inStock,
        lowStock,
        variants: sanitizedVariants,
      };
    });

    const publicStore = {
      slug: store.slug,
      name: store.name,
      tagline: store.tagline,
      description: store.description,
      logoUrl: store.logoUrl,
      bannerUrl: store.bannerUrl,
      themeColor: store.themeColor,
      whatsappPhone: store.whatsappPhone,
      instagramHandle: store.instagramHandle,
      shippingFee: store.shippingFee,
      freeShippingThreshold: store.freeShippingThreshold,
      address: store.address,
      allowStorePickup: store.allowStorePickup,
      stories: store.stories,
      products: sanitizedProducts,
    };

    return NextResponse.json(publicStore);
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
    const parseResult = storeUpdateSchema.safeParse(body);
    if (!parseResult.success) {
      const err = parseResult.error.issues[0]?.message || 'Geçersiz güncelleme verisi.';
      return NextResponse.json({ error: err }, { status: 400 });
    }

    const data = parseResult.data;

    const updated = await prisma.store.update({
      where: { id: session.storeId },
      data: {
        name: data.name,
        tagline: data.tagline,
        description: data.description,
        whatsappPhone: data.whatsappPhone,
        instagramHandle: data.instagramHandle,
        shippingFee: data.shippingFee,
        freeShippingThreshold: data.freeShippingThreshold,
        address: data.address,
        allowStorePickup: data.allowStorePickup,
        ibanInfo: data.ibanInfo,
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
