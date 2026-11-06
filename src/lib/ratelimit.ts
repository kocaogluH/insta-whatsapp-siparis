import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

/**
 * IP Alma Yardımcısı
 * x-forwarded-for başlığının ilk IP adresini döndürür.
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const firstIp = forwarded.split(',')[0].trim();
    if (firstIp) return firstIp;
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp && realIp.trim()) {
    return realIp.trim();
  }
  return '127.0.0.1';
}

/**
 * Upstash Redis İstemcisi
 * UPSTASH_REDIS_REST_URL ve UPSTASH_REDIS_REST_TOKEN ortam değişkenlerinden başlatılır.
 */
export function getRedisClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

  if (!url || !token) {
    return null;
  }

  try {
    return new Redis({
      url,
      token,
    });
  } catch (error) {
    console.error('[RateLimit] Redis istemci oluşturma hatası:', error);
    return null;
  }
}

// Genel API Hız Sınırları için Redis örneği
const sharedRedis = getRedisClient();

/**
 * In-Memory Fallback Hız Sınırı (Yalnızca genel GET/POST limitleri için)
 */
class MemoryRateLimiter {
  private store = new Map<string, { count: number; resetTime: number }>();

  constructor(private maxRequests: number, private windowMs: number) {}

  async limit(identifier: string): Promise<{ success: boolean; remaining: number; reset: number }> {
    const now = Date.now();
    const record = this.store.get(identifier);

    if (!record || now > record.resetTime) {
      this.store.set(identifier, { count: 1, resetTime: now + this.windowMs });
      return { success: true, remaining: this.maxRequests - 1, reset: now + this.windowMs };
    }

    if (record.count >= this.maxRequests) {
      return { success: false, remaining: 0, reset: record.resetTime };
    }

    record.count += 1;
    return {
      success: true,
      remaining: this.maxRequests - record.count,
      reset: record.resetTime,
    };
  }
}

// 1. Sipariş Hız Sınırı (IP başına dakikada 10 sipariş)
export const orderLimiter = sharedRedis
  ? new Ratelimit({
      redis: sharedRedis,
      limiter: Ratelimit.slidingWindow(10, '60 s'),
      prefix: 'ratelimit:orders',
    })
  : new MemoryRateLimiter(10, 60 * 1000);

// 2. Fotoğraf Yükleme Sınırı (IP başına dakikada 20 yükleme)
export const uploadLimiter = sharedRedis
  ? new Ratelimit({
      redis: sharedRedis,
      limiter: Ratelimit.slidingWindow(20, '60 s'),
      prefix: 'ratelimit:upload',
    })
  : new MemoryRateLimiter(20, 60 * 1000);

// 3. Mağaza Oluşturma Sınırı (IP başına saatte 5 yeni dükkan)
export const storeCreateLimiter = sharedRedis
  ? new Ratelimit({
      redis: sharedRedis,
      limiter: Ratelimit.slidingWindow(5, '3600 s'),
      prefix: 'ratelimit:store_create',
    })
  : new MemoryRateLimiter(5, 3600 * 1000);

/**
 * ==============================================================================
 * BRUTE-FORCE GİRİŞ KİLİTLEME SİSTEMİ (Fail-Closed, Upstash Redis)
 * Kural: Aynı IP + aynı hedef (admin veya butik slug'ı) için 5 yanlış denemede
 * 15 dakika boyunca HTTP 429 ve Retry-After başlığı döner.
 * Başarılı girişte sayaç sıfırlanır.
 * Redis erişilemezse istek reddedilir (fail-closed) ve hata loglanır.
 * ==============================================================================
 */

export interface LoginLockCheckResult {
  isLocked: boolean;
  remainingSeconds: number;
  failClosed?: boolean;
}

export interface LoginFailRecordResult {
  isLocked: boolean;
  remainingAttempts: number;
  remainingSeconds: number;
  failClosed?: boolean;
}

/**
 * Giriş öncesi kilit kontrolü
 */
