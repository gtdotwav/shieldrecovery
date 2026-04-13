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

  // Optional vars: log at debug level only (doesn't appear in Vercel production logs).
  // Using console.warn flooded logs because each 504 kills the process, forcing
  // cold starts where _warned resets.
  if (!_warned) {
    _warned = true;
    const recommended = [
      "WHATSAPP_ACCESS_TOKEN",
      "WHATSAPP_PHONE_NUMBER_ID",
      "SENDGRID_API_KEY",
      "WHATSAPP_APP_SECRET",
    ] as const;

    const missingRecommended = recommended.filter((key) => !process.env[key]?.trim());
    if (missingRecommended.length > 0) {
      console.debug(
        `[env-check] Optional vars not set: ${missingRecommended.join(", ")}`,
      );
    }
  }
}
