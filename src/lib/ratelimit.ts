import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// IP Alma Yardımcısı
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const ip = forwarded.split(',')[0].trim();
    if (ip) return ip;
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return '127.0.0.1';
}

// Upstash Redis konfigürasyonu var mı?
const hasUpstash = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

let redis: Redis | null = null;
if (hasUpstash) {
  redis = Redis.fromEnv();
}

/**
 * IN-MEMORY FALLBACK RATELIMITER
 * Upstash ortam değişkenleri henüz Vercel'e eklenmemişse veya yerel geliştirmede
 * uygulamanın çökmesini engeller, bellekte hız sınırı uygular.
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
export const orderLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '60 s'),
      prefix: 'ratelimit:orders',
    })
  : new MemoryRateLimiter(10, 60 * 1000);

// 2. Fotoğraf Yükleme Sınırı (IP başına dakikada 20 yükleme)
export const uploadLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, '60 s'),
      prefix: 'ratelimit:upload',
    })
  : new MemoryRateLimiter(20, 60 * 1000);

// 3. Mağaza Oluşturma Sınırı (IP başına saatte 5 yeni dükkan)
export const storeCreateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '3600 s'),
      prefix: 'ratelimit:store_create',
    })
  : new MemoryRateLimiter(5, 3600 * 1000);

/**
 * 4. GİRİŞ KİLİTLEME SİSTEMİ (IP + Mağaza / Admin Başına 5 Hatalı Denemede 15 Dakika Kilit)
 */
interface FailedAttemptRecord {
  attempts: number;
  lockedUntil?: number;
}

const failedAttemptsMap = new Map<string, FailedAttemptRecord>();

export async function checkLoginLock(key: string): Promise<{ isLocked: boolean; remainingSeconds: number }> {
  const now = Date.now();

  if (redis) {
    try {
      const lockKey = `lock:login:${key}`;
      const ttl = await redis.ttl(lockKey);
      if (ttl > 0) {
        return { isLocked: true, remainingSeconds: ttl };
      }
      return { isLocked: false, remainingSeconds: 0 };
    } catch {
      // Redis erişim hatasında in-memory denetimine geç
    }
  }

  const record = failedAttemptsMap.get(key);
  if (!record || !record.lockedUntil) {
    return { isLocked: false, remainingSeconds: 0 };
  }

  if (now < record.lockedUntil) {
    return {
      isLocked: true,
      remainingSeconds: Math.ceil((record.lockedUntil - now) / 1000),
    };
  }

  // Kilit süresi dolmuş
  failedAttemptsMap.delete(key);
  return { isLocked: false, remainingSeconds: 0 };
}

export async function recordFailedLogin(
  key: string
): Promise<{ isLocked: boolean; remainingAttempts: number; remainingSeconds: number }> {
  const now = Date.now();
  const maxAttempts = 5;
  const lockDurationSec = 15 * 60; // 15 dakika

  if (redis) {
    try {
      const attemptsKey = `attempts:login:${key}`;
      const lockKey = `lock:login:${key}`;

      const attempts = await redis.incr(attemptsKey);
      if (attempts === 1) {
        await redis.expire(attemptsKey, lockDurationSec);
      }

      if (attempts >= maxAttempts) {
        await redis.set(lockKey, '1', { ex: lockDurationSec });
        await redis.del(attemptsKey);
        return { isLocked: true, remainingAttempts: 0, remainingSeconds: lockDurationSec };
      }

      return {
        isLocked: false,
        remainingAttempts: maxAttempts - attempts,
        remainingSeconds: 0,
      };
    } catch {
      // Redis erişim hatasında in-memory fallback
    }
  }

  const record = failedAttemptsMap.get(key) || { attempts: 0 };
  record.attempts += 1;

  if (record.attempts >= maxAttempts) {
    record.lockedUntil = now + lockDurationSec * 1000;
    failedAttemptsMap.set(key, record);
    return { isLocked: true, remainingAttempts: 0, remainingSeconds: lockDurationSec };
  }

  failedAttemptsMap.set(key, record);
  return {
    isLocked: false,
    remainingAttempts: maxAttempts - record.attempts,
    remainingSeconds: 0,
  };
}

export async function clearFailedLogins(key: string): Promise<void> {
  if (redis) {
    try {
      await redis.del(`attempts:login:${key}`, `lock:login:${key}`);
    } catch {}
  }
  failedAttemptsMap.delete(key);
}
