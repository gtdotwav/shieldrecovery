import QRCode from "qrcode";

import { getConnectionSettingsService } from "@/server/recovery/services/connection-settings-service";
import { getStorageService } from "@/server/recovery/services/storage";
import type {
  ConversationRecord,
  ConversationThread,
  MessageMetadata,
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
  metadata?: MessageMetadata;
};

type DispatchOutboundMessageResult = {
  status: MessageStatus;
  providerMessageId?: string;
  error?: string;
};

type WebApiConnectionConfig = {
  kind: "generic" | "evolution";
  baseUrl: string;
  sessionId: string;
  startUrl: string;
  statusUrl: string;
  disconnectUrl: string;
  sendUrl: string;
  accessToken: string;
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

export type WhatsAppDiagnostics = {
  provider: "cloud_api" | "web_api";
  ready: boolean;
  qrSupported: boolean;
  sessionStatus: WhatsAppWebSessionStatus;
  webhookUrl: string;
  missingFields: string[];
  warnings: string[];
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
    const cloudPayload = isCloudWhatsAppWebhookPayload(payload) ? payload : null;
    const inboundMessages = cloudPayload
      ? extractInboundMessages(cloudPayload)
      : extractWebApiInboundMessages(payload);
    const statusUpdates = cloudPayload
      ? extractStatusUpdates(cloudPayload)
      : extractWebApiStatusUpdates(payload);
    const sessionUpdate = cloudPayload ? null : await extractWebApiSessionUpdate(payload);
    const touchedConversationIds = new Set<string>();

    if (sessionUpdate) {
      await this.storage.saveConnectionSettings({
        whatsappWebSessionId: sessionUpdate.sessionId,
        whatsappWebSessionStatus: sessionUpdate.sessionStatus,
        whatsappWebSessionQrCode: sessionUpdate.qrCode,
        whatsappWebSessionPhone: sessionUpdate.connectedPhone,
        whatsappWebSessionError: sessionUpdate.error,
        whatsappWebSessionUpdatedAt: new Date().toISOString(),
      });
    }

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
      provider: cloudPayload ? "cloud_api" : "web_api",
      received_messages: inboundMessages.length,
      status_updates: statusUpdates.length,
      session_updates: sessionUpdate ? 1 : 0,
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

  async getConversationMessages(conversationId: string) {
    return this.storage.getConversationMessages(conversationId);
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

    const webApiConfig = this.resolveWebApiConfig(settings);

    if (webApiConfig.kind === "evolution") {
      return this.startEvolutionSession(webApiConfig);
    }

    return this.startGenericWebSession(webApiConfig);
  }

  async refreshWhatsAppWebSession() {
    const settings = await getConnectionSettingsService().getSettings();

    if (settings.whatsappProvider !== "web_api") {
      throw new HttpError(400, "QR Code is available only for WhatsApp Web API.");
    }

    const webApiConfig = this.resolveWebApiConfig(settings);

    if (webApiConfig.kind === "evolution") {
      return this.refreshEvolutionSession(webApiConfig);
    }

    return this.refreshGenericWebSession(webApiConfig);
  }

  async disconnectWhatsAppWebSession() {
    const settings = await getConnectionSettingsService().getSettings();

    if (settings.whatsappProvider !== "web_api") {
      throw new HttpError(400, "QR Code is available only for WhatsApp Web API.");
    }

    const webApiConfig = this.resolveWebApiConfig(settings);

    if (settings.whatsappApiBaseUrl && settings.whatsappWebSessionId) {
      if (webApiConfig.kind === "evolution") {
        await fetch(webApiConfig.disconnectUrl, {
          method: "DELETE",
          headers: buildWhatsAppApiHeaders(settings.whatsappAccessToken),
        }).catch(() => undefined);
      } else {
        await fetch(webApiConfig.disconnectUrl, {
          method: "POST",
          headers: {
            ...buildWhatsAppApiHeaders(settings.whatsappAccessToken),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sessionId: settings.whatsappWebSessionId,
            sessionName: settings.whatsappWebSessionId,
          }),
        }).catch(() => undefined);
      }
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
          sessionId: runtimeSettings.whatsappWebSessionId || "shield-recovery",
          phone: normalizedPhone,
          content,
          metadata: input.metadata,
        });
      }

      return await this.dispatchViaCloudApi({
        apiBaseUrl: runtimeSettings.whatsappApiBaseUrl,
        accessToken: runtimeSettings.whatsappAccessToken,
        phoneNumberId: runtimeSettings.whatsappPhoneNumberId,
        phone: normalizedPhone,
        content,
        metadata: input.metadata,
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

  async getWhatsAppWebhookUrl() {
    const settings = await getConnectionSettingsService().getSettings();
    return `${settings.appBaseUrl}/api/webhooks/whatsapp`;
  }

  async getWhatsAppDiagnostics(): Promise<WhatsAppDiagnostics> {
    const settings = await getConnectionSettingsService().getSettings();
    const missingFields: string[] = [];
    const warnings: string[] = [];

    if (!settings.whatsappApiBaseUrl) {
      missingFields.push("API base URL");
    }

    if (settings.whatsappProvider === "cloud_api") {
      if (!settings.whatsappAccessToken) missingFields.push("Access token");
      if (!settings.whatsappPhoneNumberId) missingFields.push("Phone number ID");
      if (!settings.whatsappWebhookVerifyToken) {
        missingFields.push("Webhook verify token");
      }
    } else {
      if (!settings.whatsappAccessToken) missingFields.push("Provider API key");
      if (!settings.whatsappWebSessionId) missingFields.push("Session ID");
      if (isCloudGraphApiUrl(settings.whatsappApiBaseUrl)) {
        warnings.push(
          "A URL atual ainda aponta para a Cloud API da Meta. QR exige um provider Web API.",
        );
      }
      if (
        settings.whatsappApiBaseUrl &&
        settings.whatsappWebSessionStatus !== "connected"
      ) {
        warnings.push("A sessão Web ainda não está conectada.");
      }
    }

    return {
      provider: settings.whatsappProvider,
      ready:
        missingFields.length === 0 &&
        warnings.length === 0 &&
        (settings.whatsappProvider === "cloud_api" ||
          settings.whatsappWebSessionStatus === "connected"),
      qrSupported: settings.whatsappProvider === "web_api",
      sessionStatus: settings.whatsappWebSessionStatus,
      webhookUrl: `${settings.appBaseUrl}/api/webhooks/whatsapp`,
      missingFields,
      warnings,
    };
  }

  private async processInboundMessage(message: WhatsAppInboundMessage) {
    const runtimeSettings =
      await getConnectionSettingsService().getRuntimeSettings();
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

    if (
      runtimeSettings.aiConfigured &&
      lead &&
      lead.status !== "RECOVERED" &&
      lead.status !== "LOST"
    ) {
      const { getPaymentRecoveryService } = await import(
        "@/server/recovery/services/payment-recovery-service"
      );
      const recoveryService = getPaymentRecoveryService();
      const automationPolicy = await recoveryService.getAutomationPolicyForSeller(
        lead.assignedAgentName,
      );

      if (automationPolicy.enabled && automationPolicy.autonomous) {
        await recoveryService.sendAiConversationReply({
          conversationId: conversation.id,
        });
      }
    }

    return conversation.id;
  }

  private async dispatchViaCloudApi(input: {
    apiBaseUrl: string;
    accessToken: string;
    phoneNumberId: string;
    phone: string;
    content: string;
    metadata?: MessageMetadata;
  }): Promise<DispatchOutboundMessageResult> {
    const body = buildOutboundWhatsAppText(input.content, input.metadata);
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
            body,
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
    sessionId: string;
    phone: string;
    content: string;
    metadata?: MessageMetadata;
  }): Promise<DispatchOutboundMessageResult> {
    const body = buildOutboundWhatsAppText(input.content, input.metadata);
    const config = resolveWebApiConfig(input.apiBaseUrl, input.sessionId);
    const payment =
      input.metadata?.kind === "recovery_prompt"
        ? {
            url: input.metadata.paymentUrl ?? input.metadata.retryLink,
            pixCode: input.metadata.pixCode,
            pixQrCode: input.metadata.pixQrCode,
            amount: input.metadata.paymentValue,
            method: input.metadata.paymentMethod,
            actionLabel: input.metadata.actionLabel,
          }
        : undefined;

    const response =
      config.kind === "evolution"
        ? await fetch(config.sendUrl, {
            method: "POST",
            headers: {
              ...buildWhatsAppApiHeaders(input.accessToken),
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              number: input.phone,
              text: body,
            }),
          })
        : await fetch(config.sendUrl, {
            method: "POST",
            headers: {
              ...buildWhatsAppApiHeaders(input.accessToken),
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              to: input.phone,
              type: "text",
              message: body,
              text: body,
              preview_url: true,
              payment,
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
    const payloadKey = asRecord(payload)?.key
      ? asRecord(asRecord(payload)?.key)
      : undefined;

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
        firstString(payloadKey?.id) ??
        payload?.data?.id ??
        payload?.data?.messageId ??
        payload?.messages?.[0]?.id,
    };
  }

  private resolveWebApiConfig(settings: {
    whatsappApiBaseUrl: string;
    whatsappAccessToken: string;
    whatsappWebSessionId: string;
  }): WebApiConnectionConfig {
    if (!settings.whatsappApiBaseUrl) {
      throw new HttpError(400, "Configure a URL base do provider WhatsApp Web.");
    }

    if (isCloudGraphApiUrl(settings.whatsappApiBaseUrl)) {
      throw new HttpError(
        400,
        "A URL atual ainda aponta para a Cloud API da Meta. QR Code exige um provider WhatsApp Web, como Evolution API.",
      );
    }

    return resolveWebApiConfig(
      settings.whatsappApiBaseUrl,
      settings.whatsappWebSessionId || "shield-recovery",
      settings.whatsappAccessToken,
    );
  }

  private async startGenericWebSession(config: WebApiConnectionConfig) {
    const response = await fetch(config.startUrl, {
      method: "POST",
      headers: {
        ...buildWhatsAppApiHeaders(config.accessToken),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sessionId: config.sessionId,
        sessionName: config.sessionId,
      }),
    });

    const payload = await safeParseJson(response);
    const nextSession = await normalizeSessionState(payload, {
      fallbackStatus: response.ok ? "pending_qr" : "error",
      fallbackSessionId: config.sessionId,
    });

    await this.persistSessionSnapshot(nextSession, response, "iniciar");

    if (!response.ok) {
      throw new HttpError(
        502,
        nextSession.error || `WhatsApp Web API returned ${response.status}.`,
      );
    }

    return this.getWhatsAppConnectionSnapshot();
  }

  private async refreshGenericWebSession(config: WebApiConnectionConfig) {
    const statusUrl = new URL(config.statusUrl);

    if (!config.statusUrl.includes("{sessionId}") && !statusUrl.searchParams.has("sessionId")) {
      statusUrl.searchParams.set("sessionId", config.sessionId);
    }

    const response = await fetch(statusUrl, {
      headers: buildWhatsAppApiHeaders(config.accessToken),
    });

    const payload = await safeParseJson(response);
    const nextSession = await normalizeSessionState(payload, {
      fallbackStatus: response.ok ? "disconnected" : "error",
      fallbackSessionId: config.sessionId,
    });

    await this.persistSessionSnapshot(nextSession, response, "atualizar");

    if (!response.ok) {
      throw new HttpError(
        502,
        nextSession.error || `WhatsApp Web API returned ${response.status}.`,
      );
    }

    return this.getWhatsAppConnectionSnapshot();
  }

  private async startEvolutionSession(config: WebApiConnectionConfig) {
    let response = await fetch(config.startUrl, {
      method: "GET",
      headers: buildWhatsAppApiHeaders(config.accessToken),
    });

    if (response.status === 404) {
      await this.ensureEvolutionInstance(config).catch(() => undefined);
      response = await fetch(config.startUrl, {
        method: "GET",
        headers: buildWhatsAppApiHeaders(config.accessToken),
      });
    }

    const payload = await safeParseJson(response);
    const nextSession = await normalizeSessionState(payload, {
      fallbackStatus: response.ok ? "pending_qr" : "error",
      fallbackSessionId: config.sessionId,
    });

    let warning = "";

    if (response.ok) {
      warning = await this.configureEvolutionWebhook(config);
    }

    await this.persistSessionSnapshot(nextSession, response, "iniciar", warning);

    if (!response.ok) {
      throw new HttpError(
        502,
        nextSession.error || `Evolution API returned ${response.status}.`,
      );
    }

    return this.getWhatsAppConnectionSnapshot();
  }

  private async refreshEvolutionSession(config: WebApiConnectionConfig) {
    const statusResponse = await fetch(config.statusUrl, {
      method: "GET",
      headers: buildWhatsAppApiHeaders(config.accessToken),
    });
    const statusPayload = await safeParseJson(statusResponse);

    let nextSession = await normalizeSessionState(statusPayload, {
      fallbackStatus: statusResponse.ok ? "disconnected" : "error",
      fallbackSessionId: config.sessionId,
    });
    let activeResponse = statusResponse;
    let warning = "";

    if (
      statusResponse.ok &&
      nextSession.sessionStatus !== "connected" &&
      nextSession.sessionStatus !== "pending_qr"
    ) {
      const connectResponse = await fetch(config.startUrl, {
        method: "GET",
        headers: buildWhatsAppApiHeaders(config.accessToken),
      });
      const connectPayload = await safeParseJson(connectResponse);
      nextSession = await normalizeSessionState(connectPayload, {
        fallbackStatus: connectResponse.ok ? "pending_qr" : "error",
        fallbackSessionId: config.sessionId,
      });
      activeResponse = connectResponse;
    }

    if (activeResponse.ok) {
      warning = await this.configureEvolutionWebhook(config);
    }

    await this.persistSessionSnapshot(nextSession, activeResponse, "atualizar", warning);

    if (!activeResponse.ok) {
      throw new HttpError(
        502,
        nextSession.error || `Evolution API returned ${activeResponse.status}.`,
      );
    }

    return this.getWhatsAppConnectionSnapshot();
  }

  private async ensureEvolutionInstance(config: WebApiConnectionConfig) {
    const response = await fetch(joinUrl(config.baseUrl, "/instance/create"), {
      method: "POST",
      headers: {
        ...buildWhatsAppApiHeaders(config.accessToken),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        instanceName: config.sessionId,
        integration: "WHATSAPP-BAILEYS",
        qrcode: true,
      }),
    });

    if (response.ok || response.status === 409) {
      return;
    }

    const payload = await safeParseJson(response);
    const message = extractWebApiError(payload);

    if (message.toLowerCase().includes("already") || message.toLowerCase().includes("exists")) {
      return;
    }

    throw new HttpError(502, message || "Nao foi possivel criar a instancia no provider WhatsApp.");
  }

  private async configureEvolutionWebhook(config: WebApiConnectionConfig) {
    const response = await fetch(joinUrl(config.baseUrl, `/webhook/set/${config.sessionId}`), {
      method: "POST",
      headers: {
        ...buildWhatsAppApiHeaders(config.accessToken),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        webhook: {
          enabled: true,
          url: await this.getWhatsAppWebhookUrl(),
          webhook_by_events: false,
          webhook_base64: false,
          events: [
            "MESSAGES_UPSERT",
            "MESSAGES_UPDATE",
            "QRCODE_UPDATED",
            "CONNECTION_UPDATE",
            "SEND_MESSAGE",
          ],
        },
      }),
    }).catch(() => null);

    if (!response || response.ok) {
      return "";
    }

    const payload = await safeParseJson(response);
    const message = extractWebApiError(payload);

    await this.storage.addLog(
      createStructuredLog({
        eventType: "processing_error",
        level: "warn",
        message: "WhatsApp provider webhook could not be configured automatically.",
        context: {
          provider: "evolution",
          sessionId: config.sessionId,
          status: response.status,
          error: message,
        },
      }),
    );

    return message
      ? `Sessao aberta, mas o webhook do provider precisa de revisao: ${message}`
      : "Sessao aberta, mas o webhook do provider nao foi configurado automaticamente.";
  }

  private async persistSessionSnapshot(
    nextSession: {
      sessionId: string;
      sessionStatus: WhatsAppWebSessionStatus;
      qrCode: string;
      connectedPhone: string;
      error: string;
    },
    response: Response,
    action: "iniciar" | "atualizar",
    warning = "",
  ) {
    await this.storage.saveConnectionSettings({
      whatsappWebSessionId: nextSession.sessionId,
      whatsappWebSessionStatus: nextSession.sessionStatus,
      whatsappWebSessionQrCode: nextSession.qrCode,
      whatsappWebSessionPhone: nextSession.connectedPhone,
      whatsappWebSessionError:
        warning ||
        nextSession.error ||
        (!response.ok
          ? `Nao foi possivel ${action} a sessao QR (${response.status}).`
          : ""),
      whatsappWebSessionUpdatedAt: new Date().toISOString(),
    });
  }
}

