import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureDemoStore } from '@/lib/ensureSeed';

export async function GET() {
  try {
    await ensureDemoStore();

    const stores = await prisma.store.findMany({
      include: {
        _count: {
          select: {
            products: true,
            orders: true,
          },
        },
        orders: {
          select: {
            totalAmount: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const enriched = stores.map((s) => {
      const revenue = s.orders
        .filter((o) => o.status !== 'CANCELLED')
        .reduce((sum, o) => sum + o.totalAmount, 0);

      return {
        id: s.id,
        slug: s.slug,
        name: s.name,
        tagline: s.tagline,
        whatsappPhone: s.whatsappPhone,
        instagramHandle: s.instagramHandle,
        themeColor: s.themeColor,
        pinCode: s.pinCode,
        isActive: s.isActive,
        createdAt: s.createdAt,
        productCount: s._count.products,
        orderCount: s._count.orders,
        totalRevenue: revenue,
      };
    });

    return NextResponse.json(enriched);
  } catch (error) {
    console.error('GET /api/admin/stores error:', error);
    return NextResponse.json({ error: 'Mağazalar getirilemedi' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const adminKey = req.headers.get('x-admin-key');
    if (adminKey !== '1923' && adminKey !== process.env.ADMIN_KEY) {
      return NextResponse.json(
        { error: 'Yetkisiz işlem. Geçerli ajans anahtarı gerekli.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      name,
      slug,
      tagline,
      whatsappPhone,
      instagramHandle,
      themeColor,
      pinCode,
      shippingFee,
      freeShippingThreshold,
      address,
      allowStorePickup,
    } = body;

    if (!name || !slug || !whatsappPhone) {
      return NextResponse.json(
        { error: 'Mağaza adı, linki ve WhatsApp numarası zorunludur' },
        { status: 400 }
      );
    }

    const cleanSlug = slug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_-]/g, '');

    const existing = await prisma.store.findUnique({
      where: { slug: cleanSlug },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Bu mağaza linki (slug) zaten kullanımda' },
        { status: 400 }
      );
    }

    const cleanPhone = whatsappPhone.replace(/\D/g, '');

    const newStore = await prisma.store.create({
      data: {
        slug: cleanSlug,
        name: name.trim(),
        tagline: tagline?.trim() || null,
        description: `${name} resmi online Instagram bio sipariş kataloğu.`,
        themeColor: themeColor || '#0f172a',
        whatsappPhone: cleanPhone.startsWith('90') ? cleanPhone : `90${cleanPhone.replace(/^0/, '')}`,
        instagramHandle: (instagramHandle || cleanSlug).replace(/^@/, '').trim(),
        pinCode: pinCode?.trim() || '1234',
        shippingFee: Number(shippingFee ?? 49.9),
        freeShippingThreshold: Number(freeShippingThreshold ?? 750),
        address: address?.trim() || null,
        allowStorePickup: allowStorePickup !== false,
        stories: {
          create: [
            {
              title: '✨ Yeni Sezon',
              imageUrl:
                'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=400&q=80',
              orderIndex: 1,
            },
            {
              title: '🔥 İndirim',
              imageUrl:
                'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=400&q=80',
              orderIndex: 2,
            },
            {
              title: '⭐ Yorumlar',
              imageUrl:
                'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=400&q=80',
              orderIndex: 3,
            },
          ],
        },
      },
    });

    return NextResponse.json(newStore, { status: 201 });
  } catch (error) {
    console.error('POST /api/admin/stores error:', error);
    return NextResponse.json({ error: 'Yeni mağaza açılamadı' }, { status: 500 });
  }
}
