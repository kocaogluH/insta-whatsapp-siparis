import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { createSellerToken, setSellerSessionCookie } from '@/lib/auth';
import { verifyCsrfOrigin, csrfErrorResponse } from '@/lib/csrf';
import {
  getClientIp,
  consumeLoginAttempt,
  checkGlobalStoreLock,
  recordGlobalStoreFail,
  clearFailedLogins,
} from '@/lib/ratelimit';

const SLUG_REGEX = /^[a-z0-9-]{1,40}$/;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    if (!verifyCsrfOrigin(req)) {
      return csrfErrorResponse();
    }

    const { slug } = await params;

    const body = await req.json();
    const { pin } = body;

    if (!pin || typeof pin !== 'string') {
      return NextResponse.json(
        { error: 'Geçersiz giriş bilgileri' },
        { status: 400 }
      );
    }

    // 1. consumeLoginAttempt ÇAĞRILMADAN ÖNCE slug ve mağaza doğrulaması
    // Yalnızca [a-z0-9-] ve en fazla 40 karakter
    const isSlugFormatValid = typeof slug === 'string' && SLUG_REGEX.test(slug);

    const store = isSlugFormatValid
      ? await prisma.store.findUnique({
          where: { slug },
          select: {
            id: true,
            slug: true,
            pinHash: true,
            pinVersion: true,
            mustChangePin: true,
            isActive: true,
          },
        })
      : null;

    // Mağaza yoksa veya inaktifse: Redis'e hiçbir şey yazmadan,
    // aynı süre (dummy hash) ve aynı mesajla 401 dön (var/yok sızmasın)
    if (!store || !store.isActive || !store.pinHash) {
      await bcrypt.compare(pin, '$2b$10$abcdefghijklmnopqrstuuNOPQRSTUVWXYZ1234567890dummyhash');
      return NextResponse.json(
        { error: 'Geçersiz PIN kodu. Kalan deneme hakkı: 4' },
        { status: 401 }
      );
    }

    // 2. IP'den bağımsız, butik başına global kilit kontrolü ("store:${slug}:global", saatte 30 limit)
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

    // 3. IP bazlı atomik deneme hakkı alma (redis.incr)
    const ip = getClientIp(req);
    const lockKey = `store:${slug}:${ip}`;

    const attemptResult = await consumeLoginAttempt(lockKey);
    if (attemptResult.failClosed) {
      return NextResponse.json(
        { error: 'Güvenlik doğrulama servisine şu anda erişilemiyor. Lütfen daha sonra tekrar deneyin.' },
        { status: 503 }
      );
    }

    // Sayaç > 5 ise PIN doğrulamasına girmeden 429 dön
    if (!attemptResult.allowed) {
      return NextResponse.json(
        { error: 'Çok fazla deneme. 15 dakika sonra tekrar deneyin.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(attemptResult.retryAfter || 900),
          },
        }
      );
    }

    // 4. Ancak ondan sonra PIN doğrula
    const isValid = await bcrypt.compare(pin, store.pinHash);

    if (!isValid) {
      // Global mağaza sayacını artır (saatte 30 yanlış deneme aşılırsa 15 dk kilitlenir)
      const globalFailResult = await recordGlobalStoreFail(slug);

      if (globalFailResult.isLocked || attemptResult.attempts >= 5) {
        const retryAfter = globalFailResult.isLocked
          ? globalFailResult.remainingSeconds
          : attemptResult.retryAfter || 900;

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

      return NextResponse.json(
        {
          error: `Geçersiz PIN kodu. Kalan deneme hakkı: ${attemptResult.remainingAttempts}`,
        },
        { status: 401 }
      );
    }

    // 5. Başarılı girişte YALNIZCA IP bazlı sayacı sıfırla
    // Global sayaç ("store:${slug}:global") SIFIRLANMAZ (saldırgan doğru girişle silemez)
    await clearFailedLogins(lockKey);

    // JWT token oluştur ve httpOnly, secure, sameSite=strict çereze yaz
    const token = await createSellerToken({
      storeId: store.id,
      slug: store.slug,
      role: 'seller',
      pinVersion: store.pinVersion,
    });

    await setSellerSessionCookie(token);

    return NextResponse.json({
      success: true,
      mustChangePin: store.mustChangePin,
    });
  } catch (error) {
    console.error('POST /api/store/[slug]/login error:', error);
    return NextResponse.json(
      { error: 'Giriş işlemi sırasında bir hata oluştu' },
      { status: 500 }
    );
  }
}
