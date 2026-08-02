/**
 * Platform 2.1 — lightweight in-memory rate limiter (Phase 8).
 * Suitable for single-node / serverless warm instances. For multi-region
 * production, swap for Redis/Upstash using the same interface.
 */

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
};

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

/** Best-effort client key from request headers / IP. */
export function clientKeyFromRequest(request: Request, prefix: string): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  return `${prefix}:${ip}`;
}

/**
 * Sliding fixed-window limiter.
 * @param key unique bucket key (include route + IP)
 * @param limit max hits per window
 * @param windowMs window length
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: Math.max(0, limit - 1), retryAfterSec: 0 };
  }

  if (existing.count >= limit) {
    const retryAfterSec = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    return { allowed: false, remaining: 0, retryAfterSec };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: Math.max(0, limit - existing.count),
    retryAfterSec: 0,
  };
}

export function rateLimitResponse(retryAfterSec: number): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: "Too many requests. Please try again shortly.",
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfterSec),
      },
    }
  );
}

/** Test helper — clear buckets between unit tests. */
export function resetRateLimitBucketsForTests(): void {
  buckets.clear();
}
