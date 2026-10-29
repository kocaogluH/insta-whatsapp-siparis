import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureDemoStore } from '@/lib/ensureSeed';
import { getAdminSession } from '@/lib/auth';
import { verifyCsrfOrigin, csrfErrorResponse } from '@/lib/csrf';
import { getClientIp, storeCreateLimiter } from '@/lib/ratelimit';
import { storeCreateSchema } from '@/lib/validations';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export async function GET() {
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

    // 1. Admin Oturumu Doğrulama
    const isAdmin = await getAdminSession();
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Yetkisiz işlem. Süper admin girişi gereklidir.' },
        { status: 401 }
      );
    }

    // 2. Hız Sınırı Kontrolü (Saatte en fazla 5 mağaza açma)
    const ip = getClientIp(req);
    const limitResult = await storeCreateLimiter.limit(ip);
    if (!limitResult.success) {
      return NextResponse.json(
        { error: 'Kısa süre içinde çok fazla mağaza açma isteği gönderildi. Lütfen daha sonra tekrar deneyin.' },
        { status: 429 }
      );
    }

    const body = await req.json();

    // 3. Zod ile Girdi Doğrulama & Slug Kontrolü
    const parseResult = storeCreateSchema.safeParse(body);
    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0]?.message || 'Geçersiz mağaza bilgileri.';
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const validated = parseResult.data;

    // 4. Benzersiz Slug Kontrolü
    const existing = await prisma.store.findUnique({
      where: { slug: validated.slug },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Bu mağaza linki (slug) zaten kullanımda' },
        { status: 400 }
      );
    }

    const cleanPhone = validated.whatsappPhone.startsWith('90')
      ? validated.whatsappPhone
      : `90${validated.whatsappPhone.replace(/^0/, '')}`;

    // Rastgele 6 haneli geçici PIN üret
    const temporaryPin = crypto.randomInt(100000, 999999).toString();
    const pinHash = await bcrypt.hash(temporaryPin, 10);

    const newStore = await prisma.store.create({
      data: {
        slug: validated.slug,
        name: validated.name,
        tagline: validated.tagline,
        description: `${validated.name} resmi online Instagram bio sipariş kataloğu.`,
        themeColor: validated.themeColor || '#3c302a',
        whatsappPhone: cleanPhone,
        instagramHandle: validated.instagramHandle,
        pinCode: temporaryPin, // 1. aşama uyumluluğu için korunuyor
        pinHash: pinHash,
        pinVersion: 1,
        mustChangePin: true, // Yeni mağaza ilk girişte PIN değiştirmek zorunda
        shippingFee: Number(body.shippingFee ?? 49.9),
        freeShippingThreshold: Number(body.freeShippingThreshold ?? 750),
        address: body.address ? String(body.address).slice(0, 300).trim() : null,
        allowStorePickup: body.allowStorePickup !== false,
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
