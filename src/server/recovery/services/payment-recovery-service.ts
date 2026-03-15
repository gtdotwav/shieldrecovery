import { randomUUID } from "node:crypto";

import {
  createOrUpdateShieldLead,
  markShieldLeadLost,
  markShieldLeadRecovered,
} from "@/server/recovery/crm/shield-lead-crm";
import { RecoveryAutomationService } from "@/server/recovery/services/recovery-automation";
import { getConnectionSettingsService } from "@/server/recovery/services/connection-settings-service";
import { MessagingService } from "@/server/recovery/services/messaging-service";
import { getStorageService } from "@/server/recovery/services/storage";
import { generateMessage } from "@/server/recovery/ai/message-generator";
import type {
  ConversationRecord,
  CustomerRecord,
  ConversationStatus,
  FollowUpContact,
  MessageMetadata,
  MessageRecord,
  NormalizedPaymentEvent,
  PaymentRecord,
  QueueJobRecord,
  RecoveryLeadRecord,
  RecoveryLeadStatus,
  RetryPaymentInput,
  RecoverablePaymentEvent,
} from "@/server/recovery/types";
import {
  RECOVERABLE_PAYMENT_EVENTS,
  type SupportedPaymentEvent,
} from "@/server/recovery/types";
import { HttpError } from "@/server/recovery/utils/http-error";
import { createStructuredLog } from "@/server/recovery/utils/structured-logger";
import {
  assertFreshTimestamp,
  parseWebhookTimestamp,
  verifyShieldGatewaySignature,
} from "@/server/recovery/utils/webhook-signature";
import { normalizeShieldGatewayEvent } from "@/server/recovery/webhooks/event-normalizer";

const RECOVERABLE_EVENT_SET = new Set<string>(RECOVERABLE_PAYMENT_EVENTS);

export class PaymentRecoveryService {
  private readonly storage = getStorageService();
  private readonly automation = new RecoveryAutomationService();
  private readonly messaging = new MessagingService();

