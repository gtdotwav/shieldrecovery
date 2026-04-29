import { createClient } from "@supabase/supabase-js";

import { logger } from "@/server/recovery/utils/logger";

type TemplateRow = {
  slug: string;
  channel: string;
  tone: string;
  body: string;
  is_default: boolean;
  active: boolean;
  seller_key: string | null;
};

type TemplateCacheEntry = {
  rows: TemplateRow[];
  expiresAt: number;
};

const CACHE_TTL_MS = 60_000;
let cachedClient: ReturnType<typeof createClient> | null = null;
let cache: TemplateCacheEntry | null = null;

function getSupabase() {
  if (cachedClient) return cachedClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  cachedClient = createClient(url, key, { auth: { persistSession: false } });
  return cachedClient;
}

async function loadTemplates(force = false): Promise<TemplateRow[]> {
  const now = Date.now();
  if (!force && cache && cache.expiresAt > now) return cache.rows;

  const supabase = getSupabase();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from("message_templates")
      .select("slug, channel, tone, body, is_default, active, seller_key")
      .eq("active", true);
    if (error || !Array.isArray(data)) {
      logger.warn("template-resolver: failed to load DB templates", {
        error: error?.message,
      });
      return cache?.rows ?? [];
    }
    const rows = data as TemplateRow[];
    cache = { rows, expiresAt: now + CACHE_TTL_MS };
    return rows;
  } catch (error) {
    logger.warn("template-resolver: load threw", {
      error: error instanceof Error ? error.message : String(error),
    });
    return cache?.rows ?? [];
  }
}

/**
 * Resolves a template body for the given slug, with a fallback chain:
 *   1. seller-specific active template
 *   2. default (seller_key NULL) active template
 *   3. caller-supplied fallback (the legacy hardcoded copy)
 *
 * Variable substitution is intentionally simple ({{name}} → value) so that
 * AI-rewritten or user-edited templates cannot inject HTML / scripts. Use
 * the html-escape util at the render layer if you ever embed the result
 * into HTML email or web markup.
 */
export async function resolveTemplate(input: {
  slug: string;
  sellerKey?: string;
  fallback: string;
  variables?: Record<string, string | number | undefined>;
}): Promise<string> {
  const rows = await loadTemplates();
  const matches = rows.filter((row) => row.slug === input.slug);

  const sellerMatch = input.sellerKey
    ? matches.find((row) => row.seller_key === input.sellerKey)
    : undefined;
  const defaultMatch = matches.find((row) => !row.seller_key && row.is_default);
  const anyMatch = matches[0];
  const chosen = sellerMatch?.body ?? defaultMatch?.body ?? anyMatch?.body ?? input.fallback;

  return interpolate(chosen, input.variables ?? {});
}

function interpolate(
  template: string,
  vars: Record<string, string | number | undefined>,
): string {
  return template.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, name) => {
    const v = vars[name];
    return v === undefined || v === null ? "" : String(v);
  });
}

/** Force the next request to bypass the in-memory cache. */
export function invalidateTemplateCache() {
  cache = null;
}
