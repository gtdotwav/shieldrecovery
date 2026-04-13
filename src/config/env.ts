/**
 * Environment variable validation.
 *
 * Import this module early (e.g. in layout.tsx or middleware) to ensure
 * required env vars are present before the app starts serving requests.
 */

const REQUIRED_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "CRON_SECRET",
  "PLATFORM_AUTH_SECRET",
] as const;

const OPTIONAL_VARS_WITH_DEFAULTS: Record<string, string> = {
  NEXT_PUBLIC_APP_URL: "https://pagrecovery.com",
  SHIELD_WORKER_BATCH_SIZE: "60",
  SHIELD_WORKER_CONCURRENCY: "4",
  WEBHOOK_TOLERANCE_SECONDS: "300",
  NODE_ENV: "production",
} as const;

function validateEnv(): void {
  const missing = REQUIRED_VARS.filter((key) => !process.env[key]?.trim());

  if (missing.length > 0) {
    throw new Error(
      `[env] Missing required environment variables: ${missing.join(", ")}. ` +
        "The application cannot start without these.",
    );
  }

  // Apply defaults for optional vars that are unset
  for (const [key, defaultValue] of Object.entries(OPTIONAL_VARS_WITH_DEFAULTS)) {
    if (!process.env[key]?.trim()) {
      process.env[key] = defaultValue;
    }
  }
}

// NOTE: Do NOT call validateEnv() at module scope. In Vercel Edge
// middleware, env vars may not be fully loaded when this module is first
// imported, which would crash the entire app. Validation is already
// handled by src/server/env-check.ts (called from recovery/config.ts).

/** Typed access to validated environment. */
export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  cronSecret: process.env.CRON_SECRET!,
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? OPTIONAL_VARS_WITH_DEFAULTS.NEXT_PUBLIC_APP_URL,
  workerBatchSize: Number(
    process.env.SHIELD_WORKER_BATCH_SIZE ??
      OPTIONAL_VARS_WITH_DEFAULTS.SHIELD_WORKER_BATCH_SIZE,
  ),
  workerConcurrency: Number(
    process.env.SHIELD_WORKER_CONCURRENCY ??
      OPTIONAL_VARS_WITH_DEFAULTS.SHIELD_WORKER_CONCURRENCY,
  ),
  nodeEnv: process.env.NODE_ENV ?? OPTIONAL_VARS_WITH_DEFAULTS.NODE_ENV,
  isProduction: process.env.NODE_ENV === "production",
} as const;
