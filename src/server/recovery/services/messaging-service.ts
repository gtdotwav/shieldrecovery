import QRCode from "qrcode";

import { platformBrand } from "@/lib/platform";
import { getConnectionSettingsService } from "@/server/recovery/services/connection-settings-service";
import { getStorageService } from "@/server/recovery/services/storage";
import type {
  ConversationRecord,
  ConversationThread,
  MessageMetadata,
  MessageRecord,
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
      try {
        const conversationId = await this.processInboundMessage(inboundMessage);

        if (conversationId) {
          touchedConversationIds.add(conversationId);
        }
      } catch (error) {
        await this.storage.addLog(
          createStructuredLog({
            eventType: "processing_error",
            level: "error",
            message: `Failed to process inbound message from ${inboundMessage.from}.`,
            context: {
              error: error instanceof Error ? error.message : String(error),
            },
          }),
        ).catch((err) => console.error("[messaging] log error:", err));
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
        }).catch((err) => console.error("[messaging] disconnect error:", err));
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
        }).catch((err) => console.error("[messaging] disconnect error:", err));
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

    // Validate template parameters when metadata contains recovery/ai template fields
    if (input.metadata) {
      const templateParams: Array<{ key: string; value: unknown }> = [
        { key: "customerName", value: input.metadata.customerName },
        { key: "productName", value: input.metadata.productName },
        { key: "paymentUrl", value: input.metadata.paymentUrl },
        { key: "retryLink", value: input.metadata.retryLink },
        { key: "pixCode", value: input.metadata.pixCode },
      ];

      for (let i = 0; i < templateParams.length; i++) {
        const param = templateParams[i];
        if (param.value !== undefined && param.value !== null) {
          const strValue = String(param.value).trim();
          if (!strValue) {
            console.warn(
              `[messaging] Template parameter "${param.key}" (index ${i}) is empty for conversation ${input.conversation.id}. Using "N/A" fallback.`,
            );
            // Patch the metadata value with fallback
            (input.metadata as Record<string, unknown>)[param.key] = "N/A";
          }
        }
      }
    }

    // Opt-out & frequency guard
    let complianceCheckFailed = false;
    try {
      const { canContactLead } = await import(
        "@/server/recovery/services/frequency-service"
      );
      const guard = await canContactLead({
        contactValue: input.conversation.contactValue,
        channel: input.conversation.channel,
      });
      if (!guard.allowed) {
        return {
          status: "failed",
          error: guard.reason ?? "Contact blocked by compliance rules.",
        };
      }
    } catch (complianceError) {
      // Non-blocking — if compliance check fails, proceed with send but flag it
      console.error("[messaging] Compliance check failed, proceeding with send:", complianceError);
      complianceCheckFailed = true;
    }

    if (input.conversation.channel === "email") {
      const result = await this.dispatchViaEmail({
        conversation: input.conversation,
        content,
        metadata: input.metadata,
        complianceCheckFailed,
      });
      return result;
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
      let result: DispatchOutboundMessageResult;

      // Per-seller WhatsApp instance routing: if the conversation is assigned
      // to a seller with their own connected WhatsApp, send through their instance.
      let sellerInstanceOverride: {
        baseUrl: string;
        accessToken: string;
        instanceName: string;
      } | null = null;

      if (
        runtimeSettings.whatsappProvider === "web_api" &&
        input.conversation.assignedAgentName
      ) {
        try {
          const { getSellerWhatsAppService } = await import(
            "@/server/recovery/services/seller-whatsapp-service"
          );
          sellerInstanceOverride =
            await getSellerWhatsAppService().resolveSellerInstance(
              input.conversation.assignedAgentName,
            );
        } catch {
          // Seller instance resolution failed — fall back to platform default
        }
      }

      if (runtimeSettings.whatsappProvider === "web_api") {
        result = await this.dispatchViaWebApi({
          apiBaseUrl: sellerInstanceOverride?.baseUrl ?? runtimeSettings.whatsappApiBaseUrl,
          accessToken: sellerInstanceOverride?.accessToken ?? runtimeSettings.whatsappAccessToken,
          sessionId:
            sellerInstanceOverride?.instanceName ??
            (runtimeSettings.whatsappWebSessionId || platformBrand.slug),
          phone: normalizedPhone,
          content,
          metadata: input.metadata,
        });
      } else {
        result = await this.dispatchViaCloudApi({
          apiBaseUrl: runtimeSettings.whatsappApiBaseUrl,
          accessToken: runtimeSettings.whatsappAccessToken,
          phoneNumberId: runtimeSettings.whatsappPhoneNumberId,
          phone: normalizedPhone,
          content,
          metadata: input.metadata,
        });
      }

      // Log frequency after successful dispatch
      if (result.status === "sent") {
        try {
          const { logOutboundContact } = await import(
            "@/server/recovery/services/frequency-service"
          );
          await logOutboundContact({
            contactValue: input.conversation.contactValue,
            channel: "whatsapp",
            messageId: result.providerMessageId,
          });
        } catch {
          // Non-critical — frequency logging should not block dispatch
        }
      }

      if (complianceCheckFailed && result.status === "sent") {
        return { ...result, error: "compliance_check_skipped" };
      }

      return result;
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

  private async dispatchViaEmail(input: {
    conversation: ConversationRecord;
    content: string;
    metadata?: MessageMetadata;
    complianceCheckFailed?: boolean;
  }): Promise<DispatchOutboundMessageResult> {
    const runtimeSettings =
      await getConnectionSettingsService().getRuntimeSettings();

    if (!runtimeSettings.emailConfigured) {
      return {
        status: "queued",
        error: "Email is not configured (missing SendGrid API key).",
      };
    }

    const recipientEmail = input.conversation.contactValue;

    if (!recipientEmail || !recipientEmail.includes("@")) {
      return {
        status: "failed",
        error: "Conversation does not have a valid email address.",
      };
    }

    const sendgridApiKey = runtimeSettings.emailApiKey;
    const fromAddress = runtimeSettings.emailFromAddress || platformBrand.contactEmail || "noreply@pagrecovery.com";

    try {
      const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sendgridApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: recipientEmail }] }],
          from: { email: fromAddress, name: platformBrand.name },
          subject: `${platformBrand.name} - Recuperacao de pagamento`,
          content: [{ type: "text/plain", value: input.content }],
        }),
      });

      if (!response.ok) {
        const errorBody = await safeParseJson(response);
        const errorRecord = asRecord(errorBody);
        const errors = Array.isArray(errorRecord?.errors) ? errorRecord.errors : [];
        const firstError = asRecord(errors[0]);
        const errorMessage =
          firstString(firstError?.message) ??
          `SendGrid API returned ${response.status}.`;

        return {
          status: "failed",
          error: errorMessage,
        };
      }

      // SendGrid returns 202 Accepted with no body on success
      const providerMessageId = response.headers.get("x-message-id") ?? undefined;

      // Log frequency after successful email dispatch
      try {
        const { logOutboundContact } = await import(
          "@/server/recovery/services/frequency-service"
        );
        await logOutboundContact({
          contactValue: input.conversation.contactValue,
          channel: "email",
          messageId: providerMessageId,
        });
      } catch {
        // Non-critical — frequency logging should not block dispatch
      }

      const result: DispatchOutboundMessageResult = {
        status: "sent",
        providerMessageId,
      };

      if (input.complianceCheckFailed) {
        return { ...result, error: "compliance_check_skipped" };
      }

      return result;
    } catch (error) {
      return {
        status: "failed",
        error:
          error instanceof Error
            ? error.message
            : "Unable to dispatch email via SendGrid.",
      };
    }
  }

  async retryFailedMessage(messageId: string): Promise<DispatchOutboundMessageResult> {
    // Find the message by iterating conversations in inbox
    const inboxSnapshot = await this.getInboxSnapshot();
    let targetMessage: MessageRecord | undefined;
    let targetConversation: ConversationRecord | undefined;

    for (const conv of inboxSnapshot.conversations) {
      const convMessages = await this.storage.getConversationMessages(conv.conversation_id);
      const found = convMessages.find((m) => m.id === messageId);
      if (found) {
        targetMessage = found;
        targetConversation = await this.storage.findConversationById(conv.conversation_id) ?? undefined;
        break;
      }
    }

    if (!targetMessage) {
      return {
        status: "failed",
        error: `Message ${messageId} not found.`,
      };
    }

    if (targetMessage.status !== "failed") {
      return {
        status: "failed",
        error: `Message ${messageId} is not in failed state (current: ${targetMessage.status}).`,
      };
    }

    const attempts = (targetMessage.metadata?.retryAttempts as number | undefined) ?? 0;
    if (attempts >= 3) {
      return {
        status: "failed",
        error: `Message ${messageId} has exhausted retry attempts (${attempts}/3).`,
      };
    }

    if (!targetConversation) {
      return {
        status: "failed",
        error: `Conversation not found for message ${messageId}.`,
      };
    }

    // Re-dispatch the message
    const result = await this.dispatchOutboundMessage({
      conversation: targetConversation,
      content: targetMessage.content,
      metadata: {
        ...targetMessage.metadata,
        retryAttempts: attempts + 1,
        retriedFromMessageId: messageId,
      },
    });

    // Update the original message status
    await this.storage.updateMessageById({
      messageId,
      status: result.status,
      providerMessageId: result.providerMessageId,
      error: result.error,
    });

    return result;
  }

  async dispatchPaymentMethodButtons(input: {
    conversation: ConversationRecord;
    bodyText: string;
    metadata?: MessageMetadata;
  }): Promise<DispatchOutboundMessageResult> {
    if (input.conversation.channel !== "whatsapp") {
      return { status: "queued" };
    }

    const runtimeSettings =
      await getConnectionSettingsService().getRuntimeSettings();

    if (!runtimeSettings.whatsappConfigured) {
      return { status: "queued" };
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
        return await this.dispatchButtonsViaWebApi({
          apiBaseUrl: runtimeSettings.whatsappApiBaseUrl,
          accessToken: runtimeSettings.whatsappAccessToken,
          sessionId: runtimeSettings.whatsappWebSessionId || platformBrand.slug,
          phone: normalizedPhone,
          bodyText: input.bodyText,
        });
      }

      return await this.dispatchButtonsViaCloudApi({
        apiBaseUrl: runtimeSettings.whatsappApiBaseUrl,
        accessToken: runtimeSettings.whatsappAccessToken,
        phoneNumberId: runtimeSettings.whatsappPhoneNumberId,
        phone: normalizedPhone,
        bodyText: input.bodyText,
      });
    } catch {
      // Fallback to plain text if buttons fail
      return this.dispatchOutboundMessage({
        conversation: input.conversation,
        content: input.bodyText,
        metadata: input.metadata,
      });
    }
  }

  private async dispatchButtonsViaCloudApi(input: {
    apiBaseUrl: string;
    accessToken: string;
    phoneNumberId: string;
    phone: string;
    bodyText: string;
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
          type: "interactive",
          interactive: {
            type: "button",
            body: { text: input.bodyText },
            action: {
              buttons: [
                { type: "reply", reply: { id: "pix", title: "PIX" } },
                {
                  type: "reply",
                  reply: { id: "cartao", title: "Cartao de credito" },
                },
                { type: "reply", reply: { id: "boleto", title: "Boleto" } },
              ],
            },
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
      throw new Error(
        payload?.error?.message ??
          `WhatsApp Cloud API interactive message failed (${response.status}).`,
      );
    }

    return {
      status: "sent",
      providerMessageId: payload?.messages?.[0]?.id,
    };
  }

  private async dispatchButtonsViaWebApi(input: {
    apiBaseUrl: string;
    accessToken: string;
    sessionId: string;
    phone: string;
    bodyText: string;
  }): Promise<DispatchOutboundMessageResult> {
    const config = resolveWebApiConfig(input.apiBaseUrl, input.sessionId);

    if (config.kind === "evolution") {
      // Evolution API: use sendText instead of sendButtons.
      // sendButtons returns 200 but silently fails to deliver on baileys/Web WhatsApp.
      const textUrl = joinUrl(
        config.baseUrl,
        `/message/sendText/${encodeURIComponent(config.sessionId)}`,
      );

      const response = await fetch(textUrl, {
        method: "POST",
        headers: {
          ...buildWhatsAppApiHeaders(input.accessToken),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          number: input.phone,
          text: input.bodyText,
        }),
        signal: AbortSignal.timeout(15_000),
      });

      if (!response.ok) {
        throw new Error(`Evolution API sendText failed (${response.status}).`);
      }

      const payload = (await safeParseJson(response)) as
        | { key?: { id?: string }; id?: string }
        | undefined;

      return {
        status: "sent",
        providerMessageId:
          firstString(asRecord(payload)?.id) ??
          firstString(asRecord(asRecord(payload)?.key)?.id),
      };
    }

    // Generic Web API: send as plain text (buttons not supported)
    const response = await fetch(config.sendUrl, {
      method: "POST",
      headers: {
        ...buildWhatsAppApiHeaders(input.accessToken),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: input.phone,
        type: "text",
        message: input.bodyText,
        text: input.bodyText,
        preview_url: false,
      }),
    });

    const payload = (await safeParseJson(response)) as
      | { id?: string; messageId?: string; data?: { id?: string } }
      | undefined;

    if (!response.ok) {
      throw new Error(`Web API text fallback failed (${response.status}).`);
    }

    return {
      status: "sent",
      providerMessageId:
        payload?.id ?? payload?.messageId ?? payload?.data?.id,
    };
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

    // Opt-out keyword detection
    try {
      const { detectOptOutIntent, processOptOut, getOptOutConfirmation } =
        await import("@/server/recovery/services/opt-out-service");
      if (detectOptOutIntent(message.content)) {
        await processOptOut({
          contactValue: message.from,
          channel: "whatsapp",
          source: "inbound_keyword",
        });

        // Cancel pending cadence steps for this lead by marking it LOST
        // (worker jobs check lead status and skip LOST leads automatically)
        if (lead && lead.status !== "RECOVERED" && lead.status !== "LOST") {
          await this.storage.updateLeadStatus({
            leadId: lead.leadId,
            status: "LOST",
          }).catch((err) => {
            console.error("[messaging] Failed to mark lead as LOST after opt-out:", err);
          });
        }

        // Send opt-out confirmation message to the customer
        const confirmContent = getOptOutConfirmation();
        const confirmResult = await this.dispatchOutboundMessage({
          conversation,
          content: confirmContent,
          metadata: { kind: "operator_note", generatedBy: "workflow" },
        });

        await this.storage.createMessage({
          conversationId: conversation.id,
          channel: "whatsapp",
          direction: "outbound",
          senderAddress: "system",
          content: confirmContent,
          status: confirmResult.status,
          providerMessageId: confirmResult.providerMessageId,
          error: confirmResult.error,
          metadata: { kind: "operator_note", generatedBy: "workflow" },
        });

        await this.storage.addLog(
          createStructuredLog({
            eventType: "opt_out_processed",
            level: "info",
            message: "Customer opted out via inbound keyword.",
            context: {
              conversationId: conversation.id,
              from: message.from,
              leadId: lead?.leadId,
              confirmationStatus: confirmResult.status,
            },
          }),
        );

        return conversation.id; // Stop further processing (no AI reply)
      }
    } catch (err) {
      console.error("[messaging] Opt-out detection error", err);
    }

    if (
      runtimeSettings.aiConfigured &&
      lead &&
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
        try {
          await recoveryService.sendAiConversationReply({
            conversationId: conversation.id,
          });
        } catch (error) {
          await this.storage.addLog(
            createStructuredLog({
              eventType: "processing_error",
              level: "error",
              message: "AI reply failed after inbound message.",
              context: {
                conversationId: conversation.id,
                error: error instanceof Error ? error.message : String(error),
              },
            }),
          ).catch((err) => console.error("[messaging] log error:", err));
        }
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
    const messagesUrl = `${input.apiBaseUrl.replace(/\/$/, "")}/${input.phoneNumberId}/messages`;
    const headers = {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
    };

    const paymentUrl = extractPaymentUrl(input.metadata);
    let usedCtaButton = false;
    let response: Response;

    if (paymentUrl) {
      // CTA URL button — native WhatsApp interactive button that opens checkout
      const bodyText = buildOutboundWhatsAppText(input.content, input.metadata, true);
      const ctaLabel = buildCtaButtonLabel(input.metadata);

      response = await fetch(messagesUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: input.phone,
          type: "interactive",
          interactive: {
            type: "cta_url",
            body: { text: bodyText },
            action: {
              name: "cta_url",
              parameters: {
                display_text: ctaLabel,
                url: paymentUrl,
              },
            },
          },
        }),
      });

      if (response.ok) {
        usedCtaButton = true;
      } else {
        // CTA button failed — fallback to plain text with link
        console.warn("[messaging] Cloud API CTA button failed, falling back to text.");
        const fallbackBody = buildOutboundWhatsAppText(input.content, input.metadata, false);
        response = await fetch(messagesUrl, {
          method: "POST",
          headers,
          body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: input.phone,
            type: "text",
            text: { preview_url: true, body: fallbackBody },
          }),
        });
      }
    } else {
      // No payment URL — send as regular text
      const body = buildOutboundWhatsAppText(input.content, input.metadata, false);
      response = await fetch(messagesUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: input.phone,
          type: "text",
          text: { preview_url: true, body },
        }),
      });
    }

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

    if (usedCtaButton) {
      console.info(`[messaging] CTA button sent to ${input.phone} → ${paymentUrl}`);
    }

    // Send PIX code as separate message (code only, no label) for easy copy on WhatsApp
    const pixCode = extractPixCodeForSeparateMessage(input.metadata);
    if (pixCode && payload?.messages?.[0]?.id) {
      try {
        await fetch(messagesUrl, {
          method: "POST",
          headers,
          body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: input.phone,
            type: "text",
            text: { preview_url: false, body: pixCode },
          }),
        });
      } catch {
        // non-critical — main message was already sent
      }
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
    const config = resolveWebApiConfig(input.apiBaseUrl, input.sessionId);
    const apiHeaders = {
      ...buildWhatsAppApiHeaders(input.accessToken),
      "Content-Type": "application/json",
    };

    const paymentUrl = extractPaymentUrl(input.metadata);
    let usedCtaButton = false;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- guaranteed assigned in all branches below
    let response!: Response;

    if (paymentUrl && config.kind === "evolution") {
      // Evolution API: try CTA URL button via sendButtons endpoint
      const bodyText = buildOutboundWhatsAppText(input.content, input.metadata, true);
      const ctaLabel = buildCtaButtonLabel(input.metadata);
      const buttonsUrl = joinUrl(
        config.baseUrl,
        `/message/sendButtons/${encodeURIComponent(config.sessionId)}`,
      );

      try {
        const btnResponse = await fetch(buttonsUrl, {
          method: "POST",
          headers: apiHeaders,
          body: JSON.stringify({
            number: input.phone,
            title: "",
            description: bodyText,
            buttons: [
              {
                type: "url",
                displayText: ctaLabel,
                url: paymentUrl,
              },
            ],
          }),
          signal: AbortSignal.timeout(15_000),
        });

        if (btnResponse.ok) {
          response = btnResponse;
          usedCtaButton = true;
        } else {
          console.warn("[messaging] Evolution sendButtons failed, falling back to text.");
        }
      } catch {
        console.warn("[messaging] Evolution sendButtons threw, falling back to text.");
      }

      if (!usedCtaButton) {
        // Fallback to plain text with link
        const fallbackBody = buildOutboundWhatsAppText(input.content, input.metadata, false);
        response = await fetch(config.sendUrl, {
          method: "POST",
          headers: apiHeaders,
          body: JSON.stringify({ number: input.phone, text: fallbackBody }),
          signal: AbortSignal.timeout(30_000),
        });
      }
    } else if (config.kind === "evolution") {
      // Evolution API: plain text (no payment URL)
      const body = buildOutboundWhatsAppText(input.content, input.metadata, false);
      response = await fetch(config.sendUrl, {
        method: "POST",
        headers: apiHeaders,
        body: JSON.stringify({ number: input.phone, text: body }),
        signal: AbortSignal.timeout(30_000),
      });
    } else {
      // Generic Web API: plain text (buttons not supported)
      const body = buildOutboundWhatsAppText(input.content, input.metadata, false);
      response = await fetch(config.sendUrl, {
        method: "POST",
        headers: apiHeaders,
        body: JSON.stringify({
          to: input.phone,
          type: "text",
          message: body,
          text: body,
          preview_url: true,
        }),
        signal: AbortSignal.timeout(30_000),
      });
    }

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
      const errorMessage = extractWebApiError(payload);

      return {
        status: "failed",
        error: errorMessage || `WhatsApp Web API returned ${response.status}.`,
      };
    }

    const providerMessageId =
      payload?.id ??
      payload?.messageId ??
      firstString(payloadKey?.id) ??
      payload?.data?.id ??
      payload?.data?.messageId ??
      payload?.messages?.[0]?.id;

    if (usedCtaButton) {
      console.info(`[messaging] CTA button sent via Evolution to ${input.phone} → ${paymentUrl}`);
    }

    // Send PIX code as separate message (code only, no label) for easy copy on WhatsApp
    const pixCode = extractPixCodeForSeparateMessage(input.metadata);
    if (pixCode && providerMessageId) {
      try {
        if (config.kind === "evolution") {
          await fetch(config.sendUrl, {
            method: "POST",
            headers: apiHeaders,
            body: JSON.stringify({ number: input.phone, text: pixCode }),
            signal: AbortSignal.timeout(30_000),
          });
        } else {
          await fetch(config.sendUrl, {
            method: "POST",
            headers: apiHeaders,
            body: JSON.stringify({
              to: input.phone,
              type: "text",
              message: pixCode,
              text: pixCode,
              preview_url: false,
            }),
            signal: AbortSignal.timeout(30_000),
          });
        }
      } catch {
        // non-critical — main message was already sent
      }
    }

    return {
      status: "sent",
      providerMessageId,
    };
  }

  private async sendEvolutionMedia(input: {
    config: WebApiConnectionConfig;
    accessToken: string;
    phone: string;
    base64Image: string;
    caption?: string;
  }) {
    const mediaUrl = joinUrl(
      input.config.baseUrl,
      `/message/sendMedia/${encodeURIComponent(input.config.sessionId)}`,
    );

    // Strip data URL prefix to get raw base64
    const base64Data = input.base64Image.replace(/^data:image\/\w+;base64,/, "");

    const response = await fetch(mediaUrl, {
      method: "POST",
      headers: {
        ...buildWhatsAppApiHeaders(input.accessToken),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        number: input.phone,
        mediatype: "image",
        mimetype: "image/png",
        media: base64Data,
        caption: input.caption ?? "",
        fileName: "pix-qrcode.png",
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      throw new Error(`Evolution sendMedia failed (${response.status}).`);
    }
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
      settings.whatsappWebSessionId || platformBrand.slug,
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
      await this.ensureEvolutionInstance(config).catch((err) => console.error("[messaging] ensureEvolutionInstance error:", err));
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
    }).catch((err) => {
      console.error("[messaging] ensureEvolutionInstance webhook setup error:", err);
      return null;
    });

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
      ) ?? platformBrand.slug,
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
  return normalizeBrazilPhone(value.replace(/\D/g, ""));
}