export async function checkLoginLock(key: string): Promise<LoginLockCheckResult> {
  const redis = getRedisClient();
  if (!redis) {
    console.error(`[RateLimit] Redis yapılandırılmamış veya erişilemiyor (fail-closed). Hedef anahtar: ${key}`);
    return { isLocked: false, remainingSeconds: 0, failClosed: true };
  }

  try {
    const attemptsKey = `ratelimit:login:attempts:${key}`;
    const legacyLockKey = `ratelimit:login:lock:${key}`;

    const [attempts, attemptsTtl, legacyLockTtl] = await Promise.all([
      redis.get<number>(attemptsKey),
      redis.ttl(attemptsKey),
      redis.ttl(legacyLockKey),
    ]);

    // Geriye dönük uyumluluk: eski kilit anahtarı aktifse
    if (legacyLockTtl > 0) {
      return { isLocked: true, remainingSeconds: legacyLockTtl, failClosed: false };
    }

    // Atomik sayaç 5 veya üzerindeyse ve TTL süresi devam ediyorsa kilitli
    if (attempts !== null && Number(attempts) >= 5 && attemptsTtl > 0) {
      return { isLocked: true, remainingSeconds: attemptsTtl, failClosed: false };
    }

    return { isLocked: false, remainingSeconds: 0, failClosed: false };
  } catch (error) {
    console.error(`[RateLimit] Redis checkLoginLock hatası (fail-closed). Hedef anahtar: ${key}:`, error);
    return { isLocked: false, remainingSeconds: 0, failClosed: true };
  }
}

/**
 * Hatalı giriş kaydetme (Atomik redis.incr, ilk artışta expire ve 5 sınırında 15 dk kilit)
 */
export async function recordFailedLogin(key: string): Promise<LoginFailRecordResult> {
  const maxAttempts = 5;
  const lockDurationSec = 15 * 60; // 900 saniye (15 dakika)

  const redis = getRedisClient();
  if (!redis) {
    console.error(`[RateLimit] Redis yapılandırılmamış veya erişilemiyor (fail-closed). Hedef anahtar: ${key}`);
    return { isLocked: false, remainingAttempts: 0, remainingSeconds: 0, failClosed: true };
  }

  try {
    const attemptsKey = `ratelimit:login:attempts:${key}`;

    // 1. Atomik sayaç artışı (redis.incr - Okuma ve yazma tek adımda atomik yapılır)
    const attempts = await redis.incr(attemptsKey);

    // 2. İlk artışta 15 dakikalık (900 saniye) expire ayarla
    if (attempts === 1) {
      await redis.expire(attemptsKey, lockDurationSec);
    } else if (attempts === maxAttempts) {
      // 5. hatalı denemede kilit süresini tam 15 dakika olarak tazele
      await redis.expire(attemptsKey, lockDurationSec);
    } else {
      // Herhangi bir ağ/bağlantı yarışında expire atanmamış kalmasını önle
      const currentTtl = await redis.ttl(attemptsKey);
      if (currentTtl === -1) {
        await redis.expire(attemptsKey, lockDurationSec);
      }
    }

    // Kalan kilit süresini öğren
    const ttl = await redis.ttl(attemptsKey);
    const remainingSec = ttl > 0 ? ttl : lockDurationSec;

    // 3. Eşzamanlı istek koruması: Sayaç 5 veya üzerindeyse doğrudan kilitli dön
    // Anahtar ASLA silinmez; böylece eşzamanlı gelen 6., 7., vb. istekler sayacı sıfırlayamaz veya sınırı aşamaz.
    if (attempts >= maxAttempts) {
      return {
        isLocked: true,
        remainingAttempts: 0,
        remainingSeconds: remainingSec,
        failClosed: false,
      };
    }

    return {
      isLocked: false,
      remainingAttempts: maxAttempts - attempts,
      remainingSeconds: 0,
      failClosed: false,
    };
  } catch (error) {
    console.error(`[RateLimit] Redis recordFailedLogin hatası (fail-closed). Hedef anahtar: ${key}:`, error);
    return { isLocked: false, remainingAttempts: 0, remainingSeconds: 0, failClosed: true };
  }
}

/**
 * Başarılı girişte kilit ve deneme sayaçlarını sıfırlama
 */
export async function clearFailedLogins(key: string): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;

  try {
    const attemptsKey = `ratelimit:login:attempts:${key}`;
    const legacyLockKey = `ratelimit:login:lock:${key}`;
    await redis.del(attemptsKey, legacyLockKey);
  } catch (error) {
    console.error(`[RateLimit] Redis clearFailedLogins hatası. Hedef anahtar: ${key}:`, error);
  }
}
