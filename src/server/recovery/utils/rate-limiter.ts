/**
 * In-memory rate limiter for API routes.
 * Uses a sliding window counter per key (IP, API key, etc).
 *
 * Note: Per-isolate on Vercel (resets on cold start).
 * Adequate for burst protection. Persistent rate limiting would need Redis.
 */

type RateLimitConfig = {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const stores = new Map<string, Map<string, RateLimitEntry>>();

export function createRateLimiter(name: string, config: RateLimitConfig) {
  if (!stores.has(name)) {
    stores.set(name, new Map());
  }
  const store = stores.get(name)!;

  return {
    check(key: string): {
      allowed: boolean;
      remaining: number;
      resetAt: number;
    } {
      const now = Date.now();
      const entry = store.get(key);

      if (!entry || now >= entry.resetAt) {
        store.set(key, { count: 1, resetAt: now + config.windowMs });
        return {
          allowed: true,
          remaining: config.maxRequests - 1,
          resetAt: now + config.windowMs,
        };
      }

      entry.count++;

      if (entry.count > config.maxRequests) {
        return { allowed: false, remaining: 0, resetAt: entry.resetAt };
      }

      return {
        allowed: true,
        remaining: config.maxRequests - entry.count,
        resetAt: entry.resetAt,
      };
    },

    // Periodic cleanup of expired entries
    cleanup() {
      const now = Date.now();
      for (const [key, entry] of store) {
        if (now >= entry.resetAt) store.delete(key);
      }
    },
  };
}

// Pre-configured limiters
export const apiLimiter = createRateLimiter("api", {
  windowMs: 60_000,
  maxRequests: 60,
});
export const partnerApiLimiter = createRateLimiter("partner-api", {
  windowMs: 60_000,
  maxRequests: 120,
});
export const webhookLimiter = createRateLimiter("webhook", {
  windowMs: 60_000,
  maxRequests: 300,
});

// Cleanup every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    apiLimiter.cleanup();
    partnerApiLimiter.cleanup();
    webhookLimiter.cleanup();
  }, 5 * 60_000);
}

/**
 * Extract client IP from request (Vercel/Cloudflare compatible)
 */
export function getClientIp(request: Request): string {
  const headers = request.headers;
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

/**
 * Apply rate limit check and return 429 response if exceeded.
 * Returns null if allowed, Response if rate limited.
 */
export function checkRateLimit(
  request: Request,
  limiter: ReturnType<typeof createRateLimiter>,
  key?: string,
): Response | null {
  const clientKey = key || getClientIp(request);
  const result = limiter.check(clientKey);

  if (!result.allowed) {
    return new Response(
      JSON.stringify({ error: "Too many requests. Please try again later." }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(
            Math.ceil((result.resetAt - Date.now()) / 1000),
          ),
          "X-RateLimit-Limit": String(limiter.check(clientKey).remaining + 1),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
        },
      },
    );
  }

  return null;
}