function normalizeWhatsAppRemoteJid(value?: string) {
  if (!value) return "";
  return value.replace(/@.+$/, "");
}

/**
 * Extract payment URL from metadata if present (used for CTA buttons).
 */
function extractPaymentUrl(metadata?: MessageMetadata): string | null {
  if (!metadata || (metadata.kind !== "recovery_prompt" && metadata.kind !== "ai_draft")) {
    return null;
  }
  const url = (metadata.paymentUrl ?? metadata.retryLink)?.trim();
  return url || null;
}

/**
 * Build CTA button label based on messaging approach.
 */
function buildCtaButtonLabel(metadata?: MessageMetadata): string {
  const approach = metadata?.messagingApproach ?? "friendly";
  if (approach === "urgent") return "Pagar agora";
  if (approach === "professional") return "Finalizar pagamento";
  return "Pagar agora";
}

/**
 * Build the WhatsApp text body. When CTA buttons are used, the payment link
 * is NOT appended to the text (the button handles it). Otherwise, the link
 * is inlined as a clickable URL.
 */
function buildOutboundWhatsAppText(content: string, metadata?: MessageMetadata, ctaButtonUsed = false) {
  if (!metadata || (metadata.kind !== "recovery_prompt" && metadata.kind !== "ai_draft")) {
    return content;
  }

  const approach = metadata.messagingApproach ?? "friendly";
  const sections = [content.trim()];

  // Only inline the payment link when CTA button is NOT being used
  if (!ctaButtonUsed) {
    const actionUrl = (metadata.paymentUrl ?? metadata.retryLink)?.trim();
    if (actionUrl && !content.includes(actionUrl)) {
      const linkLabel =
        approach === "urgent"
          ? "Finalize agora"
          : approach === "professional"
            ? "Link de pagamento"
            : "Segue o link pra voce finalizar";
      sections.push(`${linkLabel} 👇\n${actionUrl}`);
    }
  }

  // When PIX code will be sent as a separate message, add the label here
  // so the customer knows the code is coming right after
  const pixCode = metadata.pixCode?.trim();
  if (pixCode) {
    const pixLabel =
      approach === "urgent"
        ? "Pix copia e cola (expira em breve) 👇"
        : approach === "professional"
          ? "Pix copia e cola 👇"
          : "Pix copia e cola pra facilitar 👇";
    sections.push(pixLabel);
  }

  return sections.filter(Boolean).join("\n\n");
}

