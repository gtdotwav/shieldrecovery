import { NextResponse } from "next/server";

import { getConnectionSettingsService } from "@/server/recovery/services/connection-settings-service";

export async function handleGetConnectionSettings() {
  const runtime = await getConnectionSettingsService().getRuntimeSettings();
  return NextResponse.json(runtime, { status: 200 });
}

export async function handleSaveConnectionSettings(request: Request) {
  const payload = (await request.json()) as Record<string, unknown>;
  const runtime = await getConnectionSettingsService().saveSettings({
    appBaseUrl:
      typeof payload.appBaseUrl === "string" ? payload.appBaseUrl : undefined,
    webhookSecret:
      typeof payload.webhookSecret === "string"
        ? payload.webhookSecret
        : undefined,
    webhookToleranceSeconds:
      typeof payload.webhookToleranceSeconds === "number"
        ? payload.webhookToleranceSeconds
        : undefined,
    whatsappProvider:
      payload.whatsappProvider === "web_api" ? "web_api" : undefined,
    whatsappApiBaseUrl:
      typeof payload.whatsappApiBaseUrl === "string"
        ? payload.whatsappApiBaseUrl
        : undefined,
    whatsappAccessToken:
      typeof payload.whatsappAccessToken === "string"
        ? payload.whatsappAccessToken
        : undefined,
    whatsappPhoneNumberId:
      typeof payload.whatsappPhoneNumberId === "string"
        ? payload.whatsappPhoneNumberId
        : undefined,
    whatsappBusinessAccountId:
      typeof payload.whatsappBusinessAccountId === "string"
        ? payload.whatsappBusinessAccountId
        : undefined,
    whatsappWebhookVerifyToken:
      typeof payload.whatsappWebhookVerifyToken === "string"
        ? payload.whatsappWebhookVerifyToken
        : undefined,
    emailApiKey:
      typeof payload.emailApiKey === "string" ? payload.emailApiKey : undefined,
    emailFromAddress:
      typeof payload.emailFromAddress === "string"
        ? payload.emailFromAddress
        : undefined,
    crmApiUrl:
      typeof payload.crmApiUrl === "string" ? payload.crmApiUrl : undefined,
    crmApiKey:
      typeof payload.crmApiKey === "string" ? payload.crmApiKey : undefined,
    openAiApiKey:
      typeof payload.openAiApiKey === "string"
        ? payload.openAiApiKey
        : undefined,
  });

  return NextResponse.json(runtime, { status: 200 });
}
