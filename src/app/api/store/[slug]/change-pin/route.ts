import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { getSellerSession, createSellerToken, setSellerSessionCookie } from '@/lib/auth';
import { verifyCsrfOrigin, csrfErrorResponse } from '@/lib/csrf';
import { getClientIp, pinChangeLimiter, clearFailedLogins } from '@/lib/ratelimit';

export async function POST(
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
        { error: 'Yetkisiz erişim. Lütfen önce satıcı paneline giriş yapın.' },
        { status: 401 }
      );
    }

    // 1. Hız Sınırı Kontrolü (IP + Mağaza başına 15 dakikada en fazla 5 deneme)
    const ip = getClientIp(req);
    const rateLimitKey = `${ip}:${slug}`;
    const limitResult = await pinChangeLimiter.limit(rateLimitKey);

    if (!limitResult.success) {
      return NextResponse.json(
        { error: 'Çok fazla PIN değiştirme denemesi yapıldı. Lütfen 15 dakika sonra tekrar deneyin.' },
        {
          status: 429,
          headers: {
            'Retry-After': '900',
          },
        }
      );
    }

    const body = await req.json();
    const { currentPin, newPin, confirmNewPin } = body;

    // 2. Girdi Doğrulamaları
    if (!currentPin || typeof currentPin !== 'string') {
      return NextResponse.json(
        { error: 'Mevcut PIN kodunuzu girmelisiniz.' },
        { status: 400 }
      );
    }

    if (!newPin || typeof newPin !== 'string' || newPin.trim().length < 6) {
      return NextResponse.json(
        { error: 'Yeni PIN kodu en az 6 haneden oluşmalıdır.' },
        { status: 400 }
      );
    }

    if (newPin !== confirmNewPin) {
      return NextResponse.json(
        { error: 'Yeni PIN kodu ile tekrarı birbiriyle eşleşmiyor.' },
        { status: 400 }
      );
    }

    const cleanNewPin = newPin.trim();
    const cleanCurrentPin = currentPin.trim();

    // Yeni PIN eski PIN ile aynı olamaz
    if (cleanNewPin === cleanCurrentPin) {
      return NextResponse.json(
        { error: 'Yeni PIN kodu eski PIN kodunuz ile aynı olamaz.' },
        { status: 400 }
      );
    }

    // 3. Mevcut PIN Doğrulaması (bcrypt.compare)
    const store = await prisma.store.findUnique({
      where: { id: session.storeId },
      select: {
        id: true,
        slug: true,
        pinHash: true,
        pinVersion: true,
      },
    });

    if (!store || !store.pinHash) {
      return NextResponse.json(
        { error: 'Mağaza bulunamadı.' },
        { status: 404 }
      );
    }

    const isCurrentValid = await bcrypt.compare(cleanCurrentPin, store.pinHash);
    if (!isCurrentValid) {
      return NextResponse.json(
        { error: 'Mevcut PIN kodunuz hatalı.' },
        { status: 401 }
      );
    }

    // 4. Yeni PIN'i bcrypt ile hash'le ve veritabanını güncelle
    const newHash = await bcrypt.hash(cleanNewPin, 10);

    const updatedStore = await prisma.store.update({
      where: { id: store.id },
      data: {
        pinHash: newHash,
        pinVersion: { increment: 1 },
        mustChangePin: false,
      },
      select: {
        id: true,
        slug: true,
        pinVersion: true,
      },
    });

    // Başarılı PIN değişiminde olası hatalı giriş sayaçlarını temizle
    await clearFailedLogins(`store:${store.slug}:${ip}`);

    // Güncel pinVersion ile yeni JWT üret ve httpOnly çerezi tazele
    const newToken = await createSellerToken({
      storeId: updatedStore.id,
      slug: updatedStore.slug,
      role: 'seller',
      pinVersion: updatedStore.pinVersion,
    });

    await setSellerSessionCookie(newToken);

    return NextResponse.json({
      success: true,
      message: 'PIN kodunuz başarıyla güncellendi.',
    });
  } catch (error) {
    console.error('POST /api/store/[slug]/change-pin error:', error);
    return NextResponse.json(
      { error: 'PIN güncellenirken bir hata oluştu.' },
      { status: 500 }
    );
  }
}