function extractPixCodeForSeparateMessage(metadata?: MessageMetadata): string | null {
  if (!metadata || (metadata.kind !== "recovery_prompt" && metadata.kind !== "ai_draft")) {
    return null;
  }
  const pixCode = metadata.pixCode?.trim();
  if (!pixCode) return null;
  return pixCode;
}

function resolveWebApiConfig(
  baseUrl: string,
  sessionId: string,
  accessToken = "",
): WebApiConnectionConfig {
  const trimmedBaseUrl = baseUrl.trim().replace(/\/$/, "");
  const normalizedSessionId = sessionId.trim() || platformBrand.slug;
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
  const responseMessage = response?.message;
  const responseMessageItems = Array.isArray(responseMessage)
    ? responseMessage
        .map((item) => {
          const entry = asRecord(item);

          return firstString(
            typeof item === "string" ? item : undefined,
            entry?.message,
            entry?.error,
            typeof entry?.number === "string" && entry?.exists === false
              ? `Numero ${entry.number} nao existe no WhatsApp.`
              : undefined,
            typeof entry?.jid === "string" && entry?.exists === false
              ? `JID ${entry.jid} nao existe no WhatsApp.`
              : undefined,
          );
        })
        .filter((item): item is string => Boolean(item))
    : [];

  return (
    firstString(
      ...responseMessageItems,
      record?.message,
      typeof responseMessage === "string" ? responseMessage : undefined,
      error?.message,
      typeof record?.error === "string" ? record.error : undefined,
    ) ?? ""
  );
}

function normalizeBrazilPhone(value: string) {
  const digits = value.replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  if (digits.startsWith("55")) {
    return digits;
  }

  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }

  return digits;
}
