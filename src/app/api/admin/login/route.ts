import { NextResponse } from 'next/server';
import { verifyAdminPassword, createAdminToken, setAdminSessionCookie } from '@/lib/auth';
import { verifyCsrfOrigin, csrfErrorResponse } from '@/lib/csrf';
import { getClientIp, consumeLoginAttempt, clearFailedLogins } from '@/lib/ratelimit';

export async function POST(req: Request) {
  try {
    if (!verifyCsrfOrigin(req)) {
      return csrfErrorResponse();
    }

    const ip = getClientIp(req);
    const lockKey = `admin:${ip}`;

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

    // (3) Ancak ondan sonra şifre/PIN doğrula
    const isValid = verifyAdminPassword(password);

    if (!isValid) {
      // 5. deneme de hatalıysa doğrudan kilit mesajı ve 429 dön
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
          error: `Geçersiz yönetici bilgileri. Kalan deneme hakkı: ${attemptResult.remainingAttempts}`,
        },
        { status: 401 }
      );
    }

    // (4) Doğruysa clearFailedLogins ile sayacı sıfırla
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
