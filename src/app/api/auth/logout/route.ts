import { NextResponse } from 'next/server';
import { clearAuthCookies } from '@/lib/auth';
import { verifyCsrfOrigin, csrfErrorResponse } from '@/lib/csrf';

export async function POST(req: Request) {
  try {
    if (!verifyCsrfOrigin(req)) {
      return csrfErrorResponse();
    }

    await clearAuthCookies();

    return NextResponse.json({
      success: true,
      message: 'Oturum başarıyla sonlandırıldı',
    });
  } catch (error) {
    console.error('POST /api/auth/logout error:', error);
    return NextResponse.json(
      { error: 'Çıkış yapılırken bir hata oluştu' },
      { status: 500 }
    );
  }
}
