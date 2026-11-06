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
 * Sıralama Garantisi:
 * (1) redis.incr ile atomik deneme hakkı al
 * (2) sayaç > limit (5) ise doğrulamaya girmeden 429 dön
 * (3) ancak ondan sonra şifre/PIN doğrula
 * (4) doğruysa clearFailedLogins ile sayacı sıfırla
 * ==============================================================================
 */

export interface ConsumeAttemptResult {
  allowed: boolean;
  attempts: number;
  remainingAttempts: number;
  retryAfter: number;
  failClosed?: boolean;
}

/**
 * (1) redis.incr ile atomik deneme hakkı alma
 * (2) sayaç > limit (5) ise doğrulamaya girmeden 429 için kilit bilgisi dönme
 */
export async function consumeLoginAttempt(key: string): Promise<ConsumeAttemptResult> {
  const maxAttempts = 5;
  const lockDurationSec = 15 * 60; // 900 saniye (15 dakika)

  const redis = getRedisClient();
  if (!redis) {
    console.error(`[RateLimit] Redis yapılandırılmamış veya erişilemiyor (fail-closed). Hedef anahtar: ${key}`);
    return {
      allowed: false,
      attempts: 0,
      remainingAttempts: 0,
      retryAfter: lockDurationSec,
      failClosed: true,
    };
  }

  try {
    const attemptsKey = `ratelimit:login:attempts:${key}`;

    // 1. Atomik sayaç artışı (redis.incr ile deneme hakkı al)
    const attempts = await redis.incr(attemptsKey);

    // İlk artışta 15 dakikalık (900s) expire ayarla
    if (attempts === 1) {
      await redis.expire(attemptsKey, lockDurationSec);
    } else if (attempts === maxAttempts) {
      // 5. denemede 15 dakikalık süreyi yenile
      await redis.expire(attemptsKey, lockDurationSec);
    } else {
      const currentTtl = await redis.ttl(attemptsKey);
      if (currentTtl === -1) {
        await redis.expire(attemptsKey, lockDurationSec);
      }
    }

    const ttl = await redis.ttl(attemptsKey);
    const retryAfter = ttl > 0 ? ttl : lockDurationSec;

    // 2. Sayaç > limit (5) ise doğrulamaya girmeden engelle
    if (attempts > maxAttempts) {
      return {
        allowed: false,
        attempts,
        remainingAttempts: 0,
        retryAfter,
        failClosed: false,
      };
    }

    // 1..5 arası: doğrulama yapılabilir
    return {
      allowed: true,
      attempts,
      remainingAttempts: Math.max(0, maxAttempts - attempts),
      retryAfter,
      failClosed: false,
    };
  } catch (error) {
    console.error(`[RateLimit] Redis consumeLoginAttempt hatası (fail-closed). Hedef anahtar: ${key}:`, error);
    return {
      allowed: false,
      attempts: 0,
      remainingAttempts: 0,
      retryAfter: lockDurationSec,
      failClosed: true,
    };
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
