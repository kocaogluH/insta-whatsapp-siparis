import { NextResponse } from 'next/server';
import { verifyAdminPassword, createAdminToken, setAdminSessionCookie } from '@/lib/auth';
import { verifyCsrfOrigin, csrfErrorResponse } from '@/lib/csrf';
import { getClientIp, checkLoginLock, recordFailedLogin, clearFailedLogins } from '@/lib/ratelimit';

export async function POST(req: Request) {
  try {
    if (!verifyCsrfOrigin(req)) {
      return csrfErrorResponse();
    }

    const ip = getClientIp(req);
    const lockKey = `admin:${ip}`;

    // 1. Kilit Kontrolü
    const lockStatus = await checkLoginLock(lockKey);
    if (lockStatus.failClosed) {
      return NextResponse.json(
        { error: 'Güvenlik doğrulama servisine şu anda erişilemiyor. Lütfen daha sonra tekrar deneyin.' },
        { status: 503 }
      );
    }

    if (lockStatus.isLocked) {
      const retryAfter = lockStatus.remainingSeconds > 0 ? lockStatus.remainingSeconds : 900;
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

    const body = await req.json();
    const { password } = body;

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'Geçersiz yönetici bilgileri' },
        { status: 400 }
      );
    }

    // ADMIN_PASSWORD ortam değişkeni kontrolü
    if (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD.trim().length === 0) {
      return NextResponse.json(
        { error: 'Sunucu yapılandırma hatası: ADMIN_PASSWORD ortam değişkeni tanımlanmamış.' },
        { status: 500 }
      );
    }

    // crypto.timingSafeEqual ile zaman-güvenli şifre karşılaştırması
    const isValid = verifyAdminPassword(password);

    if (!isValid) {
      const failResult = await recordFailedLogin(lockKey);
      if (failResult.failClosed) {
        return NextResponse.json(
          { error: 'Güvenlik doğrulama servisine şu anda erişilemiyor. Lütfen daha sonra tekrar deneyin.' },
          { status: 503 }
        );
      }

      if (failResult.isLocked) {
        const retryAfter = failResult.remainingSeconds > 0 ? failResult.remainingSeconds : 900;
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
          error: `Geçersiz yönetici bilgileri. Kalan deneme hakkı: ${failResult.remainingAttempts}`,
        },
        { status: 401 }
      );
    }

    // Başarılı giriş: Hatalı deneme sayacını sıfırla
    await clearFailedLogins(lockKey);

    // 2 saatlik admin JWT oluştur ve httpOnly çereze yaz
    const token = await createAdminToken();
    await setAdminSessionCookie(token);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST /api/admin/login error:', error);
    return NextResponse.json(
      { error: 'Giriş işlemi sırasında hata oluştu' },
      { status: 500 }
    );
  }
}
