import { createHash, timingSafeEqual } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

export type AuthenticatedMerchant = {
  merchantId: string;
  keyId: string;
  label: string;
};

/**
 * Authenticate a request by X-API-Key header.
 *
 * Looks up the key hash in `merchant_api_keys` and returns the merchant ID.
 * Uses SHA-256 hash comparison (keys are stored hashed, never in plaintext).
 */
export async function authenticateApiKey(
  db: SupabaseClient,
  apiKey: string | null | undefined,
): Promise<AuthenticatedMerchant | null> {
  if (!apiKey) return null;

  const keyHash = createHash("sha256").update(apiKey).digest("hex");

  const { data, error } = await db
    .from("merchant_api_keys")
    .select("id, merchant_id, label, key_hash, is_active")
    .eq("is_active", true);

  if (error || !data || data.length === 0) return null;

  // Timing-safe comparison against all active keys
  for (const row of data) {
    const storedHash = row.key_hash as string;
    if (storedHash.length !== keyHash.length) continue;

    const match = timingSafeEqual(
      Buffer.from(keyHash, "hex"),
      Buffer.from(storedHash, "hex"),
    );

    if (match) {
      // Update last_used_at (fire-and-forget)
      db.from("merchant_api_keys")
        .update({ last_used_at: new Date().toISOString() })
        .eq("id", row.id)
        .then(() => {});

      return {
        merchantId: row.merchant_id as string,
        keyId: row.id as string,
        label: row.label as string,
      };
    }
  }

  return null;
}
