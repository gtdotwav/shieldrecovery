import QRCode from "qrcode";

import { appEnv } from "@/server/recovery/config";
import { getConnectionSettingsService } from "@/server/recovery/services/connection-settings-service";
import { getStorageService } from "@/server/recovery/services/storage";
import type {
  ConversationRecord,
  ConversationThread,
  MessageStatus,
  RecoveryLeadRecord,
  WhatsAppWebSessionStatus,
} from "@/server/recovery/types";
import { HttpError } from "@/server/recovery/utils/http-error";
import { createStructuredLog } from "@/server/recovery/utils/structured-logger";

type WhatsAppWebhookPayload = {
  object?: string;
  entry?: Array<{
    changes?: Array<{
      field?: string;
      value?: {
        contacts?: Array<{
          wa_id?: string;
          profile?: {
            name?: string;
          };
        }>;
        messages?: Array<{
          id?: string;
          from?: string;
          timestamp?: string;
          type?: string;
          text?: {
            body?: string;
          };
          button?: {
            text?: string;
          };
          interactive?: {
            button_reply?: {
              title?: string;
            };
            list_reply?: {
              title?: string;
            };
          };
        }>;
        statuses?: Array<{
          id?: string;
          status?: MessageStatus | "sent";
          timestamp?: string;
          errors?: Array<{
            title?: string;
            message?: string;
          }>;
        }>;
      };
    }>;
  }>;
};

type WhatsAppInboundMessage = {
  providerMessageId: string;
  from: string;
  content: string;
  timestamp?: string;
  profileName?: string;
};

type WhatsAppStatusUpdate = {
  providerMessageId: string;
  status: MessageStatus;
  deliveredAt?: string;
  readAt?: string;
  error?: string;
};

type WhatsAppChangeValue = NonNullable<
  NonNullable<
    NonNullable<WhatsAppWebhookPayload["entry"]>[number]["changes"]
  >[number]["value"]
>;

type WhatsAppMessagePayload = NonNullable<WhatsAppChangeValue["messages"]>[number];

type DispatchOutboundMessageInput = {
  conversation: ConversationRecord;
  content: string;
};

type DispatchOutboundMessageResult = {
  status: MessageStatus;
  providerMessageId?: string;
  error?: string;
};

export type WhatsAppConnectionSnapshot = {
  provider: "cloud_api" | "web_api";
  configured: boolean;
  sessionStatus: WhatsAppWebSessionStatus;
  sessionId: string;
  qrCode: string;
  connectedPhone: string;
  error: string;
  updatedAt: string;
};

export class MessagingService {
  private readonly storage = getStorageService();

  async verifyWhatsAppWebhook(searchParams: URLSearchParams) {
    const runtimeSettings =
      await getConnectionSettingsService().getRuntimeSettings();
    const mode = searchParams.get("hub.mode");
    const challenge = searchParams.get("hub.challenge");
    const verifyToken = searchParams.get("hub.verify_token");

    if (mode !== "subscribe" || !challenge) {
      throw new HttpError(400, "Missing WhatsApp webhook verification parameters.");
    }

    if (!runtimeSettings.whatsappWebhookVerifyToken) {
      throw new HttpError(500, "WHATSAPP_WEBHOOK_VERIFY_TOKEN is not configured.");
    }

    if (verifyToken !== runtimeSettings.whatsappWebhookVerifyToken) {
      throw new HttpError(403, "Invalid WhatsApp webhook verify token.");
    }

    return challenge;
  }

  async handleWhatsAppWebhook(rawBody: string) {
    const payload = parseJsonBody(rawBody);

    if (payload.object !== "whatsapp_business_account") {
      throw new HttpError(400, "Unsupported WhatsApp webhook payload.");
    }

    const inboundMessages = extractInboundMessages(payload);
    const statusUpdates = extractStatusUpdates(payload);
    const touchedConversationIds = new Set<string>();

    for (const inboundMessage of inboundMessages) {
      const conversationId = await this.processInboundMessage(inboundMessage);

      if (conversationId) {
        touchedConversationIds.add(conversationId);
      }
    }

    for (const statusUpdate of statusUpdates) {
      const updatedMessage = await this.storage.updateMessageStatus(statusUpdate);

      if (updatedMessage) {
        touchedConversationIds.add(updatedMessage.conversationId);

        await this.storage.addLog(
          createStructuredLog({
            eventType: "message_status_updated",
            level: statusUpdate.status === "failed" ? "warn" : "info",
            message: "WhatsApp message status updated.",
            context: {
              providerMessageId: statusUpdate.providerMessageId,
              status: statusUpdate.status,
              conversationId: updatedMessage.conversationId,
              error: statusUpdate.error,
            },
          }),
        );
      }
    }

    return {
      ok: true,
      received_messages: inboundMessages.length,
      status_updates: statusUpdates.length,
      conversations_touched: touchedConversationIds.size,
    };
  }

