import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSellerSession } from '@/lib/auth';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const session = await getSellerSession();

    if (!session || session.slug !== slug) {
      return NextResponse.json(
        { error: 'Yetkisiz erişim. Lütfen satıcı girişi yapın.' },
        { status: 401 }
      );
    }

    const store = await prisma.store.findUnique({
      where: { id: session.storeId },
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
        ibanInfo: true,
        mustChangePin: true,
        isActive: true,
        createdAt: true,
        products: {
          include: { variants: true },
          orderBy: { createdAt: 'desc' },
        },
        orders: {
          include: { items: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!store || !store.isActive) {
      return NextResponse.json(
        { error: 'Mağaza bulunamadı veya pasif.' },
        { status: 404 }
      );
    }

    const mappedProducts = store.products.map((p) => {
      let parsedImages: string[] = [];
      if (p.images) {
        try {
          const arr = JSON.parse(p.images);
          if (Array.isArray(arr) && arr.length > 0) {
            parsedImages = arr;
          }
        } catch {}
      }
      if (parsedImages.length === 0 && p.imageUrl) {
        parsedImages = [p.imageUrl];
      }
      return {
        ...p,
        images: parsedImages,
      };
    });

    return NextResponse.json({
      ...store,
      products: mappedProducts,
    });
  } catch (error) {
    console.error('GET /api/store/[slug]/panel-data error:', error);
    return NextResponse.json(
      { error: 'Panel verileri alınırken bir hata oluştu.' },
      { status: 500 }
    );
  }
}
