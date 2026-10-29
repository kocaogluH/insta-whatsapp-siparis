import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const ADMIN_COOKIE_NAME = 'admin_session';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. /admin HTML Sayfaları Koruması
  if (pathname.startsWith('/admin')) {
    const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
    let isValidAdmin = false;

    if (token) {
      try {
        const secret = process.env.SESSION_SECRET;
        if (secret && secret.trim().length >= 32) {
          const encodedSecret = new TextEncoder().encode(secret.trim());
          const { payload } = await jwtVerify(token, encodedSecret);
          if (payload.role === 'admin') {
            isValidAdmin = true;
          }
        }
      } catch {
        isValidAdmin = false;
      }
    }

    // /admin/login sayfası: Zaten admin oturumu varsa doğrudan /admin'e yönlendir
    if (pathname === '/admin/login') {
      if (isValidAdmin) {
        return NextResponse.redirect(new URL('/admin', request.url), 302);
      }
      return NextResponse.next();
    }

    // Diğer tüm /admin sayfaları: Geçerli admin oturumu yoksa anında /admin/login'e 302 ile yönlendir
    // Panel HTML'i veya verisi asla istemciye ulaşmaz!
    if (!isValidAdmin) {
      return NextResponse.redirect(new URL('/admin/login', request.url), 302);
    }
  }

  // 2. /api/admin/* API rotalarını koru (login hariç)
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
      if (!secret || secret.trim().length < 32) {
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

  // 3. CSRF Origin Kontrolü: Veri değiştiren isteklerde Origin başlığını denetle
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
  matcher: [
    '/admin',
    '/admin/:path*',
    '/api/admin/:path*',
    '/api/products/:path*',
    '/api/orders/:path*',
    '/api/store/:path*',
    '/api/upload',
  ],
};