function parseJsonBody(rawBody: string): unknown {
  try {
    return JSON.parse(rawBody) as unknown;
  } catch {
    throw new HttpError(400, "Invalid JSON payload.");
  }
}

function isCloudWhatsAppWebhookPayload(payload: unknown): payload is WhatsAppWebhookPayload {
  const record = asRecord(payload);
  return record?.object === "whatsapp_business_account";
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

function extractWebApiInboundMessages(payload: unknown): WhatsAppInboundMessage[] {
  const payloadRecord = asRecord(payload);

  if (!payloadRecord) {
    return [];
  }

  const event = firstString(
    payloadRecord.event,
    payloadRecord.eventType,
    payloadRecord.type,
  )?.toLowerCase();
  const data = asRecord(payloadRecord.data);
  const source = hasWebApiMessageShape(data) ? data : payloadRecord;
  const key = asRecord(source?.key);
  const message = asRecord(source?.message);
  const fromMe = coerceBoolean(key?.fromMe ?? source?.fromMe);

  if (fromMe) {
    return [];
  }

  if (
    event &&
    ![
      "messages.upsert",
      "messages_upsert",
      "message.upsert",
      "message_created",
      "message",
    ].includes(event) &&
    !hasWebApiMessageShape(source)
  ) {
    return [];
  }

  const providerMessageId = firstString(key?.id, payloadRecord.id);
  const from = normalizeWhatsAppRemoteJid(
    firstString(
      key?.remoteJid,
      key?.participant,
      source?.remoteJid,
      source?.from,
      payloadRecord.sender,
      payloadRecord.from,
    ),
  );
  const content = extractWebApiMessageContent(message, source);

  if (!providerMessageId || !from || !content) {
    return [];
  }

  return [
    {
      providerMessageId,
      from,
      content,
      timestamp: firstString(
        source?.messageTimestamp,
        payloadRecord.date_time,
        payloadRecord.timestamp,
      ),
      profileName: firstString(source?.pushName, payloadRecord.pushName),
    },
  ];
}

function extractWebApiStatusUpdates(payload: unknown): WhatsAppStatusUpdate[] {
  const payloadRecord = asRecord(payload);

  if (!payloadRecord) {
    return [];
  }

  const event = firstString(
    payloadRecord.event,
    payloadRecord.eventType,
    payloadRecord.type,
  )?.toLowerCase();

  if (!event || !["messages.update", "messages_update", "send_message"].includes(event)) {
    return [];
  }

  const data = asRecord(payloadRecord.data);
  const key = asRecord(data?.key);
  const providerMessageId = firstString(key?.id, data?.id, payloadRecord.id);
  const rawStatus = firstString(data?.status, payloadRecord.status);

  if (!providerMessageId || !rawStatus) {
    return [];
  }

  return [
    {
      providerMessageId,
      status: normalizeProviderStatus(rawStatus),
      error:
        normalizeProviderStatus(rawStatus) === "failed"
          ? firstString(data?.error, payloadRecord.error)
          : undefined,
    },
  ];
}

async function extractWebApiSessionUpdate(payload: unknown) {
  const payloadRecord = asRecord(payload);

  if (!payloadRecord) {
    return null;
  }

  const event = firstString(
    payloadRecord.event,
    payloadRecord.eventType,
    payloadRecord.type,
  )?.toLowerCase();
  const data = asRecord(payloadRecord.data);
  const source = data ?? payloadRecord;
  const instance = asRecord(source?.instance);
  const hasSessionSignal = Boolean(
    event &&
      [
        "qrcode_updated",
        "connection_update",
        "connection.update",
        "application_startup",
      ].includes(event),
  );

  if (
    !hasSessionSignal &&
    !firstString(source?.code, source?.qrcode, source?.qrCode, instance?.state, source?.state)
  ) {
    return null;
  }

  return normalizeSessionState(payload, {
    fallbackStatus: "disconnected",
    fallbackSessionId:
      firstString(
        source?.sessionId,
        source?.session_id,
        instance?.instanceName,
        payloadRecord.instance,
      ) ?? "shield-recovery",
  });
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

function normalizeWhatsAppRemoteJid(value?: string) {
  if (!value) return "";
  return value.replace(/@.+$/, "");
}

function buildOutboundWhatsAppText(content: string, metadata?: MessageMetadata) {
  if (metadata?.kind !== "recovery_prompt") {
    return content;
  }

  const sections = [content.trim()];
  const actionUrl = metadata.paymentUrl ?? metadata.retryLink;

  if (actionUrl && !content.includes(actionUrl)) {
    sections.push(`Link de pagamento:\n${actionUrl}`);
  }

  if (metadata.pixCode && !content.includes(metadata.pixCode)) {
    sections.push(`Codigo Pix copia e cola:\n${metadata.pixCode}`);
  }

  return sections.filter(Boolean).join("\n\n");
}

function resolveWebApiConfig(
  baseUrl: string,
  sessionId: string,
  accessToken = "",
): WebApiConnectionConfig {
  const trimmedBaseUrl = baseUrl.trim().replace(/\/$/, "");
  const normalizedSessionId = sessionId.trim() || "shield-recovery";
  const genericSendMatch =
    /\/messages\/send$/i.test(trimmedBaseUrl) ||
    /\/messages$/i.test(trimmedBaseUrl) ||
    /\/send$/i.test(trimmedBaseUrl);

  if (genericSendMatch) {
    return {
      kind: "generic",
      baseUrl: trimmedBaseUrl,
      sessionId: normalizedSessionId,
      accessToken,
      startUrl: resolveGenericWebApiEndpoint(trimmedBaseUrl, "sessionStart"),
      statusUrl: resolveGenericWebApiEndpoint(trimmedBaseUrl, "sessionStatus"),
      disconnectUrl: resolveGenericWebApiEndpoint(trimmedBaseUrl, "sessionDisconnect"),
      sendUrl: resolveGenericWebApiEndpoint(trimmedBaseUrl, "send"),
    };
  }

  return {
    kind: "evolution",
    baseUrl: trimmedBaseUrl,
    sessionId: normalizedSessionId,
    accessToken,
    startUrl: joinUrl(trimmedBaseUrl, `/instance/connect/${encodeURIComponent(normalizedSessionId)}`),
    statusUrl: joinUrl(
      trimmedBaseUrl,
      `/instance/connectionState/${encodeURIComponent(normalizedSessionId)}`,
    ),
    disconnectUrl: joinUrl(
      trimmedBaseUrl,
      `/instance/logout/${encodeURIComponent(normalizedSessionId)}`,
    ),
    sendUrl: joinUrl(
      trimmedBaseUrl,
      `/message/sendText/${encodeURIComponent(normalizedSessionId)}`,
    ),
  };
}

function resolveGenericWebApiEndpoint(
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
  const instance = asRecord(source?.instance);
  const nestedInstance = asRecord(nestedData?.instance);

  const rawStatus = firstString(
    source?.status,
    source?.state,
    source?.sessionStatus,
    source?.session_status,
    source?.connectionStatus,
    instance?.state,
    nestedInstance?.state,
  );
  const qrValue = firstString(
    source?.qrCodeDataUrl,
    source?.qrCode,
    source?.qrcode,
    source?.qr_code,
    source?.qr,
    source?.code,
    nestedData?.qrCodeDataUrl,
    nestedData?.qrCode,
    nestedData?.qrcode,
    nestedData?.qr_code,
    nestedData?.qr,
    nestedData?.code,
  );
  const error = firstString(
    source?.error,
    asRecord(source?.error)?.message,
    source?.message,
    asRecord(source?.response)?.message,
  );

  return {
    sessionId:
      firstString(
        source?.sessionId,
        source?.session_id,
        source?.id,
        instance?.instanceName,
        nestedInstance?.instanceName,
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
        source?.owner,
        source?.ownerJid,
        nestedData?.connectedPhone,
        nestedData?.phone,
        nestedData?.phoneNumber,
        nestedData?.number,
        instance?.owner,
        nestedInstance?.owner,
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

function buildWhatsAppApiHeaders(accessToken: string): Record<string, string> {
  if (!accessToken) {
    return {};
  }

  return {
    Authorization: `Bearer ${accessToken}`,
    apikey: accessToken,
  };
}

function joinUrl(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

function isCloudGraphApiUrl(value: string) {
  return /graph\.facebook\.com/i.test(value);
}

function extractWebApiMessageContent(
  message: Record<string, unknown> | undefined,
  source: Record<string, unknown> | undefined,
) {
  const extendedTextMessage = asRecord(message?.extendedTextMessage);
  const imageMessage = asRecord(message?.imageMessage);
  const videoMessage = asRecord(message?.videoMessage);
  const buttonsResponseMessage = asRecord(message?.buttonsResponseMessage);
  const listResponseMessage = asRecord(message?.listResponseMessage);

  return (
    firstString(
      message?.conversation,
      extendedTextMessage?.text,
      imageMessage?.caption,
      videoMessage?.caption,
      buttonsResponseMessage?.selectedDisplayText,
      buttonsResponseMessage?.selectedButtonId,
      listResponseMessage?.title,
      listResponseMessage?.singleSelectReply &&
        asRecord(listResponseMessage.singleSelectReply)?.selectedRowId,
      source?.body,
      source?.text,
    ) ?? ""
  ).trim();
}

function hasWebApiMessageShape(value: Record<string, unknown> | undefined) {
  return Boolean(
    value &&
      ((asRecord(value.key) && asRecord(value.message)) ||
        value.pushName ||
        value.messageTimestamp),
  );
}

function coerceBoolean(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    return value.toLowerCase() === "true";
  }
  return false;
}

function normalizeProviderStatus(status: string): MessageStatus {
  const normalized = status.trim().toLowerCase();

  if (["received", "receive"].includes(normalized)) return "received";
  if (["sent", "success"].includes(normalized)) return "sent";
  if (["delivered", "delivery_ack"].includes(normalized)) return "delivered";
  if (["read", "read_ack"].includes(normalized)) return "read";
  if (["failed", "error"].includes(normalized)) return "failed";

  return "received";
}

function extractWebApiError(payload: unknown) {
  const record = asRecord(payload);
  const response = asRecord(record?.response);
  const error = asRecord(record?.error);

  return (
    firstString(
      record?.message,
      response?.message,
      error?.message,
      typeof record?.error === "string" ? record.error : undefined,
    ) ?? ""
  );
}
