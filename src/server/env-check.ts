/**
 * Validates that critical environment variables are set at startup.
 * Call once at module scope (e.g. in config.ts) so missing vars are
 * surfaced immediately rather than at first request time.
 */
let _warned = false;

export function validateRequiredEnvVars(): void {
  const required = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "PLATFORM_AUTH_SECRET",
    "CRON_SECRET",
  ] as const;

  const missing = required.filter((key) => !process.env[key]?.trim());
  if (missing.length > 0) {
    throw new Error(
      `[env-check] Missing required environment variables: ${missing.join(", ")}. ` +
        "The application cannot start without these.",
    );
  }

  if (_warned) return;
  _warned = true;

  const recommended = [
    "WHATSAPP_ACCESS_TOKEN",
    "WHATSAPP_PHONE_NUMBER_ID",
    "SENDGRID_API_KEY",
    "WHATSAPP_APP_SECRET",
  ] as const;

  const missingRecommended = recommended.filter((key) => !process.env[key]?.trim());
  if (missingRecommended.length > 0) {
    console.warn(
      `[env-check] Optional but recommended environment variables not set: ${missingRecommended.join(", ")}. ` +
        "Some features (messaging, email, webhook verification) may not work.",
    );
  }
}
