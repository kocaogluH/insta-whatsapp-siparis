import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { createSellerToken, setSellerSessionCookie } from '@/lib/auth';
import { verifyCsrfOrigin, csrfErrorResponse } from '@/lib/csrf';
import { getClientIp, checkLoginLock, recordFailedLogin, clearFailedLogins } from '@/lib/ratelimit';

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
    const lockKey = `${ip}:${slug}`;

    // 1. Kilit Kontrolü (5 Hatalı denemede 15 dakika kilit)
    const lockStatus = await checkLoginLock(lockKey);
    if (lockStatus.isLocked) {
      const remainingMin = Math.ceil(lockStatus.remainingSeconds / 60);
      return NextResponse.json(
        {
          error: `Çok fazla hatalı PIN denemesi yapıldı. Güvenlik nedeniyle hesabınız ${remainingMin} dakika kilitlendi.`,
        },
        { status: 429 }
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

    const store = await prisma.store.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        pinHash: true,
        pinCode: true,
        pinVersion: true,
        mustChangePin: true,
        isActive: true,
      },
    });

    if (!store || !store.isActive) {
      // Zaman-güvenli dummy hash kontrolü
      await bcrypt.compare(pin, '$2b$10$abcdefghijklmnopqrstuuNOPQRSTUVWXYZ1234567890dummyhash');
      const failResult = await recordFailedLogin(lockKey);
      if (failResult.isLocked) {
        return NextResponse.json(
          { error: 'Çok fazla hatalı PIN denemesi yapıldı. Güvenlik nedeniyle hesabınız 15 dakika kilitlendi.' },
          { status: 429 }
        );
      }
      return NextResponse.json(
        { error: 'Geçersiz giriş bilgileri.' },
        { status: 401 }
      );
    }

    // pinHash varsa onunla, yoksa pinCode ile doğrula
    let isValid = false;
    if (store.pinHash) {
      isValid = await bcrypt.compare(pin, store.pinHash);
    } else if (store.pinCode) {
      isValid = pin === store.pinCode;
      if (isValid) {
        const hash = await bcrypt.hash(pin, 10);
        await prisma.store.update({
          where: { id: store.id },
          data: { pinHash: hash },
        });
      }
    }

    if (!isValid) {
      const failResult = await recordFailedLogin(lockKey);
      if (failResult.isLocked) {
        return NextResponse.json(
          { error: 'Çok fazla hatalı PIN denemesi yapıldı. Güvenlik nedeniyle hesabınız 15 dakika kilitlendi.' },
          { status: 429 }
        );
      }
      return NextResponse.json(
        {
          error: `Geçersiz PIN kodu. Kalan deneme hakkı: ${failResult.remainingAttempts}`,
        },
        { status: 401 }
      );
    }

    // Başarılı giriş: Hatalı deneme sayacını sıfırla
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
