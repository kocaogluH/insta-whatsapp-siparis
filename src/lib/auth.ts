import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { prisma } from './prisma';

export const SELLER_COOKIE_NAME = 'seller_session';
export const ADMIN_COOKIE_NAME = 'admin_session';

export interface SellerJwtPayload {
  storeId: string;
  slug: string;
  role: 'seller';
  pinVersion: number;
}

export interface AdminJwtPayload {
  role: 'admin';
}

/**
 * SESSION_SECRET ortam değişkenini doğrular ve Uint8Array döner.
 * Tanımlı değilse veya 32 karakterden kısaysa HATA FIRLATIR.
 * Yedek / varsayılan anahtar kesinlikle kullanılmaz.
 */
export function getSessionSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.trim().length < 32) {
    throw new Error(
      'FATAL GÜVENLİK HATASI: SESSION_SECRET ortam değişkeni tanımlanmamış veya 32 karakterden kısa!'
    );
  }
  return new TextEncoder().encode(secret.trim());
}

/**
 * ADMIN_PASSWORD_HASH ortam değişkenini doğrular.
 * Tanımlı değilse HATA FIRLATIR.
 * Yedek / varsayılan hash kesinlikle kullanılmaz.
 */
export function getAdminPasswordHash(): string {
  const hash = process.env.ADMIN_PASSWORD_HASH;
  if (!hash || hash.trim().length === 0) {
    throw new Error(
      'FATAL GÜVENLİK HATASI: ADMIN_PASSWORD_HASH ortam değişkeni tanımlanmamış!'
    );
  }
  return hash.trim();
}

/**
 * Satıcı için imzalı JWT üretir (8 saat geçerli)
 */
export async function createSellerToken(payload: SellerJwtPayload): Promise<string> {
  const secret = getSessionSecret();
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(secret);
}

/**
 * Admin için imzalı JWT üretir (2 saat geçerli)
 */
export async function createAdminToken(): Promise<string> {
  const secret = getSessionSecret();
  return await new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(secret);
}

/**
 * Satıcı JWT'sini doğrular
 */
export async function verifySellerToken(token: string): Promise<SellerJwtPayload | null> {
  try {
    const secret = getSessionSecret();
    const { payload } = await jwtVerify(token, secret);
    if (payload.role !== 'seller' || !payload.storeId || !payload.slug) {
      return null;
    }
    return {
      storeId: payload.storeId as string,
      slug: payload.slug as string,
      role: 'seller',
      pinVersion: Number(payload.pinVersion ?? 1),
    };
  } catch {
    return null;
  }
}

/**
 * Admin JWT'sini doğrular
 */
export async function verifyAdminToken(token: string): Promise<AdminJwtPayload | null> {
  try {
    const secret = getSessionSecret();
    const { payload } = await jwtVerify(token, secret);
    if (payload.role !== 'admin') {
      return null;
    }
    return { role: 'admin' };
  } catch {
    return null;
  }
}

/**
 * Sunucu tarafında (Server Components & Route Handlers) aktif satıcı oturumunu doğrular.
 * pinVersion eşleşmesini veritabanından denetler; PIN değişmişse eski oturumu geçersiz kılar.
 */
export async function getSellerSession(): Promise<{ storeId: string; slug: string; mustChangePin: boolean } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SELLER_COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = await verifySellerToken(token);
  if (!payload) return null;

  // Veritabanından mağazanın güncel pinVersion ve aktiflik durumunu doğrula
  const store = await prisma.store.findUnique({
    where: { id: payload.storeId },
    select: { id: true, slug: true, pinVersion: true, isActive: true, mustChangePin: true },
  });

  if (!store || !store.isActive) return null;

  // pinVersion değişmişse oturum geçersizdir
  if (store.pinVersion !== payload.pinVersion) {
    return null;
  }

  return {
    storeId: store.id,
    slug: store.slug,
    mustChangePin: store.mustChangePin,
  };
}

/**
 * Sunucu tarafında admin oturumunu doğrular.
 */
export async function getAdminSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) return false;

  const payload = await verifyAdminToken(token);
  return payload !== null && payload.role === 'admin';
}

/**
 * Satıcı çerezini ayarlar (httpOnly, secure, sameSite=strict)
 */
export async function setSellerSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SELLER_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 8 * 60 * 60, // 8 saat
  });
}

/**
 * Admin çerezini ayarlar
 */
export async function setAdminSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 2 * 60 * 60, // 2 saat
  });
}

/**
 * Tüm oturum çerezlerini temizler (Çıkış)
 */
export async function clearAuthCookies() {
  const cookieStore = await cookies();
  cookieStore.set(SELLER_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });
  cookieStore.set(ADMIN_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });
}
