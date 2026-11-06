import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { getSellerSession, createSellerToken, setSellerSessionCookie } from '@/lib/auth';
import { verifyCsrfOrigin, csrfErrorResponse } from '@/lib/csrf';
import {
  getClientIp,
  pinChangeLimiter,
  checkGlobalStoreLock,
  recordGlobalStoreFail,
  clearFailedLogins,
} from '@/lib/ratelimit';

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

    // 1. seller_session Doğrulaması (Eksikse 401, Slug uyuşmuyorsa 403)
    if (!session) {
      return NextResponse.json(
        { error: 'Yetkisiz erişim. Lütfen önce satıcı paneline giriş yapın.' },
        { status: 401 }
      );
    }

    if (session.slug !== slug) {
      return NextResponse.json(
        { error: 'Erişim engellendi. Bu mağaza için işlem yapma yetkiniz yok.' },
        { status: 403 }
      );
    }

    // 2. Butik Başına Global Kilit Kontrolü ("store:${slug}:global", saatte 30 limit)
    const globalLockStatus = await checkGlobalStoreLock(slug);
    if (globalLockStatus.failClosed) {
      return NextResponse.json(
        { error: 'Güvenlik doğrulama servisine şu anda erişilemiyor. Lütfen daha sonra tekrar deneyin.' },
        { status: 503 }
      );
    }

    if (globalLockStatus.isLocked) {
      const retryAfter = globalLockStatus.remainingSeconds > 0 ? globalLockStatus.remainingSeconds : 900;
      return NextResponse.json(
        { error: 'Çok fazla deneme. 15 dakika sonra tekrar deneyin.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfter),
          },
        }
      );
    }

    // 3. IP + Mağaza Başına Hız Sınırı (15 dakikada en fazla 5 PIN değiştirme denemesi)
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

    // 4. Girdi Doğrulamaları
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

    // 5. Mevcut PIN Doğrulaması (bcrypt.compare)
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
      // Yanlış mevcut PIN denemeleri login uç noktasıyla paylaşılan global sayaca ("store:${slug}:global") işlenir
      const globalFailResult = await recordGlobalStoreFail(slug);

      if (globalFailResult.isLocked) {
        return NextResponse.json(
          { error: 'Çok fazla deneme. 15 dakika sonra tekrar deneyin.' },
          {
            status: 429,
            headers: {
              'Retry-After': String(globalFailResult.remainingSeconds || 900),
            },
          }
        );
      }

      return NextResponse.json(
        { error: 'Mevcut PIN kodunuz hatalı.' },
        { status: 401 }
      );
    }

    // 6. Yeni PIN'i bcrypt ile hash'le ve veritabanını güncelle
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

    // Başarılı PIN değişiminde kullanıcının IP bazlı kilit sayaçlarını temizle
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
