import path from "node:path";

import { platformBrand } from "@/lib/platform";
import type { ConnectionSettingsRecord } from "@/server/recovery/types";

const resolvedDefaultBaseUrl =
  process.env.NEXT_PUBLIC_APP_URL ??
  (process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : `http://127.0.0.1:${process.env.PORT ?? 3001}`);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const whatsappAccessToken = process.env.WHATSAPP_ACCESS_TOKEN ?? "";
const whatsappPhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID ?? "";
const whatsappWebhookVerifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ?? "";
const sendgridApiKey = process.env.SENDGRID_API_KEY ?? "";
const shieldLeadApiUrl = process.env.SHIELD_LEAD_API_URL ?? "";
const shieldLeadApiKey = process.env.SHIELD_LEAD_API_KEY ?? "";
const openAiApiKey = process.env.OPENAI_API_KEY ?? "";
const workerAuthToken = process.env.WORKER_AUTH_TOKEN ?? "";
const cronSecret = process.env.CRON_SECRET ?? "";
const workerBatchSize = clampInteger(
  process.env.SHIELD_WORKER_BATCH_SIZE,
  60,
  1,
  250,
);
const workerConcurrency = clampInteger(
  process.env.SHIELD_WORKER_CONCURRENCY,
  4,
  1,
  16,
);
const checkoutPlatformUrl = (process.env.CHECKOUT_PLATFORM_URL ?? "").trim();
const checkoutPlatformApiKey = (process.env.CHECKOUT_PLATFORM_API_KEY ?? "").trim();
const pagouAiEnvironment =
  (process.env.PAGOUAI_ENVIRONMENT ?? "production").toLowerCase() === "sandbox"
    ? "sandbox"
    : "production";
const pagouAiApiBaseUrl = process.env.PAGOUAI_API_BASE_URL ?? "";
const pagouAiSecretKey = process.env.PAGOUAI_SECRET_KEY ?? "";
const pagouAiPublicKey =
  process.env.NEXT_PUBLIC_PAGOUAI_PUBLIC_KEY ??
  process.env.PAGOUAI_PUBLIC_KEY ??
  "";
const experimentalPagesEnabled =
  (process.env.SHIELD_ENABLE_EXPERIMENTAL_UI ?? "").toLowerCase() === "true";

export function createDefaultConnectionSettings(): ConnectionSettingsRecord {
  return {
    id: "default",
    appBaseUrl: resolvedDefaultBaseUrl,
    webhookSecret:
      process.env.SHIELD_GATEWAY_WEBHOOK_SECRET ?? "shield_preview_secret",
    webhookToleranceSeconds: Number(
      process.env.WEBHOOK_TOLERANCE_SECONDS ?? 300,
    ),
    whatsappProvider: "cloud_api",
    whatsappApiBaseUrl: "https://graph.facebook.com/v22.0",
    whatsappAccessToken,
    whatsappPhoneNumberId,
    whatsappBusinessAccountId:
      process.env.WHATSAPP_BUSINESS_ACCOUNT_ID ?? "",
    whatsappWebhookVerifyToken,
    whatsappWebSessionId: "",
    whatsappWebSessionStatus: "disconnected",
    whatsappWebSessionQrCode: "",
    whatsappWebSessionPhone: "",
    whatsappWebSessionError: "",
    whatsappWebSessionUpdatedAt: "",
    emailProvider: "sendgrid",
    emailApiKey: sendgridApiKey,
    emailFromAddress: "",
    crmApiUrl: shieldLeadApiUrl,
    crmApiKey: shieldLeadApiKey,
    openAiApiKey,
    updatedAt: new Date().toISOString(),
  };
}

export const appEnv = {
  supabaseUrl,
  supabaseServiceRoleKey,
  databaseConfigured: Boolean(supabaseUrl && supabaseServiceRoleKey),
  whatsappAccessToken,
  whatsappPhoneNumberId,
  whatsappBusinessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID ?? "",
  whatsappWebhookVerifyToken,
  whatsappConfigured: Boolean(
    whatsappAccessToken && whatsappPhoneNumberId && whatsappWebhookVerifyToken,
  ),
  sendgridApiKey,
  emailConfigured: Boolean(sendgridApiKey),
  shieldLeadApiUrl,
  shieldLeadApiKey,
  crmConfigured: Boolean(shieldLeadApiUrl && shieldLeadApiKey),
  openAiApiKey,
  aiConfigured: Boolean(openAiApiKey),
  workerAuthToken,
  cronSecret,
  workerBatchSize,
  workerConcurrency,
  workerExecutorConfigured: Boolean(workerAuthToken),
  workerCronConfigured: Boolean(cronSecret),
  workerConfigured: Boolean(workerAuthToken || cronSecret),
  checkoutPlatformUrl,
  checkoutPlatformApiKey,
  checkoutPlatformConfigured: Boolean(checkoutPlatformUrl && checkoutPlatformApiKey),
  pagouAiEnvironment,
  pagouAiApiBaseUrl,
  pagouAiSecretKey,
  pagouAiPublicKey,
  pagouAiConfigured: Boolean(pagouAiSecretKey),
  pagouAiCardConfigured: Boolean(pagouAiSecretKey && pagouAiPublicKey),
  experimentalPagesEnabled,
  webhookSecret:
    process.env.SHIELD_GATEWAY_WEBHOOK_SECRET ?? "shield_preview_secret",
  webhookToleranceSeconds: Number(process.env.WEBHOOK_TOLERANCE_SECONDS ?? 300),
  appBaseUrl: resolvedDefaultBaseUrl,
  bootstrapStorePath: process.env.VERCEL
    ? `/tmp/${platformBrand.slug}-bootstrap.json`
    : path.join(process.cwd(), "data", `${platformBrand.slug}.bootstrap.json`),
  localStorePath: process.env.VERCEL
    ? `/tmp/${platformBrand.slug}-store.json`
    : path.join(process.cwd(), "data", `${platformBrand.slug}.local.json`),
};

function clampInteger(
  rawValue: string | undefined,
  fallback: number,
  min: number,
  max: number,
) {
  const parsed = Number(rawValue ?? fallback);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.floor(parsed)));
}
