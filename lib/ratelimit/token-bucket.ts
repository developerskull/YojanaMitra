import { getEnv } from '@/lib/env';

export interface RateLimitDecision {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

/**
 * Interface-based per-IP rate limiter so Redis / Upstash sliding window can
 * drop in later without changing API route code.
 */
export interface RateLimiter {
  consume(identifier: string): RateLimitDecision;
  reset(): void;
}

interface BucketState {
  tokens: number;
  lastRefillMs: number;
}

export class InMemoryTokenBucketLimiter implements RateLimiter {
  private readonly buckets = new Map<string, BucketState>();
  private readonly maxBuckets = 5000;

  constructor(
    private readonly capacity: number,
    private readonly windowMs: number
  ) {}

  consume(identifier: string): RateLimitDecision {
    const now = Date.now();
    const refillRatePerMs = this.capacity / this.windowMs;

    let bucket = this.buckets.get(identifier);
    if (!bucket) {
      // Bound memory growth under high IP churn
      if (this.buckets.size >= this.maxBuckets) {
        const oldest = this.buckets.keys().next().value;
        if (oldest !== undefined) this.buckets.delete(oldest);
      }
      bucket = { tokens: this.capacity, lastRefillMs: now };
      this.buckets.set(identifier, bucket);
    }

    const elapsed = Math.max(0, now - bucket.lastRefillMs);
    bucket.tokens = Math.min(this.capacity, bucket.tokens + elapsed * refillRatePerMs);
    bucket.lastRefillMs = now;

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return {
        allowed: true,
        remaining: Math.floor(bucket.tokens),
        retryAfterMs: 0,
      };
    }

    const needed = 1 - bucket.tokens;
    const retryAfterMs = Math.ceil(needed / refillRatePerMs);
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs,
    };
  }

  reset(): void {
    this.buckets.clear();
  }
}

let limiterSingleton: RateLimiter | null = null;

export function getRateLimiter(): RateLimiter {
  if (!limiterSingleton) {
    const env = getEnv();
    limiterSingleton = new InMemoryTokenBucketLimiter(
      env.RATE_LIMIT_MAX_REQUESTS,
      env.RATE_LIMIT_WINDOW_MS
    );
  }
  return limiterSingleton;
}

export function extractClientIp(headers: Headers): string {
  const xff = headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  return headers.get('x-real-ip')?.trim() || 'local';
}
