import { NextResponse } from 'next/server';

/**
 * Veri değiştiren (POST, PATCH, DELETE, PUT) isteklerde CSRF Origin doğrulaması yapar.
 * Tarayıcıdan gelen Origin başlığını Host başlığı ile karşılaştırır.
 * Uyuşmazlık varsa isteği engeller.
 */
export function verifyCsrfOrigin(req: Request): boolean {
  const method = req.method.toUpperCase();
  if (!['POST', 'PATCH', 'DELETE', 'PUT'].includes(method)) {
    return true; // Güvenli okuma metodları
  }

  const origin = req.headers.get('origin');
  const host = req.headers.get('host');

  if (!host) {
    return false;
  }

  if (origin) {
    try {
      const originUrl = new URL(origin);
      // Host ile Origin host eşleşmeli (port dahil)
      return originUrl.host === host;
    } catch {
      return false;
    }
  }

  // Bazı eski veya mobil tarayıcılarda referer kontrolü
  const referer = req.headers.get('referer');
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      return refererUrl.host === host;
    } catch {
      return false;
    }
  }

  // Hem origin hem referer yoksa ve browser ise şüpheli kabul et
  const secFetchSite = req.headers.get('sec-fetch-site');
  if (secFetchSite && secFetchSite === 'cross-site') {
    return false;
  }

  return true;
}

export function csrfErrorResponse() {
  return NextResponse.json(
    { error: 'Geçersiz veya yetkisiz istek kaynağı (CSRF engellendi)' },
    { status: 403 }
  );
}
