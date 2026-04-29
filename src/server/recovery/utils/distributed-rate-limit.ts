import { createClient } from "@supabase/supabase-js";

import { logger } from "@/server/recovery/utils/logger";

/**
 * Distributed token-bucket rate limiter backed by Postgres (bump_rate_limit).
 *
 * Survives Vercel cold starts and is shared across regions, unlike the
 * previous per-isolate Map. Falls back to an in-memory bucket if the RPC
 * call fails so we never start *blocking* requests because of an outage —
 * only stop *throttling* attackers when our own DB is unhealthy. The
 * fallback is conservative (still uses the same window) and resets per
 * isolate, which preserves the former behaviour as a safety net.
 */

type RateLimitResult = {
  allowed: boolean;
  count: number;
  resetAt: number;
};

let cachedClient: ReturnType<typeof createClient> | null = null;

function getSupabase() {
  if (cachedClient) return cachedClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  cachedClient = createClient(url, key, {
    auth: { persistSession: false },
  });
  return cachedClient;
}

const inMemoryFallback = new Map<string, { count: number; resetAt: number }>();

function fallbackBump(
  key: string,
  windowSeconds: number,
  maxCount: number,
): RateLimitResult {
  const now = Date.now();
  const entry = inMemoryFallback.get(key);
  if (!entry || now > entry.resetAt) {
    const resetAt = now + windowSeconds * 1000;
    inMemoryFallback.set(key, { count: 1, resetAt });
    return { allowed: true, count: 1, resetAt };
  }
  if (entry.count >= maxCount) {
    return { allowed: false, count: entry.count, resetAt: entry.resetAt };
  }
  entry.count += 1;
  return { allowed: true, count: entry.count, resetAt: entry.resetAt };
}

export async function bumpRateLimit(input: {
  key: string;
  windowSeconds: number;
  maxCount: number;
}): Promise<RateLimitResult> {
  const supabase = getSupabase();
  if (!supabase) return fallbackBump(input.key, input.windowSeconds, input.maxCount);

  try {
    const { data, error } = await (supabase as unknown as {
      rpc(
        name: string,
        params: Record<string, unknown>,
      ): Promise<{ data: unknown; error: { message: string } | null }>;
    }).rpc("bump_rate_limit", {
      p_key: input.key,
      p_window_seconds: input.windowSeconds,
      p_max_count: input.maxCount,
    });

    const rows = Array.isArray(data) ? (data as Array<{ allowed: boolean; current_count: number; reset_at: string }>) : [];
    if (error || rows.length === 0) {
      logger.warn("bump_rate_limit RPC unavailable; using in-memory fallback", {
        error: error?.message,
        key: input.key,
      });
      return fallbackBump(input.key, input.windowSeconds, input.maxCount);
    }

    const row = rows[0];
    return {
      allowed: row.allowed,
      count: row.current_count,
      resetAt: new Date(row.reset_at).getTime(),
    };
  } catch (e) {
    logger.warn("bump_rate_limit threw; using in-memory fallback", {
      error: e instanceof Error ? e.message : String(e),
      key: input.key,
    });
    return fallbackBump(input.key, input.windowSeconds, input.maxCount);
  }
}
