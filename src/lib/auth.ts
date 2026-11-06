import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import crypto from 'crypto';
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

const DEFAULT_SESSION_SECRET = 'edcb8f3b32ffe5343f95f077e2f9ed10b95b8ac06536bd2494ad987452129f7e';

/**
 * SESSION_SECRET ortam değişkenini doğrular ve Uint8Array döner.
 * Tanımlı değilse güvenli yerel/varsayılan anahtara döner.
 */
export function getSessionSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET || DEFAULT_SESSION_SECRET;
  return new TextEncoder().encode(secret.trim());
}

/**
 * Admin şifresini process.env.ADMIN_PASSWORD ortam değişkeninden okuyarak
 * crypto.timingSafeEqual ile zaman-güvenli karşılaştırır.
 */
export function verifyAdminPassword(providedPassword: string): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword || typeof adminPassword !== 'string' || adminPassword.trim().length === 0) {
    return false;
  }

  const providedHash = crypto.createHash('sha256').update(String(providedPassword)).digest();
  const expectedHash = crypto.createHash('sha256').update(String(adminPassword)).digest();

  return crypto.timingSafeEqual(providedHash, expectedHash);
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
