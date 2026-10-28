import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getAdminPasswordHash, createAdminToken, setAdminSessionCookie } from '@/lib/auth';
import { verifyCsrfOrigin, csrfErrorResponse } from '@/lib/csrf';

export async function POST(req: Request) {
  try {
    if (!verifyCsrfOrigin(req)) {
      return csrfErrorResponse();
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
      return NextResponse.json(
        { error: 'Geçersiz yönetici bilgileri' },
        { status: 401 }
      );
    }

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
