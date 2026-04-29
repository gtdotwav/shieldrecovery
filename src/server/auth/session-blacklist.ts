import { createClient } from "@supabase/supabase-js";

import { logger } from "@/server/recovery/utils/logger";

let cachedClient: ReturnType<typeof createClient> | null = null;
let cachedRevocations = new Map<string, number>();
let cachedAt = 0;
const CACHE_TTL_MS = 30_000;

function getSupabase() {
  if (cachedClient) return cachedClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  cachedClient = createClient(url, key, { auth: { persistSession: false } });
  return cachedClient;
}

/**
 * Returns true when the given jti has been revoked and the underlying
 * token would still otherwise be valid (i.e. blacklist entry not expired).
 *
 * The blacklist is read-through cached for 30s to avoid a DB hit on every
 * request. Revocation calls invalidate the cache so cancellations are
 * effective within seconds.
 */
export async function isSessionRevoked(jti: string | undefined): Promise<boolean> {
  if (!jti) return false;
  const supabase = getSupabase();
  if (!supabase) return false;

  const now = Date.now();
  if (now - cachedAt > CACHE_TTL_MS) {
    try {
      const { data, error } = await supabase
        .from("revoked_sessions")
        .select("jti, expires_at")
        .gte("expires_at", new Date().toISOString());

      if (!error && Array.isArray(data)) {
        const next = new Map<string, number>();
        for (const row of data as Array<{ jti: string; expires_at: string }>) {
          next.set(row.jti, new Date(row.expires_at).getTime());
        }
        cachedRevocations = next;
        cachedAt = now;
      }
    } catch (error) {
      logger.warn("Failed to refresh session blacklist; using stale cache", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const expiresAt = cachedRevocations.get(jti);
  if (!expiresAt) return false;
  if (expiresAt < Date.now()) {
    cachedRevocations.delete(jti);
    return false;
  }
  return true;
}

export async function revokeSession(input: {
  jti: string;
  subject?: string;
  reason?: string;
  expiresAt: number;
}): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const { error } = await (supabase as unknown as {
    from(table: string): {
      upsert(
        values: Record<string, unknown>,
        options?: { onConflict?: string },
      ): Promise<{ error: { message: string } | null }>;
    };
  })
    .from("revoked_sessions")
    .upsert(
      {
        jti: input.jti,
        subject: input.subject ?? null,
        reason: input.reason ?? null,
        expires_at: new Date(input.expiresAt).toISOString(),
      },
      { onConflict: "jti" },
    );

  if (error) {
    logger.error("Failed to revoke session", {
      jti: input.jti,
      error: error.message,
    });
    return false;
  }

  cachedRevocations.set(input.jti, input.expiresAt);
  cachedAt = Date.now();
  return true;
}
