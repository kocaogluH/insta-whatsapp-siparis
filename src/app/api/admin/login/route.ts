import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getAdminPasswordHash, createAdminToken, setAdminSessionCookie } from '@/lib/auth';
import { verifyCsrfOrigin, csrfErrorResponse } from '@/lib/csrf';
import { getClientIp, checkLoginLock, recordFailedLogin, clearFailedLogins } from '@/lib/ratelimit';

export async function POST(req: Request) {
  try {
    if (!verifyCsrfOrigin(req)) {
      return csrfErrorResponse();
    }

    const ip = getClientIp(req);
    const lockKey = `${ip}:admin`;

    // 1. Kilit Kontrolü
    const lockStatus = await checkLoginLock(lockKey);
    if (lockStatus.isLocked) {
      const remainingMin = Math.ceil(lockStatus.remainingSeconds / 60);
      return NextResponse.json(
        {
          error: `Çok fazla hatalı yönetici girişi denendi. Güvenlik nedeniyle admin paneli ${remainingMin} dakika kilitlendi.`,
        },
        { status: 429 }
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

    // Ortam değişkeninden hash'i al (tanımlı değilse fırlatır)
    const adminHash = getAdminPasswordHash();

    // Zaman-güvenli bcrypt karşılaştırması
    const isValid = await bcrypt.compare(password, adminHash);

    if (!isValid) {
      const failResult = await recordFailedLogin(lockKey);
      if (failResult.isLocked) {
        return NextResponse.json(
          {
            error: 'Çok fazla hatalı yönetici girişi denendi. Güvenlik nedeniyle admin paneli 15 dakika kilitlendi.',
          },
          { status: 429 }
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
