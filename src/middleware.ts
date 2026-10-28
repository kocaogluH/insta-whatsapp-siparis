import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const ADMIN_COOKIE_NAME = 'admin_session';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. /api/admin/* rotalarını koru (login hariç)
  if (pathname.startsWith('/api/admin') && pathname !== '/api/admin/login') {
    const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json(
        { error: 'Yetkisiz erişim. Süper admin girişi gereklidir.' },
        { status: 401 }
      );
    }

    try {
      const secret = process.env.SESSION_SECRET;
      if (!secret) {
        return NextResponse.json(
          { error: 'Sunucu yapılandırma hatası.' },
          { status: 500 }
        );
      }
      const encodedSecret = new TextEncoder().encode(secret.trim());
      const { payload } = await jwtVerify(token, encodedSecret);

      if (payload.role !== 'admin') {
        return NextResponse.json(
          { error: 'Yetkisiz rol.' },
          { status: 403 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: 'Geçersiz veya süresi dolmuş admin oturumu.' },
        { status: 401 }
      );
    }
  }

  // 2. CSRF Origin Kontrolü: Veri değiştiren isteklerde Origin başlığını denetle
  const method = request.method.toUpperCase();
  if (['POST', 'PATCH', 'DELETE', 'PUT'].includes(method)) {
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');

    if (origin && host) {
      try {
        const originUrl = new URL(origin);
        if (originUrl.host !== host) {
          return NextResponse.json(
            { error: 'CSRF koruması: İstek kaynağı (Origin) eşleşmiyor.' },
            { status: 403 }
          );
        }
      } catch {
        return NextResponse.json(
          { error: 'CSRF koruması: Geçersiz Origin başlığı.' },
          { status: 403 }
        );
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/admin/:path*', '/api/products/:path*', '/api/orders/:path*', '/api/store/:path*', '/api/upload'],
};
