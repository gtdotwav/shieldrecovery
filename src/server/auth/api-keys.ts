import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { UserRole } from "@/server/auth/core";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ApiKeyRecord = {
  id: string;
  name: string;
  keyPrefix: string;
  sellerKey: string | null;
  role: UserRole;
  scopes: string[];
  rateLimitPerMinute: number;
  active: boolean;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdByEmail: string;
  createdAt: string;
  updatedAt: string;
};

export type ApiKeySession = {
  email: string;
  role: UserRole;
  expiresAt: number;
  apiKeyId: string;
  sellerKey: string | null;
  scopes: string[];
};

type DatabaseApiKeyRow = {
  id: string;
  name: string;
  key_prefix: string;
  key_hash: string;
  seller_key: string | null;
  role: string;
  scopes: string[];
  rate_limit_per_minute: number;
  active: boolean;
  last_used_at: string | null;
  expires_at: string | null;
  created_by_email: string;
  created_at: string;
  updated_at: string;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const KEY_PREFIX_LIVE = "sk_live_";
const KEY_PREFIX_TEST = "sk_test_";
const PREFIX_LENGTH = 12;

// ---------------------------------------------------------------------------
// In-memory rate limiting per API key prefix
// ---------------------------------------------------------------------------

const rateLimitMap = new Map<string, { count: number; windowStart: number }>();

const RATE_LIMIT_WINDOW_MS = 60_000;

function isApiKeyRateLimited(prefix: string, limit: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(prefix);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(prefix, { count: 1, windowStart: now });
    return false;
  }

  entry.count += 1;
  return entry.count > limit;
}

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap) {
    if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS * 2) {
      rateLimitMap.delete(key);
    }
  }
}, 300_000).unref?.();

// ---------------------------------------------------------------------------
// Supabase client (lazy singleton)
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _supabase: SupabaseClient<any, "public", any> | null = null;

function getSupabase() {
  if (_supabase) return _supabase;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !key) throw new Error("Supabase is not configured for API keys.");
  _supabase = createClient(url, key);
  return _supabase;
}

// ---------------------------------------------------------------------------
// Key generation & hashing
// ---------------------------------------------------------------------------

function hashKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}

function extractPrefix(rawKey: string): string {
  const body = rawKey.startsWith(KEY_PREFIX_LIVE)
    ? rawKey.slice(KEY_PREFIX_LIVE.length)
    : rawKey.slice(KEY_PREFIX_TEST.length);
  return body.slice(0, PREFIX_LENGTH);
}

export function isApiKeyFormat(token: string): boolean {
  return token.startsWith(KEY_PREFIX_LIVE) || token.startsWith(KEY_PREFIX_TEST);
}

export function generateApiKey(mode: "live" | "test" = "live"): {
  rawKey: string;
  prefix: string;
  hash: string;
} {
  const prefix = mode === "live" ? KEY_PREFIX_LIVE : KEY_PREFIX_TEST;
  const body = randomBytes(32).toString("base64url");
  const rawKey = `${prefix}${body}`;
  return {
    rawKey,
    prefix: body.slice(0, PREFIX_LENGTH),
    hash: hashKey(rawKey),
  };
}

// ---------------------------------------------------------------------------
// Verification
// ---------------------------------------------------------------------------