  async handleShieldGatewayWebhook(input: {
    signature: string | null;
    webhookId: string | null;
    timestampHeader: string | null;
    rawBody: string;
  }) {
    const runtimeSettings =
      await getConnectionSettingsService().getRuntimeSettings();
    if (!input.webhookId) {
      throw new HttpError(400, "Missing X-Webhook-ID header.");
    }

    const timestamp = parseWebhookTimestamp(input.timestampHeader);
    assertFreshTimestamp(timestamp, runtimeSettings.webhookToleranceSeconds);

    verifyShieldGatewaySignature({
      providedSignature: input.signature,
      secret: runtimeSettings.webhookSecret,
      timestamp,
      rawBody: input.rawBody,
    });

    const existingEvent = await this.storage.findWebhookByWebhookId(input.webhookId);

    if (existingEvent) {
      return {
        ok: true,
        duplicate: true,
        webhook_id: input.webhookId,
        event_id: existingEvent.eventId,
        event_type: existingEvent.eventType,
      };
    }

    const payload = parseJsonBody(input.rawBody);
    const webhookRecord = await this.createInboundRecord(payload, input.webhookId);

    await this.storage.addLog(
      createStructuredLog({
        eventType: "webhook_received",
        level: "info",
        message: "Shield Gateway webhook received.",
        context: {
          webhookId: input.webhookId,
          timestamp,
        },
      }),
    );

    try {
      return await this.processInboundPayload({
        payload,
        webhookId: input.webhookId,
        webhookRecordId: webhookRecord.id,
        timestamp,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown processing error.";

      await this.storage.markWebhookFailed(webhookRecord.id, errorMessage);
      await this.storage.addLog(
        createStructuredLog({
          eventType: "processing_error",
          level: "error",
          message: "Webhook processing failed.",
          context: {
            webhookId: input.webhookId,
            error: errorMessage,
          },
        }),
      );
      throw error;
    }
  }

  async importShieldTransactionPayload(rawBody: string) {
    const payload = parseJsonBody(rawBody);
    const fallbackId = `import_${extractRawEventId(payload, randomUUID())}`;
    const existingEvent = await this.storage.findWebhookByWebhookId(fallbackId);

    if (existingEvent) {
      return {
        ok: true,
        duplicate: true,
        webhook_id: fallbackId,
        event_id: existingEvent.eventId,
        event_type: existingEvent.eventType,
      };
    }

    const webhookRecord = await this.createInboundRecord(payload, fallbackId);
    await this.storage.addLog(
      createStructuredLog({
        eventType: "webhook_received",
        level: "info",
        message: "Shield transaction imported manually.",
        context: {
          webhookId: fallbackId,
        },
      }),
    );

    try {
      return await this.processInboundPayload({
        payload,
        webhookId: fallbackId,
        webhookRecordId: webhookRecord.id,
        timestamp: Math.floor(Date.now() / 1000),
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown import error.";

      await this.storage.markWebhookFailed(webhookRecord.id, errorMessage);
      throw error;
    }
  }

  async createPaymentRetry(input: RetryPaymentInput, requestBaseUrl?: string) {
    if (!input.payment_id && !input.gateway_payment_id && !input.order_id) {
      throw new HttpError(
        400,
        "Provide payment_id, gateway_payment_id or order_id to generate a retry link.",
      );
    }

    const payment = await this.storage.findPayment({
      paymentId: input.payment_id,
      gatewayPaymentId: input.gateway_payment_id,
      orderId: input.order_id,
    });

    if (!payment) {
      throw new HttpError(404, "Payment not found.");
    }

    const runtimeSettings =
      await getConnectionSettingsService().getRuntimeSettings();
    const baseUrl = requestBaseUrl ?? runtimeSettings.appBaseUrl;
    const retryToken = randomUUID();
    const paymentLink = `${baseUrl}/retry/${payment.gatewayPaymentId}?token=${retryToken}`;
    const attempt = await this.storage.createPaymentAttempt({
      paymentId: payment.id,
      paymentLink,
      failureReason: input.reason ?? payment.failureCode,
    });
    const jobs = await this.automation.scheduleRetry({ payment, attempt });

    await this.storage.addLog(
      createStructuredLog({
        eventType: "retry_attempt",
        level: "info",
        message: "Payment retry link generated.",
        context: {
          paymentId: payment.id,
          gatewayPaymentId: payment.gatewayPaymentId,
          attemptNumber: attempt.attemptNumber,
        },
      }),
    );

    return {
      ok: true,
      payment_id: payment.id,
      gateway_payment_id: payment.gatewayPaymentId,
      attempt_number: attempt.attemptNumber,
      payment_link: paymentLink,
      queue_jobs: jobs.map((job) => ({
        queue: job.queueName,
        type: job.jobType,
        run_at: job.runAt,
      })),
    };
  }

  async getRecoveryAnalytics() {
    return this.storage.getAnalytics();
  }

  async getFollowUpContacts(): Promise<FollowUpContact[]> {
    return this.storage.getFollowUpContacts();
  }

  async moveLeadToStatus(input: {
    leadId: string;
    status: RecoveryLeadStatus;
  }) {
    const lead = await this.storage.updateLeadStatus(input);

    if (!lead) {
      throw new HttpError(404, "Lead not found.");
    }

    await this.storage.addLog(
      createStructuredLog({
        eventType: "recovery_started",
        level: "info",
        message: "Lead status updated from the operator workspace.",
        context: {
          leadId: input.leadId,
          status: input.status,
        },
      }),
    );

    return lead;
  }

  async addManualConversationMessage(input: {
    conversationId: string;
    content: string;
    senderName?: string;
  }) {
    const conversation = await this.storage.findConversationById(input.conversationId);

    if (!conversation) {
      throw new HttpError(404, "Conversation not found.");
    }

    const trimmedContent = input.content.trim();

    if (!trimmedContent) {
      throw new HttpError(400, "Message content is required.");
    }

    return this.createAndDispatchConversationMessage({
      conversation,
      content: trimmedContent,
      senderName: input.senderName ?? "Operacao Shield",
      metadata: {
        kind: "operator_note",
        generatedBy: "operator",
      },
      logMessage: "Manual outbound message registered in inbox.",
      logContext: {
        conversationId: conversation.id,
        channel: conversation.channel,
      },
    });
  }

  async sendAiConversationReply(input: { conversationId: string }) {
    const conversation = await this.storage.findConversationById(input.conversationId);

    if (!conversation) {
      throw new HttpError(404, "Conversation not found.");
    }

    const messages = await this.storage.getConversationMessages(conversation.id);
    const latestInbound = [...messages]
      .reverse()
      .find((message) => message.direction === "inbound");

    const contact = conversation.leadId
      ? (await this.getFollowUpContacts()).find(
          (item) => item.lead_id === conversation.leadId,
        ) ?? null
      : null;
    const payment = contact
      ? await this.storage.findPayment({
          gatewayPaymentId: contact.gateway_payment_id,
        })
      : undefined;
    const retryLink =
      [...messages]
        .reverse()
        .find((message) => message.metadata?.retryLink)
        ?.metadata?.retryLink ??
      (payment && contact
        ? await this.createImmediatePaymentLink(
            payment,
            contact.payment_status,
            contact.payment_method,
            await this.resolveAppBaseUrl(),
          )
        : undefined);

    const content = buildAiReplyContent({
      contact,
      latestInboundContent: latestInbound?.content,
      retryLink,
    });

    const message = await this.createAndDispatchConversationMessage({
      conversation,
      content,
      senderName: "IA Shield",
      metadata: {
        kind: "ai_draft",
        generatedBy: "ai",
        product: contact?.product,
        paymentMethod: contact?.payment_method,
        paymentStatus: contact?.payment_status,
        paymentValue: contact?.payment_value,
        orderId: contact?.order_id,
        gatewayPaymentId: contact?.gateway_payment_id,
        retryLink,
        actionLabel: retryLink ? "Abrir pagamento" : undefined,
      },
      logMessage: "AI reply generated for conversation.",
      eventType: "ai_reply_generated",
      logContext: {
        conversationId: conversation.id,
        leadId: conversation.leadId,
      },
    });

    return message;
  }

  async updateConversationStatus(input: {
    conversationId: string;
    status: ConversationStatus;
  }) {
    const conversation = await this.storage.updateConversationStatus(input);

    if (!conversation) {
      throw new HttpError(404, "Conversation not found.");
    }

    await this.storage.addLog(
      createStructuredLog({
        eventType: "recovery_started",
        level: "info",
        message: "Conversation status updated from inbox.",
        context: {
          conversationId: input.conversationId,
          status: input.status,
        },
      }),
    );

    return conversation;
  }

  async getHealthSummary(requestBaseUrl?: string) {
    const runtimeSettings =
      await getConnectionSettingsService().getRuntimeSettings();
    const baseUrl = requestBaseUrl ?? runtimeSettings.appBaseUrl;

    return {
      ok: true,
      service: "shield-recovery",
      webhook_url: `${baseUrl}/api/webhooks/shield-gateway`,
      whatsapp_webhook_url: `${baseUrl}/api/webhooks/whatsapp`,
      timestamp: new Date().toISOString(),
      signing: {
        algorithm: "HMAC-SHA256",
        format: "sha256=<hex_digest_of_timestamp_dot_raw_body>",
        tolerance_seconds: runtimeSettings.webhookToleranceSeconds,
      },
      storage_mode: this.storage.mode,
      database_configured: runtimeSettings.databaseConfigured,
      required_headers: ["X-Signature", "X-Webhook-ID", "X-Timestamp"],
      integrations: {
        whatsapp: runtimeSettings.whatsappConfigured,
        email: runtimeSettings.emailConfigured,
        crm: runtimeSettings.crmConfigured,
        ai: runtimeSettings.aiConfigured,
      },
    };
  }

  private async createInboundRecord(payload: unknown, webhookId: string) {
    const optimisticEventType = extractRawEventType(payload);

    return this.storage.createWebhookEvent({
      webhookId,
      eventId: extractRawEventId(payload, webhookId),
      eventType: optimisticEventType ?? "unknown",
      payload,
    });
  }

  private async processInboundPayload(input: {
    payload: unknown;
    webhookId: string;
    webhookRecordId: string;
    timestamp: number;
  }) {
    const normalizedEvent = normalizeShieldGatewayEvent(input.payload, {
      webhookId: input.webhookId,
      timestamp: input.timestamp,
    });
    const customer = await this.storage.upsertCustomer(normalizedEvent);
    const payment = await this.storage.upsertPayment(normalizedEvent, customer.id);

    let lead: RecoveryLeadRecord | null = null;
    let jobs: QueueJobRecord[] = [];

    if (isRecoverableEvent(normalizedEvent.event_type)) {
      lead = await createOrUpdateShieldLead({
        payment,
        customer,
        normalizedEvent,
        status: "NEW_RECOVERY",
      });
      jobs = await this.automation.scheduleRecovery({
        lead,
        payment,
        event: normalizedEvent,
      });
      await this.prepareInitialFollowUp({
        lead,
        payment,
        customer,
        event: normalizedEvent,
      });

      await this.storage.addLog(
        createStructuredLog({
          eventType: "payment_failed",
          level: "warn",
          message: "Recoverable payment detected.",
          context: {
            paymentId: payment.id,
            gatewayPaymentId: payment.gatewayPaymentId,
            eventType: normalizedEvent.event_type,
          },
        }),
      );

      await this.storage.addLog(
        createStructuredLog({
          eventType: "recovery_started",
          level: "info",
          message: "Recovery workflow started.",
          context: {
            leadId: lead.leadId,
            assignedAgent: lead.assignedAgentName,
            paymentId: payment.id,
          },
        }),
      );
    } else if (shouldCreateFollowUpLead(normalizedEvent.event_type)) {
      lead = await createOrUpdateShieldLead({
        payment,
        customer,
        normalizedEvent,
        status: "WAITING_CUSTOMER",
      });
      await this.prepareInitialFollowUp({
        lead,
        payment,
        customer,
        event: normalizedEvent,
      });

      await this.storage.addLog(
        createStructuredLog({
          eventType: "recovery_started",
          level: "info",
          message: "Follow-up lead created from an open payment.",
          context: {
            leadId: lead.leadId,
            assignedAgent: lead.assignedAgentName,
            paymentId: payment.id,
            eventType: normalizedEvent.event_type,
          },
        }),
      );
    }

    if (normalizedEvent.event_type === "payment_succeeded") {
      lead = (await markShieldLeadRecovered(payment.id)) ?? null;

      await this.storage.addLog(
        createStructuredLog({
          eventType: "payment_recovered",
          level: "info",
          message: "Payment recovered successfully.",
          context: {
            paymentId: payment.id,
            leadId: lead?.leadId,
            amount: payment.amount,
          },
        }),
      );
    }

    if (
      normalizedEvent.event_type === "payment_canceled" ||
      normalizedEvent.event_type === "payment_chargeback"
    ) {
      lead = (await markShieldLeadLost(payment.id)) ?? null;
    }

    await this.storage.markWebhookProcessed({
      webhookRecordId: input.webhookRecordId,
      eventId: normalizedEvent.event_id,
      eventType: normalizedEvent.event_type,
    });

    return {
      ok: true,
      duplicate: false,
      webhook_id: input.webhookId,
      normalized_event: normalizedEvent,
      payment: {
        id: payment.id,
        gateway_payment_id: payment.gatewayPaymentId,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
      },
      lead: lead
        ? {
            lead_id: lead.leadId,
            status: lead.status,
            assigned_agent: lead.assignedAgentName ?? null,
            email: lead.email,
            phone: lead.phone,
          }
        : null,
      queue_jobs: jobs.map((job) => ({
        queue: job.queueName,
        type: job.jobType,
        run_at: job.runAt,
      })),
    };
  }

  private async prepareInitialFollowUp(input: {
    lead: RecoveryLeadRecord;
    payment: PaymentRecord;
    customer: CustomerRecord;
    event: NormalizedPaymentEvent;
  }) {
    const target = resolveFollowUpTarget(input.customer);

    if (!target) {
      return null;
    }

    const conversation = await this.storage.upsertConversation({
      channel: target.channel,
      contactValue: target.contactValue,
      customerName: input.customer.name,
      lead: input.lead,
      customerId: input.customer.id,
    });

    const existingMessages = await this.storage.getConversationMessages(
      conversation.id,
    );
    const alreadyPrepared = existingMessages.some(
      (message) =>
        message.direction === "outbound" &&
        message.metadata?.kind === "recovery_prompt" &&
        message.metadata?.gatewayPaymentId === input.payment.gatewayPaymentId,
    );

    if (alreadyPrepared) {
      return null;
    }

    const runtimeSettings =
      await getConnectionSettingsService().getRuntimeSettings();
    const paymentLink = await this.createImmediatePaymentLink(
      input.payment,
      input.event.payment.failure_code ?? input.payment.failureCode,
      input.payment.paymentMethod,
      runtimeSettings.appBaseUrl,
    );

    const generated = generateMessage({
      customerName: input.customer.name,
      productName: input.lead.product,
      cartValue: input.payment.amount,
      failureReason:
        input.event.payment.failure_code ??
        input.payment.failureCode ??
        input.payment.status,
      channel: target.channel,
      attemptNumber: 1,
      paymentLink,
    });

    return this.createAndDispatchConversationMessage({
      conversation,
      lead: input.lead,
      customerId: input.customer.id,
      content: generated.content,
      senderName: "Shield Recovery",
      metadata: {
        kind: "recovery_prompt",
        generatedBy: "workflow",
        product: input.lead.product,
        paymentMethod: input.payment.paymentMethod,
        paymentStatus: input.payment.status,
        failureReason:
          input.event.payment.failure_code ?? input.payment.failureCode,
        paymentValue: input.payment.amount,
        orderId: input.payment.orderId,
        gatewayPaymentId: input.payment.gatewayPaymentId,
        retryLink: paymentLink,
        actionLabel:
          input.payment.paymentMethod.toLowerCase() === "pix"
            ? "Abrir pagamento"
            : "Finalizar pagamento",
      },
      logMessage: "Initial follow-up prepared from webhook.",
      logContext: {
        leadId: input.lead.leadId,
        conversationId: conversation.id,
        channel: target.channel,
        paymentId: input.payment.id,
      },
    });
  }

  private async createImmediatePaymentLink(
    payment: PaymentRecord,
    failureReason: string | undefined,
    paymentMethod: string,
    baseUrl: string,
  ) {
    const paymentLink = `${baseUrl}/retry/${payment.gatewayPaymentId}?token=${randomUUID()}`;

    await this.storage.createPaymentAttempt({
      paymentId: payment.id,
      paymentLink,
      failureReason: failureReason ?? payment.failureCode ?? paymentMethod,
    });

    return paymentLink;
  }

  private async resolveAppBaseUrl() {
    const runtimeSettings =
      await getConnectionSettingsService().getRuntimeSettings();
    return runtimeSettings.appBaseUrl;
  }

  private async createAndDispatchConversationMessage(input: {
    conversation: ConversationRecord;
    lead?: RecoveryLeadRecord;
    customerId?: string;
    content: string;
    senderName: string;
    metadata?: MessageMetadata;
    logMessage: string;
    logContext?: Record<string, unknown>;
    eventType?: "recovery_started" | "ai_reply_generated";
  }): Promise<MessageRecord> {
    const resolvedLead =
      input.lead ??
      (input.conversation.channel === "whatsapp" || input.conversation.channel === "sms"
        ? await this.storage.findLeadByContact({
            phone: input.conversation.contactValue,
          })
        : await this.storage.findLeadByContact({
            email: input.conversation.contactValue,
          }));
    const dispatch = await this.messaging.dispatchOutboundMessage({
      conversation: input.conversation,
      content: input.content,
    });

    const message = await this.storage.createMessage({
      conversationId: input.conversation.id,
      channel: input.conversation.channel,
      direction: "outbound",
      senderAddress: "shield-recovery",
      senderName: input.senderName,
      content: input.content,
      status: dispatch.status,
      lead: resolvedLead,
      customerId:
        input.customerId ?? input.conversation.customerId ?? resolvedLead?.customerId,
      providerMessageId: dispatch.providerMessageId,
      error: dispatch.error,
      metadata: input.metadata,
    });

    await this.storage.updateConversationStatus({
      conversationId: input.conversation.id,
      status: "pending",
    });

    await this.storage.addLog(
      createStructuredLog({
        eventType: "message_dispatched",
        level:
          dispatch.status === "failed"
            ? "warn"
            : dispatch.status === "queued"
              ? "info"
              : "info",
        message:
          dispatch.status === "sent"
            ? "Outbound message dispatched."
            : dispatch.status === "queued"
              ? "Outbound message queued waiting for channel."
              : "Outbound message failed to dispatch.",
        context: {
          conversationId: input.conversation.id,
          channel: input.conversation.channel,
          messageId: message.id,
          providerMessageId: dispatch.providerMessageId,
          status: dispatch.status,
          error: dispatch.error,
        },
      }),
    );

    await this.storage.addLog(
      createStructuredLog({
        eventType: input.eventType ?? "recovery_started",
        level: dispatch.status === "failed" ? "warn" : "info",
        message: input.logMessage,
        context: {
          ...input.logContext,
          messageId: message.id,
          deliveryStatus: dispatch.status,
          providerMessageId: dispatch.providerMessageId,
          dispatchError: dispatch.error,
        },
      }),
    );

    return message;
  }
}

declare global {
  var __paymentRecoveryService__: PaymentRecoveryService | undefined;
}

export function getPaymentRecoveryService(): PaymentRecoveryService {
  const currentService = globalThis.__paymentRecoveryService__;

  if (
    !currentService ||
    typeof currentService.moveLeadToStatus !== "function" ||
    typeof currentService.addManualConversationMessage !== "function" ||
    typeof currentService.updateConversationStatus !== "function" ||
    typeof currentService.sendAiConversationReply !== "function"
  ) {
    globalThis.__paymentRecoveryService__ = new PaymentRecoveryService();
  }

  return globalThis.__paymentRecoveryService__ as PaymentRecoveryService;
}

function parseJsonBody(rawBody: string): unknown {
  try {
    return JSON.parse(rawBody);
  } catch {
    throw new HttpError(400, "Webhook body must be valid JSON.");
  }
}

function extractRawEventType(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return undefined;
  }

  const value =
    (payload as Record<string, unknown>).event_type ??
    (payload as Record<string, unknown>).type;

  return typeof value === "string" ? value : undefined;
}

function extractRawEventId(payload: unknown, fallbackWebhookId: string): string {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return fallbackWebhookId;
  }

  const value =
    (payload as Record<string, unknown>).event_id ??
    (payload as Record<string, unknown>).id;

  return typeof value === "string" && value.trim() ? value : fallbackWebhookId;
}

function isRecoverableEvent(eventType: SupportedPaymentEvent): eventType is RecoverablePaymentEvent {
  return RECOVERABLE_EVENT_SET.has(eventType);
}

function shouldCreateFollowUpLead(eventType: SupportedPaymentEvent): boolean {
  return (
    eventType === "payment_created" ||
    eventType === "payment_pending" ||
    eventType === "payment_processing"
  );
}

function resolveFollowUpTarget(customer: CustomerRecord): {
  channel: "whatsapp" | "email";
  contactValue: string;
} | null {
  if (customer.phone && customer.phone !== "not_provided") {
    return {
      channel: "whatsapp",
      contactValue: customer.phone,
    };
  }

  if (customer.email && customer.email !== "unknown@shield.local") {
    return {
      channel: "email",
      contactValue: customer.email,
    };
  }

  return null;
}

function buildAiReplyContent(input: {
  contact: FollowUpContact | null;
  latestInboundContent?: string;
  retryLink?: string;
}) {
  const name = firstName(input.contact?.customer_name ?? "Cliente");
  const product = input.contact?.product ? ` do pedido ${input.contact.product}` : "";
  const latestInbound = (input.latestInboundContent ?? "").toLowerCase();
  const retrySentence = input.retryLink
    ? `\n\nSegue o link para concluir agora: ${input.retryLink}`
    : "";

  if (
    latestInbound.includes("pix") ||
    latestInbound.includes("link") ||
    latestInbound.includes("codigo")
  ) {
    return `Oi, ${name}. Separei novamente o acesso ao pagamento${product} para facilitar seu follow-up.${retrySentence}`;
  }

  if (
    latestInbound.includes("erro") ||
    latestInbound.includes("não foi") ||
    latestInbound.includes("nao foi") ||
    latestInbound.includes("cartão") ||
    latestInbound.includes("cartao")
  ) {
    return `Oi, ${name}. Entendi o problema no pagamento${product}. Posso te ajudar a retomar por um novo link seguro agora.${retrySentence}`;
  }

  if (
    latestInbound.includes("depois") ||
    latestInbound.includes("mais tarde") ||
    latestInbound.includes("amanhã") ||
    latestInbound.includes("amanha")
  ) {
    return `Perfeito, ${name}. Vou deixar o pagamento${product} pronto para quando você quiser finalizar.${retrySentence}`;
  }

  return `Oi, ${name}. Estou acompanhando seu caso${product} e já deixei a continuação do pagamento pronta para você.${retrySentence}`;
}

function firstName(value: string) {
  return value.trim().split(/\s+/)[0] || "Cliente";
}