  async getInboxSnapshot(selectedConversationId?: string): Promise<{
    conversations: ConversationThread["conversation"][];
    selectedConversation: ConversationThread["conversation"] | null;
    selectedMessages: ConversationThread["messages"];
  }> {
    const conversations = await this.storage.getInboxConversations();
    const selectedConversation =
      (selectedConversationId
        ? conversations.find(
            (conversation) => conversation.conversation_id === selectedConversationId,
          )
        : null) ??
      conversations[0] ??
      null;
    const selectedMessages = selectedConversation
      ? await this.storage.getConversationMessages(selectedConversation.conversation_id)
      : [];

    return {
      conversations,
      selectedConversation,
      selectedMessages,
    };
  }

  async getWhatsAppConnectionSnapshot(): Promise<WhatsAppConnectionSnapshot> {
    const settings = await getConnectionSettingsService().getSettings();

    return {
      provider: settings.whatsappProvider,
      configured:
        settings.whatsappProvider === "web_api"
          ? Boolean(settings.whatsappApiBaseUrl)
          : Boolean(
              settings.whatsappApiBaseUrl &&
                settings.whatsappAccessToken &&
                settings.whatsappPhoneNumberId,
            ),
      sessionStatus: settings.whatsappWebSessionStatus,
      sessionId: settings.whatsappWebSessionId,
      qrCode: settings.whatsappWebSessionQrCode,
      connectedPhone: settings.whatsappWebSessionPhone,
      error: settings.whatsappWebSessionError,
      updatedAt: settings.whatsappWebSessionUpdatedAt,
    };
  }

  async startWhatsAppWebSession() {
    const settings = await getConnectionSettingsService().getSettings();

    if (settings.whatsappProvider !== "web_api") {
      throw new HttpError(400, "QR Code is available only for WhatsApp Web API.");
    }

    if (!settings.whatsappApiBaseUrl) {
      throw new HttpError(400, "Configure the WhatsApp Web API base URL first.");
    }

    const response = await fetch(
      resolveWebApiEndpoint(settings.whatsappApiBaseUrl, "sessionStart"),
      {
        method: "POST",
        headers: {
          ...(settings.whatsappAccessToken
            ? { Authorization: `Bearer ${settings.whatsappAccessToken}` }
            : {}),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: settings.whatsappWebSessionId || "shield-recovery",
          sessionName: "shield-recovery",
        }),
      },
    );

    const payload = await safeParseJson(response);
    const nextSession = await normalizeSessionState(payload, {
      fallbackStatus: response.ok ? "pending_qr" : "error",
      fallbackSessionId: settings.whatsappWebSessionId || "shield-recovery",
    });

    await this.storage.saveConnectionSettings({
      whatsappWebSessionId: nextSession.sessionId,
      whatsappWebSessionStatus: nextSession.sessionStatus,
      whatsappWebSessionQrCode: nextSession.qrCode,
      whatsappWebSessionPhone: nextSession.connectedPhone,
      whatsappWebSessionError:
        nextSession.error ||
        (!response.ok
          ? `Nao foi possivel iniciar a sessao QR (${response.status}).`
          : ""),
      whatsappWebSessionUpdatedAt: new Date().toISOString(),
    });

    if (!response.ok) {
      throw new HttpError(
        502,
        nextSession.error || `WhatsApp Web API returned ${response.status}.`,
      );
    }

