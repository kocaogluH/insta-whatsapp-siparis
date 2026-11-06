import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { createSellerToken, setSellerSessionCookie } from '@/lib/auth';
import { verifyCsrfOrigin, csrfErrorResponse } from '@/lib/csrf';
import { getClientIp, consumeLoginAttempt, clearFailedLogins } from '@/lib/ratelimit';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    if (!verifyCsrfOrigin(req)) {
      return csrfErrorResponse();
    }

    const { slug } = await params;
    const ip = getClientIp(req);
    const lockKey = `store:${slug}:${ip}`;

    // (1) redis.incr ile deneme hakkı al
    const attemptResult = await consumeLoginAttempt(lockKey);
    if (attemptResult.failClosed) {
      return NextResponse.json(
        { error: 'Güvenlik doğrulama servisine şu anda erişilemiyor. Lütfen daha sonra tekrar deneyin.' },
        { status: 503 }
      );
    }

    // (2) Sayaç > limit ise doğrulamaya girmeden 429 dön
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

    const body = await req.json();
    const { pin } = body;

    if (!pin || typeof pin !== 'string') {
      return NextResponse.json(
        { error: 'Geçersiz giriş bilgileri' },
        { status: 400 }
      );
    }

    // (3) Ancak ondan sonra şifre/PIN doğrula
    const store = await prisma.store.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        pinHash: true,
        pinVersion: true,
        mustChangePin: true,
        isActive: true,
      },
    });

    if (!store || !store.isActive || !store.pinHash) {
      // Zaman-güvenli dummy hash kontrolü
      await bcrypt.compare(pin, '$2b$10$abcdefghijklmnopqrstuuNOPQRSTUVWXYZ1234567890dummyhash');

      if (attemptResult.attempts >= 5) {
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

      return NextResponse.json(
        { error: `Geçersiz giriş bilgileri. Kalan deneme hakkı: ${attemptResult.remainingAttempts}` },
        { status: 401 }
      );
    }

    // pinHash ile güvenli bcrypt doğrulaması
    const isValid = await bcrypt.compare(pin, store.pinHash);

    if (!isValid) {
      if (attemptResult.attempts >= 5) {
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

      return NextResponse.json(
        {
          error: `Geçersiz PIN kodu. Kalan deneme hakkı: ${attemptResult.remainingAttempts}`,
        },
        { status: 401 }
      );
    }

    // (4) Doğruysa clearFailedLogins ile sayacı sıfırla
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