export async function verifyApiKey(rawKey: string): Promise<ApiKeySession | null> {
  if (!isApiKeyFormat(rawKey)) return null;

  const prefix = extractPrefix(rawKey);
  const supabase = getSupabase();

  const { data: row } = await supabase
    .from("api_keys")
    .select("*")
    .eq("key_prefix", prefix)
    .eq("active", true)
    .single<DatabaseApiKeyRow>();

  if (!row) return null;

  // Verify hash with timing-safe comparison
  const providedHash = hashKey(rawKey);
  const storedHash = row.key_hash;
  const providedBuf = Buffer.from(providedHash, "hex");
  const storedBuf = Buffer.from(storedHash, "hex");

  if (providedBuf.length !== storedBuf.length || !timingSafeEqual(providedBuf, storedBuf)) {
    return null;
  }

  // Check expiration
  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
    return null;
  }

  // Rate limiting
  if (isApiKeyRateLimited(prefix, row.rate_limit_per_minute)) {
    return null; // caller will handle 429
  }

  // Update last_used_at (fire-and-forget)
  supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", row.id)
    .then(() => {});

  return {
    email: row.created_by_email,
    role: row.role as UserRole,
    expiresAt: row.expires_at
      ? new Date(row.expires_at).getTime()
      : Date.now() + 365 * 24 * 60 * 60 * 1000,
    apiKeyId: row.id,
    sellerKey: row.seller_key,
    scopes: row.scopes ?? [],
  };
}

// ---------------------------------------------------------------------------
// Rate limit check (returns true if rate limited, for explicit 429 handling)
// ---------------------------------------------------------------------------

export async function checkApiKeyRateLimit(rawKey: string): Promise<boolean> {
  if (!isApiKeyFormat(rawKey)) return false;

  const prefix = extractPrefix(rawKey);
  const supabase = getSupabase();

  const { data: row } = await supabase
    .from("api_keys")
    .select("rate_limit_per_minute")
    .eq("key_prefix", prefix)
    .eq("active", true)
    .single<{ rate_limit_per_minute: number }>();

  if (!row) return false;

  const entry = rateLimitMap.get(prefix);
  if (!entry) return false;

  return entry.count > row.rate_limit_per_minute;
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

function mapRow(row: DatabaseApiKeyRow): ApiKeyRecord {
  return {
    id: row.id,
    name: row.name,
    keyPrefix: row.key_prefix,
    sellerKey: row.seller_key,
    role: row.role as UserRole,
    scopes: row.scopes ?? [],
    rateLimitPerMinute: row.rate_limit_per_minute,
    active: row.active,
    lastUsedAt: row.last_used_at,
    expiresAt: row.expires_at,
    createdByEmail: row.created_by_email,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createApiKey(input: {
  name: string;
  role?: UserRole;
  sellerKey?: string;
  scopes?: string[];
  rateLimitPerMinute?: number;
  expiresAt?: string;
  createdByEmail: string;
}): Promise<{ record: ApiKeyRecord; rawKey: string }> {
  const { rawKey, prefix, hash } = generateApiKey("live");
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("api_keys")
    .insert({
      name: input.name,
      key_prefix: prefix,
      key_hash: hash,
      seller_key: input.sellerKey ?? null,
      role: input.role ?? "seller",
      scopes: input.scopes ?? [],
      rate_limit_per_minute: input.rateLimitPerMinute ?? 60,
      expires_at: input.expiresAt ?? null,
      created_by_email: input.createdByEmail,
    })
    .select("*")
    .single<DatabaseApiKeyRow>();

  if (error || !data) {
    throw new Error(`Failed to create API key: ${error?.message ?? "unknown"}`);
  }

  return { record: mapRow(data), rawKey };
}

export async function listApiKeys(filter?: {
  sellerKey?: string;
  createdByEmail?: string;
}): Promise<ApiKeyRecord[]> {
  const supabase = getSupabase();
  let query = supabase
    .from("api_keys")
    .select("*")
    .order("created_at", { ascending: false });

  if (filter?.sellerKey) {
    query = query.eq("seller_key", filter.sellerKey);
  }
  if (filter?.createdByEmail) {
    query = query.eq("created_by_email", filter.createdByEmail);
  }

  const { data, error } = await query.returns<DatabaseApiKeyRow[]>();

  if (error) {
    throw new Error(`Failed to list API keys: ${error.message}`);
  }

  return (data ?? []).map(mapRow);
}

export async function revokeApiKey(id: string): Promise<boolean> {
  const supabase = getSupabase();

  const { error, count } = await supabase
    .from("api_keys")
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    throw new Error(`Failed to revoke API key: ${error.message}`);
  }

  return (count ?? 0) > 0;
}
