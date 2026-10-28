import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureDemoStore } from '@/lib/ensureSeed';
import { getAdminSession } from '@/lib/auth';
import { verifyCsrfOrigin, csrfErrorResponse } from '@/lib/csrf';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const RESERVED_SLUGS = [
  'admin',
  'api',
  'login',
  'panel',
  '_next',
  'public',
  'uploads',
  'auth',
  'favicon.ico',
];

export async function GET(req: Request) {
  try {
    // ÇİFT KATMANLI KONTROL: Route handler içinde admin oturumu doğrula
    const isAdmin = await getAdminSession();
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Yetkisiz erişim. Süper admin girişi gereklidir.' },
        { status: 401 }
      );
    }

    await ensureDemoStore();

    const stores = await prisma.store.findMany({
      select: {
        id: true,
        slug: true,
        name: true,
        tagline: true,
        whatsappPhone: true,
        instagramHandle: true,
        themeColor: true,
        mustChangePin: true,
        isActive: true,
        createdAt: true,
        // DİKKAT: pinCode ve pinHash ASLA SEÇİLMEZ (Veri Sızıntısı Koruması)
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
        mustChangePin: s.mustChangePin,
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
    if (!verifyCsrfOrigin(req)) {
      return csrfErrorResponse();
    }

    // ÇİFT KATMANLI KONTROL: Route handler içinde admin oturumu doğrula
    const isAdmin = await getAdminSession();
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Yetkisiz işlem. Süper admin girişi gereklidir.' },
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

    const cleanSlug = String(slug)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_-]/g, '');

    // Rezerve slug kontrolü
    if (RESERVED_SLUGS.includes(cleanSlug)) {
      return NextResponse.json(
        { error: `"${cleanSlug}" sistem tarafından rezerve edilmiş bir isimdir. Lütfen başka bir link seçin.` },
        { status: 400 }
      );
    }

    const existing = await prisma.store.findUnique({
      where: { slug: cleanSlug },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Bu mağaza linki (slug) zaten kullanımda' },
        { status: 400 }
      );
    }

    const cleanPhone = String(whatsappPhone).replace(/\D/g, '');

    // Rastgele 6 haneli geçici PIN üret
    const temporaryPin = crypto.randomInt(100000, 999999).toString();
    const pinHash = await bcrypt.hash(temporaryPin, 10);

    const newStore = await prisma.store.create({
      data: {
        slug: cleanSlug,
        name: String(name).slice(0, 100).trim(),
        tagline: tagline ? String(tagline).slice(0, 200).trim() : null,
        description: `${name} resmi online Instagram bio sipariş kataloğu.`,
        themeColor: themeColor || '#3c302a',
        whatsappPhone: cleanPhone.startsWith('90') ? cleanPhone : `90${cleanPhone.replace(/^0/, '')}`,
        instagramHandle: (instagramHandle || cleanSlug).replace(/^@/, '').trim().slice(0, 50),
        pinCode: temporaryPin, // 1. aşama uyumluluğu için korunuyor
        pinHash: pinHash,
        pinVersion: 1,
        mustChangePin: true, // Yeni mağaza ilk girişte PIN değiştirmek zorunda
        shippingFee: Number(shippingFee ?? 49.9),
        freeShippingThreshold: Number(freeShippingThreshold ?? 750),
        address: address ? String(address).slice(0, 300).trim() : null,
        allowStorePickup: allowStorePickup !== false,
        stories: {
          create: [
            {
              title: 'Yeni Sezon',
              imageUrl:
                'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=400&q=80',
              orderIndex: 1,
            },
            {
              title: 'Kombinler',
              imageUrl:
                'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=400&q=80',
              orderIndex: 2,
            },
            {
              title: 'Keten Seri',
              imageUrl:
                'https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=400&q=80',
              orderIndex: 3,
            },
          ],
        },
      },
      select: {
        id: true,
        slug: true,
        name: true,
        whatsappPhone: true,
        instagramHandle: true,
      },
    });

    // Geçici PIN admine sadece bu yanıtta BİR KEZ gösterilir!
    return NextResponse.json(
      {
        ...newStore,
        temporaryPin,
        message: 'Mağaza açıldı. Geçici PIN satıcıya ilk girişte değiştirmesi için iletilmelidir.',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/admin/stores error:', error);
    return NextResponse.json({ error: 'Yeni mağaza açılamadı' }, { status: 500 });
  }
}