    return this.getWhatsAppConnectionSnapshot();
  }

  async refreshWhatsAppWebSession() {
    const settings = await getConnectionSettingsService().getSettings();

    if (settings.whatsappProvider !== "web_api") {
      throw new HttpError(400, "QR Code is available only for WhatsApp Web API.");
    }

    if (!settings.whatsappApiBaseUrl) {
      throw new HttpError(400, "Configure the WhatsApp Web API base URL first.");
    }

    const sessionId = settings.whatsappWebSessionId || "shield-recovery";
    const statusUrl = new URL(
      resolveWebApiEndpoint(settings.whatsappApiBaseUrl, "sessionStatus"),
    );
    statusUrl.searchParams.set("sessionId", sessionId);

    const response = await fetch(statusUrl, {
      headers: settings.whatsappAccessToken
        ? { Authorization: `Bearer ${settings.whatsappAccessToken}` }
        : undefined,
    });

    const payload = await safeParseJson(response);
    const nextSession = await normalizeSessionState(payload, {
      fallbackStatus: response.ok ? "disconnected" : "error",
      fallbackSessionId: sessionId,
    });

    await this.storage.saveConnectionSettings({
      whatsappWebSessionId: nextSession.sessionId,
      whatsappWebSessionStatus: nextSession.sessionStatus,
      whatsappWebSessionQrCode: nextSession.qrCode,
      whatsappWebSessionPhone: nextSession.connectedPhone,
      whatsappWebSessionError:
        nextSession.error ||
        (!response.ok
          ? `Nao foi possivel atualizar a sessao QR (${response.status}).`
          : ""),
      whatsappWebSessionUpdatedAt: new Date().toISOString(),
    });

    if (!response.ok) {
      throw new HttpError(
        502,
        nextSession.error || `WhatsApp Web API returned ${response.status}.`,
      );
    }

    return this.getWhatsAppConnectionSnapshot();
  }

  async disconnectWhatsAppWebSession() {
    const settings = await getConnectionSettingsService().getSettings();

    if (settings.whatsappProvider !== "web_api") {
      throw new HttpError(400, "QR Code is available only for WhatsApp Web API.");
    }

    if (settings.whatsappApiBaseUrl && settings.whatsappWebSessionId) {
      await fetch(
        resolveWebApiEndpoint(settings.whatsappApiBaseUrl, "sessionDisconnect"),
        {
          method: "POST",
          headers: {
            ...(settings.whatsappAccessToken
              ? { Authorization: `Bearer ${settings.whatsappAccessToken}` }
              : {}),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sessionId: settings.whatsappWebSessionId,
            sessionName: settings.whatsappWebSessionId,
          }),
        },
      ).catch(() => undefined);
    }

    await this.storage.saveConnectionSettings({
      whatsappWebSessionId: "",
      whatsappWebSessionStatus: "disconnected",
      whatsappWebSessionQrCode: "",
      whatsappWebSessionPhone: "",
      whatsappWebSessionError: "",
      whatsappWebSessionUpdatedAt: new Date().toISOString(),
    });

    return this.getWhatsAppConnectionSnapshot();
  }

  async dispatchOutboundMessage(
    input: DispatchOutboundMessageInput,
  ): Promise<DispatchOutboundMessageResult> {
    const content = input.content.trim();

    if (!content) {
      return {
        status: "failed",
        error: "Message content is required.",
      };
    }

    if (input.conversation.channel !== "whatsapp") {
      return {
        status: "queued",
      };
    }

    const runtimeSettings =
      await getConnectionSettingsService().getRuntimeSettings();

    if (!runtimeSettings.whatsappConfigured) {
      return {
        status: "queued",
      };
    }

    const normalizedPhone = normalizePhone(input.conversation.contactValue);

    if (!normalizedPhone) {
      return {
        status: "failed",
        error: "Conversation does not have a valid WhatsApp contact.",
      };
    }

    try {
      if (runtimeSettings.whatsappProvider === "web_api") {
        return await this.dispatchViaWebApi({
          apiBaseUrl: runtimeSettings.whatsappApiBaseUrl,
          accessToken: runtimeSettings.whatsappAccessToken,
          phone: normalizedPhone,
          content,
        });
      }

      return await this.dispatchViaCloudApi({
        apiBaseUrl: runtimeSettings.whatsappApiBaseUrl,
        accessToken: runtimeSettings.whatsappAccessToken,
        phoneNumberId: runtimeSettings.whatsappPhoneNumberId,
        phone: normalizedPhone,
        content,
      });
    } catch (error) {
      return {
        status: "failed",
        error:
          error instanceof Error
            ? error.message
            : "Unable to dispatch message to WhatsApp.",
      };
    }
  }

  getWhatsAppWebhookUrl() {
    return `${appEnv.appBaseUrl}/api/webhooks/whatsapp`;
  }

  private async processInboundMessage(message: WhatsAppInboundMessage) {
    const lead = await this.storage.findLeadByContact({ phone: message.from });
    const conversation = await this.storage.upsertConversation({
      channel: "whatsapp",
      contactValue: message.from,
      customerName: resolveCustomerName(message, lead),
      lead,
      customerId: lead?.customerId,
    });

    await this.storage.createMessage({
      conversationId: conversation.id,
      channel: "whatsapp",
      direction: "inbound",
      senderAddress: normalizePhone(message.from),
      senderName: message.profileName,
      content: message.content,
      status: "received",
      lead,
      customerId: lead?.customerId,
      providerMessageId: message.providerMessageId,
    });

    await this.storage.addLog(
      createStructuredLog({
        eventType: "message_received",
        level: "info",
        message: "Inbound WhatsApp message stored.",
        context: {
          conversationId: conversation.id,
          providerMessageId: message.providerMessageId,
          from: normalizePhone(message.from),
          matchedLeadId: lead?.leadId,
        },
      }),
    );

    return conversation.id;
  }

  private async dispatchViaCloudApi(input: {
    apiBaseUrl: string;
    accessToken: string;
    phoneNumberId: string;
    phone: string;
    content: string;
  }): Promise<DispatchOutboundMessageResult> {
    const response = await fetch(
      `${input.apiBaseUrl.replace(/\/$/, "")}/${input.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${input.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: input.phone,
          type: "text",
          text: {
            preview_url: true,
            body: input.content,
          },
        }),
      },
    );

    const payload = (await safeParseJson(response)) as
      | {
          messages?: Array<{ id?: string }>;
          error?: { message?: string };
        }
      | undefined;

    if (!response.ok) {
      return {
        status: "failed",
        error:
          payload?.error?.message ??
          `WhatsApp Cloud API returned ${response.status}.`,
      };
    }

    return {
      status: "sent",
      providerMessageId: payload?.messages?.[0]?.id,
    };
  }

  private async dispatchViaWebApi(input: {
    apiBaseUrl: string;
    accessToken: string;
    phone: string;
    content: string;
  }): Promise<DispatchOutboundMessageResult> {
    const response = await fetch(resolveWebApiEndpoint(input.apiBaseUrl, "send"), {
      method: "POST",
      headers: {
        ...(input.accessToken
          ? { Authorization: `Bearer ${input.accessToken}` }
          : {}),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: input.phone,
        type: "text",
        message: input.content,
        text: input.content,
        preview_url: true,
      }),
    });

    const payload = (await safeParseJson(response)) as
      | {
          id?: string;
          messageId?: string;
          data?: { id?: string; messageId?: string };
          messages?: Array<{ id?: string }>;
          error?: { message?: string } | string;
        }
      | undefined;

    if (!response.ok) {
      return {
        status: "failed",
        error:
          (typeof payload?.error === "string"
            ? payload.error
            : payload?.error?.message) ??
          `WhatsApp Web API returned ${response.status}.`,
      };
    }

    return {
      status: "sent",
      providerMessageId:
        payload?.id ??
        payload?.messageId ??
        payload?.data?.id ??
        payload?.data?.messageId ??
        payload?.messages?.[0]?.id,
    };
  }
}

function parseJsonBody(rawBody: string): WhatsAppWebhookPayload {
  try {
    return JSON.parse(rawBody) as WhatsAppWebhookPayload;
  } catch {
    throw new HttpError(400, "Invalid JSON payload.");
  }
}

function extractInboundMessages(payload: WhatsAppWebhookPayload): WhatsAppInboundMessage[] {
  const messages: WhatsAppInboundMessage[] = [];

  payload.entry?.forEach((entry) => {
    entry.changes?.forEach((change) => {
      if (change.field !== "messages") return;

      const value = change.value;
      const profileName = value?.contacts?.[0]?.profile?.name;

      value?.messages?.forEach((message) => {
        const content = extractMessageContent(message);

        if (!message.id || !message.from || !content) {
          return;
        }

        messages.push({
          providerMessageId: message.id,
          from: message.from,
          content,
          timestamp: message.timestamp,
          profileName,
        });
      });
    });
  });

  return messages;
}

function extractStatusUpdates(payload: WhatsAppWebhookPayload): WhatsAppStatusUpdate[] {
  const updates: WhatsAppStatusUpdate[] = [];

  payload.entry?.forEach((entry) => {
    entry.changes?.forEach((change) => {
      if (change.field !== "messages") return;

      change.value?.statuses?.forEach((status) => {
        if (!status.id || !status.status) {
          return;
        }

        const normalizedStatus = normalizeStatus(status.status);
        const timestamp = status.timestamp
          ? new Date(Number(status.timestamp) * 1000).toISOString()
          : undefined;
        const firstError = status.errors?.[0];

        updates.push({
          providerMessageId: status.id,
          status: normalizedStatus,
          deliveredAt: normalizedStatus === "delivered" ? timestamp : undefined,
          readAt: normalizedStatus === "read" ? timestamp : undefined,
          error:
            normalizedStatus === "failed"
              ? firstError?.message ?? firstError?.title ?? "WhatsApp delivery failure."
              : undefined,
        });
      });
    });
  });

  return updates;
}

function extractMessageContent(message: WhatsAppMessagePayload) {
  return (
    message.text?.body ??
    message.button?.text ??
    message.interactive?.button_reply?.title ??
    message.interactive?.list_reply?.title ??
    ""
  ).trim();
}

function normalizeStatus(status: string): MessageStatus {
  if (status === "delivered") return "delivered";
  if (status === "read") return "read";
  if (status === "failed") return "failed";
  if (status === "sent") return "sent";
  return "received";
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

function resolveWebApiEndpoint(
  baseUrl: string,
  kind: "send" | "sessionStart" | "sessionStatus" | "sessionDisconnect",
) {
  const trimmed = baseUrl.replace(/\/$/, "");
  const sessionSuffix =
    kind === "sessionStart"
      ? "/session/start"
      : kind === "sessionStatus"
        ? "/session/status"
        : kind === "sessionDisconnect"
          ? "/session/disconnect"
          : "";

  if (/\/messages\/send$/i.test(trimmed)) {
    if (kind === "send") return trimmed;
    return `${trimmed.replace(/\/messages\/send$/i, "")}${sessionSuffix}`;
  }

  if (/\/send$/i.test(trimmed)) {
    if (kind === "send") return trimmed;
    return `${trimmed.replace(/\/send$/i, "")}${sessionSuffix}`;
  }

  if (/\/messages$/i.test(trimmed)) {
    if (kind === "send") return trimmed;
    return `${trimmed.replace(/\/messages$/i, "")}${sessionSuffix}`;
  }

  if (kind === "send") {
    return `${trimmed}/messages/send`;
  }

  return `${trimmed}${sessionSuffix}`;
}

function resolveCustomerName(
  message: WhatsAppInboundMessage,
  lead?: RecoveryLeadRecord,
) {
  return message.profileName ?? lead?.customerName ?? "Contato sem identificacao";
}

async function safeParseJson(response: Response) {
  try {
    return (await response.json()) as unknown;
  } catch {
    return undefined;
  }
}

async function normalizeSessionState(
  payload: unknown,
  input: {
    fallbackStatus: WhatsAppWebSessionStatus;
    fallbackSessionId: string;
  },
) {
  const data = asRecord(payload);
  const nestedData = asRecord(data?.data);
  const source = nestedData ?? data;

  const rawStatus = firstString(
    source?.status,
    source?.state,
    source?.sessionStatus,
    source?.session_status,
  );
  const qrValue = firstString(
    source?.qrCodeDataUrl,
    source?.qrCode,
    source?.qrcode,
    source?.qr_code,
    source?.qr,
    nestedData?.qrCodeDataUrl,
    nestedData?.qrCode,
    nestedData?.qrcode,
    nestedData?.qr_code,
    nestedData?.qr,
  );
  const error = firstString(
    source?.error,
    asRecord(source?.error)?.message,
    source?.message,
  );

  return {
    sessionId:
      firstString(
        source?.sessionId,
        source?.session_id,
        source?.id,
        nestedData?.sessionId,
        nestedData?.session_id,
        nestedData?.id,
      ) ?? input.fallbackSessionId,
    sessionStatus: normalizeSessionStatus(rawStatus, input.fallbackStatus),
    qrCode: await resolveQrCode(qrValue),
    connectedPhone:
      firstString(
        source?.connectedPhone,
        source?.phone,
        source?.phoneNumber,
        source?.number,
        nestedData?.connectedPhone,
        nestedData?.phone,
        nestedData?.phoneNumber,
        nestedData?.number,
      ) ?? "",
    error: error ?? "",
  };
}

function normalizeSessionStatus(
  value: string | undefined,
  fallback: WhatsAppWebSessionStatus,
): WhatsAppWebSessionStatus {
  const normalized = value?.trim().toLowerCase();

  if (!normalized) return fallback;
  if (["connected", "authenticated", "ready", "open"].includes(normalized)) {
    return "connected";
  }
  if (
    [
      "pending_qr",
      "qr",
      "awaiting_qr",
      "awaiting_scan",
      "qrcode",
    ].includes(normalized)
  ) {
    return "pending_qr";
  }
  if (["expired", "qr_expired"].includes(normalized)) {
    return "expired";
  }
  if (["error", "failed"].includes(normalized)) {
    return "error";
  }
  if (["disconnected", "closed", "idle"].includes(normalized)) {
    return "disconnected";
  }

  return fallback;
}

async function resolveQrCode(value: string | undefined) {
  if (!value) return "";
  if (value.startsWith("data:image")) return value;
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  return QRCode.toDataURL(value, {
    margin: 1,
    width: 280,
  });
}

function asRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, unknown>;
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
}
