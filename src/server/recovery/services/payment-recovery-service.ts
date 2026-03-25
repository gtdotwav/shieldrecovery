import { randomUUID } from "node:crypto";

import QRCode from "qrcode";

import { getSellerAgentProfile } from "@/server/auth/core";
import { appEnv } from "@/server/recovery/config";
import { buildGatewayWebhookPath, platformBrand } from "@/lib/platform";
import {
  createOrUpdateShieldLead,
  markShieldLeadLost,
  markShieldLeadRecovered,
} from "@/server/recovery/crm/shield-lead-crm";
import { RecoveryAutomationService } from "@/server/recovery/services/recovery-automation";
import { getConnectionSettingsService } from "@/server/recovery/services/connection-settings-service";
import { MessagingService } from "@/server/recovery/services/messaging-service";
import { getStorageService } from "@/server/recovery/services/storage";
import { getAIOrchestrator } from "@/server/recovery/ai/orchestrator";
import {
  generateConversationReply,
  generateRecoveryMessage,
} from "@/server/recovery/ai/message-generator";
import type {
  AdminPanelSnapshot,
  AdminSellerSnapshot,
  AgentRecord,
  CalendarNoteRecord,
  CalendarSnapshot,
  ConversationRecord,
  CustomerRecord,
  ConversationStatus,
  CreateCalendarNoteInput,
  FollowUpContact,
  InboxConversation,
  MessageMetadata,
  MessageRecord,
  PaymentRecord,
  QueueJobRecord,
  RecoveryLeadRecord,
  RecoveryLeadStatus,
  RetryPaymentInput,
  RecoverablePaymentEvent,
  SellerAdminControlInput,
  SellerAdminControlRecord,
  SellerInviteInput,
  SellerInviteSnapshot,
  SellerUserInput,
  SellerUserSnapshot,
  SellerWebhookSnapshot,
  WebhookEventRecord,
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
    sellerKey?: string | null;
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

    const scopedWebhookId = scopeWebhookId(input.webhookId, input.sellerKey);
    const normalizedSellerKey = normalizeSellerIdentity(input.sellerKey);
    const existingEvent = await this.storage.findWebhookByWebhookId(scopedWebhookId);

    if (existingEvent) {
      if (!existingEvent.processed && existingEvent.error) {
        await this.enqueueWebhookProcessing({
          webhookId: existingEvent.webhookId,
          timestamp,
          sellerKey: normalizedSellerKey,
        });

        return {
          ok: true,
          accepted: true,
          requeued: true,
          webhook_id: existingEvent.webhookId,
          event_id: existingEvent.eventId,
          event_type: existingEvent.eventType,
        };
      }

      return {
        ok: true,
        duplicate: existingEvent.processed,
        accepted: !existingEvent.processed,
        queued: !existingEvent.processed,
        webhook_id: input.webhookId,
        event_id: existingEvent.eventId,
        event_type: existingEvent.eventType,
        seller_key: normalizedSellerKey || null,
      };
    }

    const payload = parseJsonBody(input.rawBody);
    const webhookRecord = await this.createInboundRecord(payload, scopedWebhookId);

    await this.storage.addLog(
      createStructuredLog({
        eventType: "webhook_received",
        level: "info",
        message: "Pagou.ai webhook received and queued.",
        context: {
          webhookId: scopedWebhookId,
          timestamp,
          sellerKey: normalizedSellerKey || null,
        },
      }),
    );

    try {
      await this.enqueueWebhookProcessing({
        webhookId: scopedWebhookId,
        timestamp,
        sellerKey: normalizedSellerKey,
      });

      return {
        ok: true,
        accepted: true,
        queued: true,
        webhook_id: input.webhookId,
        event_id: webhookRecord.eventId,
        event_type: webhookRecord.eventType,
        seller_key: normalizedSellerKey || null,
      };
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
            webhookId: scopedWebhookId,
            error: errorMessage,
            sellerKey: normalizedSellerKey || null,
          },
        }),
      );
      throw error;
    }
  }

  async handlePagouAiWebhook(input: {
    rawBody: string;
    sellerKey?: string | null;
  }) {
    const payload = parseJsonBody(input.rawBody);
    const eventId = extractRawEventId(payload, randomUUID());
    const scopedWebhookId = scopeWebhookId(eventId, input.sellerKey);
    const normalizedSellerKey = normalizeSellerIdentity(input.sellerKey);
    const existingEvent = await this.storage.findWebhookByWebhookId(scopedWebhookId);

    if (existingEvent) {
      if (!existingEvent.processed && existingEvent.error) {
        await this.enqueueWebhookProcessing({
          webhookId: existingEvent.webhookId,
          timestamp: Math.floor(Date.now() / 1000),
          sellerKey: normalizedSellerKey,
        });

        return {
          ok: true,
          accepted: true,
          requeued: true,
          webhook_id: existingEvent.webhookId,
          event_id: existingEvent.eventId,
          event_type: existingEvent.eventType,
        };
      }

      return {
        ok: true,
        duplicate: existingEvent.processed,
        accepted: !existingEvent.processed,
        queued: !existingEvent.processed,
        webhook_id: existingEvent.webhookId,
        event_id: existingEvent.eventId,
        event_type: existingEvent.eventType,
        seller_key: normalizedSellerKey || null,
      };
    }

    const webhookRecord = await this.createInboundRecord(
      payload,
      scopedWebhookId,
      "pagouai",
    );

    await this.storage.addLog(
      createStructuredLog({
        eventType: "webhook_received",
        level: "info",
        message: "Pagou.ai webhook received and queued.",
        context: {
          webhookId: scopedWebhookId,
          sellerKey: normalizedSellerKey || null,
        },
      }),
    );

    try {
      await this.enqueueWebhookProcessing({
        webhookId: scopedWebhookId,
        timestamp: Math.floor(Date.now() / 1000),
        sellerKey: normalizedSellerKey,
      });

      return {
        ok: true,
        accepted: true,
        queued: true,
        webhook_id: scopedWebhookId,
        event_id: webhookRecord.eventId,
        event_type: webhookRecord.eventType,
        seller_key: normalizedSellerKey || null,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown processing error.";

      await this.storage.markWebhookFailed(webhookRecord.id, errorMessage);
      await this.storage.addLog(
        createStructuredLog({
          eventType: "processing_error",
          level: "error",
          message: "Pagou.ai webhook processing failed.",
          context: {
            webhookId: scopedWebhookId,
            error: errorMessage,
            sellerKey: normalizedSellerKey || null,
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
        message: "Payload de transacao importado manualmente.",
        context: {
          webhookId: fallbackId,
        },
      }),
    );

    try {
      return await this.processPersistedInboundPayload({
        payload,
        webhookId: fallbackId,
        webhookRecordId: webhookRecord.id,
        timestamp: Math.floor(Date.now() / 1000),
      });
    } catch (error) {
      throw error;
    }
  }

  async processQueuedWebhookEvent(input: {
    webhookId: string;
    timestamp?: number;
    sellerKey?: string;
  }) {
    const webhookRecord = await this.storage.findWebhookByWebhookId(input.webhookId);

    if (!webhookRecord) {
      throw new HttpError(404, `Webhook ${input.webhookId} not found.`);
    }

    if (webhookRecord.processed) {
      return {
        ok: true,
        duplicate: true,
        webhook_id: webhookRecord.webhookId,
        event_id: webhookRecord.eventId,
        event_type: webhookRecord.eventType,
      };
    }

    return this.processPersistedInboundPayload({
      payload: webhookRecord.payload,
      webhookId: webhookRecord.webhookId,
      webhookRecordId: webhookRecord.id,
      timestamp:
        input.timestamp ??
        Math.floor(new Date(webhookRecord.createdAt).getTime() / 1000),
      sellerKey: input.sellerKey,
    });
  }

  async getGatewayWebhookUrlForSeller(sellerName?: string | null) {
    const runtimeSettings =
      await getConnectionSettingsService().getRuntimeSettings();
    const sellerKey = normalizeSellerIdentity(sellerName);
    return `${runtimeSettings.appBaseUrl}${buildGatewayWebhookPath(sellerKey)}`;
  }

  async getSellerWebhookSnapshot(
    sellerName?: string | null,
  ): Promise<SellerWebhookSnapshot> {
    const [runtimeSettings, webhookEvents] = await Promise.all([
      getConnectionSettingsService().getRuntimeSettings(),
      this.storage.listWebhookEvents(200),
    ]);

    return buildSellerWebhookSnapshot({
      sellerName: sellerName ?? "",
      webhookEvents,
      appBaseUrl: runtimeSettings.appBaseUrl,
    });
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

  async getAdminPanelSnapshot(): Promise<AdminPanelSnapshot> {
    const [
      analytics,
      contacts,
      conversations,
      agents,
      controls,
      sellerUsers,
      sellerInvites,
      queueOverview,
      recentJobs,
      recentLogs,
      webhookEvents,
      runtimeSettings,
    ] = await Promise.all([
      this.storage.getAnalytics(),
      this.storage.getFollowUpContacts(),
      this.storage.getInboxConversations(),
      this.storage.getActiveAgents(),
      this.storage.getSellerAdminControls(),
      this.storage.listSellerUsers(),
      this.storage.listSellerInvites(),
      this.storage.getQueueOverview(),
      this.storage.listQueueJobs(40),
      this.storage.listSystemLogs(60),
      this.storage.listWebhookEvents(400),
      getConnectionSettingsService().getRuntimeSettings(),
    ]);

    const sellerNames = new Set<string>();
    agents.forEach((agent) => sellerNames.add(agent.name));
    contacts.forEach((contact) => {
      if (contact.assigned_agent) sellerNames.add(contact.assigned_agent);
    });
    conversations.forEach((conversation) => {
      if (conversation.assigned_agent) sellerNames.add(conversation.assigned_agent);
    });
    controls.forEach((control) => sellerNames.add(control.sellerName));
    sellerUsers.forEach((seller) => sellerNames.add(seller.agentName));

    const sellers = [...sellerNames]
      .filter(Boolean)
      .sort((left, right) => left.localeCompare(right))
      .map((sellerName) =>
        buildAdminSellerSnapshot({
          sellerName,
          contacts,
          conversations,
          controls,
          agent: agents.find(
            (agent) =>
              normalizeSellerIdentity(agent.name) === normalizeSellerIdentity(sellerName),
          ),
          webhook: buildSellerWebhookSnapshot({
            sellerName,
            webhookEvents,
            appBaseUrl: runtimeSettings.appBaseUrl,
          }),
        }),
      );

    return {
      totalSellers: sellers.length,
      activeSellers: sellers.filter((seller) => seller.control.active).length,
      totalActiveLeads: contacts.filter(
        (contact) =>
          contact.lead_status !== "RECOVERED" && contact.lead_status !== "LOST",
      ).length,
      totalRecoveredRevenue: analytics.recovered_revenue,
      totalUnreadConversations: conversations.reduce(
        (sum, conversation) => sum + conversation.unread_count,
        0,
      ),
      unassignedLeads: contacts.filter((contact) => !contact.assigned_agent).length,
      pendingInvites: sellerInvites.filter(
        (invite) => invite.status === "pending" && !isInviteExpired(invite.expiresAt),
      ).length,
      sellers,
      sellerUsers: sellerUsers.map((seller) => ({
        id: seller.id,
        email: seller.email,
        displayName: seller.displayName,
        agentName: seller.agentName,
        active: seller.active,
        lastLoginAt: seller.lastLoginAt,
        createdAt: seller.createdAt,
        updatedAt: seller.updatedAt,
      })),
      sellerInvites: sellerInvites.map((invite) =>
        buildSellerInviteSnapshot({
          invite,
          appBaseUrl: runtimeSettings.appBaseUrl,
        }),
      ),
      worker: {
        scheduled: queueOverview.scheduled,
        processing: queueOverview.processing,
        processed: queueOverview.processed,
        failed: queueOverview.failed,
        dueNow: queueOverview.dueNow,
        oldestScheduledAt: queueOverview.oldestScheduledAt,
        oldestDueAt: queueOverview.oldestDueAt,
        queueLagMinutes: queueOverview.oldestDueAt
          ? Math.max(
              0,
              Math.round(
                (Date.now() - new Date(queueOverview.oldestDueAt).getTime()) / 60_000,
              ),
            )
          : 0,
        batchSize: appEnv.workerBatchSize,
        concurrency: appEnv.workerConcurrency,
        recentJobs,
        recentEvents: recentLogs.filter((log) =>
          log.eventType.startsWith("worker_job_"),
        ),
      },
    };
  }

  async saveSellerAdminControl(
    input: SellerAdminControlInput,
  ): Promise<SellerAdminControlRecord> {
    if (!input.sellerKey?.trim()) {
      throw new HttpError(400, "Seller key is required.");
    }

    return this.storage.saveSellerAdminControl(input);
  }

  async saveSellerUser(input: SellerUserInput): Promise<SellerUserSnapshot> {
    if (!input.email?.trim()) {
      throw new HttpError(400, "Seller email is required.");
    }

    if (!input.agentName?.trim()) {
      throw new HttpError(400, "Seller agent name is required.");
    }

    const seller = await this.storage.saveSellerUser(input);

    return {
      id: seller.id,
      email: seller.email,
      displayName: seller.displayName,
      agentName: seller.agentName,
      active: seller.active,
      lastLoginAt: seller.lastLoginAt,
      createdAt: seller.createdAt,
      updatedAt: seller.updatedAt,
    };
  }

  async createSellerInvite(
    input: SellerInviteInput,
  ): Promise<SellerInviteSnapshot> {
    if (!input.email?.trim()) {
      throw new HttpError(400, "Seller email is required.");
    }

    const invite = await this.storage.createSellerInvite(input);
    const runtimeSettings =
      await getConnectionSettingsService().getRuntimeSettings();

    return buildSellerInviteSnapshot({
      invite,
      appBaseUrl: runtimeSettings.appBaseUrl,
    });
  }

  async getSellerInviteByToken(
    token: string,
  ): Promise<SellerInviteSnapshot | undefined> {
    const [invite, runtimeSettings] = await Promise.all([
      this.storage.findSellerInviteByToken(token),
      getConnectionSettingsService().getRuntimeSettings(),
    ]);

    if (!invite) {
      return undefined;
    }

    return buildSellerInviteSnapshot({
      invite,
      appBaseUrl: runtimeSettings.appBaseUrl,
    });
  }

  async completeSellerInvite(input: {
    token: string;
    displayName: string;
    agentName: string;
    passwordHash: string;
  }): Promise<SellerUserSnapshot> {
    const invite = await this.storage.findSellerInviteByToken(input.token);

    if (!invite) {
      throw new HttpError(404, "Invite not found.");
    }

    if (invite.status !== "pending") {
      throw new HttpError(400, "Invite is no longer active.");
    }

    if (isInviteExpired(invite.expiresAt)) {
      throw new HttpError(400, "Invite expired.");
    }

    const displayName =
      input.displayName.trim() || invite.suggestedDisplayName || invite.email;
    const agentName = input.agentName.trim() || invite.agentName || displayName;

    const seller = await this.saveSellerUser({
      email: invite.email,
      displayName,
      agentName,
      active: true,
      passwordHash: input.passwordHash,
    });

    await this.saveSellerAdminControl({
      sellerKey: agentName,
      sellerName: agentName,
      sellerEmail: invite.email,
      active: true,
    });
    await this.storage.markSellerInviteAccepted(invite.token);

    return seller;
  }

  async getSellerAdminControlForName(
    sellerName?: string | null,
  ): Promise<SellerAdminControlRecord | undefined> {
    if (!sellerName?.trim()) {
      return undefined;
    }

    const controls = await this.storage.getSellerAdminControls();
    const normalizedSeller = normalizeSellerIdentity(sellerName);

    return controls.find(
      (control) =>
        control.sellerKey === normalizedSeller ||
        normalizeSellerIdentity(control.sellerName) === normalizedSeller,
    );
  }

  async getAutomationPolicyForSeller(sellerName?: string | null) {
    const control = await this.getSellerAdminControlForName(sellerName);

    if (!control) {
      return {
        enabled: true,
        autonomous: true,
        control: undefined,
      };
    }

    return {
      enabled: control.active && control.automationsEnabled,
      autonomous:
        control.active &&
        control.automationsEnabled &&
        control.autonomyMode === "autonomous",
      control,
    };
  }

  async getFollowUpContacts(): Promise<FollowUpContact[]> {
    return this.storage.getFollowUpContacts();
  }

  async getCalendarSnapshot(input: {
    month: string;
    visibleLeadIds?: string[];
  }): Promise<CalendarSnapshot> {
    return this.storage.getCalendarSnapshot(input);
  }

  async createCalendarNote(
    input: CreateCalendarNoteInput,
  ): Promise<CalendarNoteRecord> {
    if (!input.title.trim()) {
      throw new HttpError(400, "Note title is required.");
    }

    return this.storage.createCalendarNote({
      ...input,
      title: input.title.trim(),
      content: input.content?.trim() || undefined,
    });
  }

  async deleteCalendarNote(noteId: string) {
    if (!noteId.trim()) {
      throw new HttpError(400, "Note id is required.");
    }

    await this.storage.deleteCalendarNote(noteId.trim());
  }

  async getConversationById(conversationId: string) {
    return this.storage.findConversationById(conversationId);
  }

  async retryLeadRecoveryPrompt(input: { leadId: string }) {
    const lead = await this.storage.findLeadByLeadId(input.leadId);

    if (!lead) {
      throw new HttpError(404, "Lead not found.");
    }

    if (lead.status === "RECOVERED" || lead.status === "LOST") {
      return { state: "lead_closed" as const };
    }

    const customer = await this.storage.findCustomer(lead.customerId);
    const payment = await this.storage.findPayment({ paymentId: lead.paymentId });

    if (!customer || !payment) {
      throw new HttpError(404, "Lead dependencies not found.");
    }

    const target = resolveFollowUpTarget(customer);

    if (!target) {
      return { state: "missing_target" as const };
    }

    const conversation = await this.storage.upsertConversation({
      channel: target.channel,
      contactValue: target.contactValue,
      customerName: customer.name,
      lead,
      customerId: customer.id,
    });
    const messages = await this.storage.getConversationMessages(conversation.id);
    const automationPolicy = await this.getAutomationPolicyForSeller(
      lead.assignedAgentName,
    );
    const latestResolvedPaymentMetadata =
      [...messages]
        .reverse()
        .find((message) => message.metadata?.retryLink || message.metadata?.paymentUrl)
        ?.metadata ?? undefined;
    const latestOutbound =
      [...messages].reverse().find((message) => message.direction === "outbound") ?? null;
    const unreadCount = countInboundMessagesAfterLatestOutbound(messages);
    const decision = getAIOrchestrator().decideRecoveryPlan({
      contact: {
        lead_id: lead.leadId,
        customer_name: customer.name,
        email: customer.email,
        phone: customer.phone,
        product: lead.product,
        payment_value: payment.amount,
        payment_status: payment.status,
        payment_method: payment.paymentMethod,
        lead_status: lead.status,
        order_id: payment.orderId,
        gateway_payment_id: payment.gatewayPaymentId,
        assigned_agent: lead.assignedAgentName,
        created_at: lead.createdAt,
        updated_at: lead.updatedAt,
      },
      conversation: {
        id: conversation.id,
        status: conversation.status,
        channel: conversation.channel,
        unreadCount,
        lastInboundAt:
          [...messages].reverse().find((message) => message.direction === "inbound")
            ?.createdAt,
        lastOutboundAt: latestOutbound?.createdAt,
      },
      payment: {
        paymentLink:
          latestResolvedPaymentMetadata?.paymentUrl ??
          latestResolvedPaymentMetadata?.retryLink,
        pixCode: latestResolvedPaymentMetadata?.pixCode,
        pixQrCode: latestResolvedPaymentMetadata?.pixQrCode,
        expiresAt: latestResolvedPaymentMetadata?.pixExpiresAt,
      },
      automation: {
        sellerActive: automationPolicy.control?.active ?? true,
        inboxEnabled: automationPolicy.control?.inboxEnabled ?? true,
        automationsEnabled: automationPolicy.enabled,
        autonomyMode: automationPolicy.autonomous ? "autonomous" : "supervised",
      },
    });

    if (
      decision.nextAction === "wait_for_customer" ||
      decision.nextAction === "escalate_to_seller" ||
      decision.nextAction === "pause_automation" ||
      decision.nextAction === "close_as_recovered" ||
      decision.nextAction === "close_as_lost"
    ) {
      return {
        state: "skipped_by_strategy" as const,
        reason: decision.reason,
      };
    }

    const latestPrompt =
      [...messages]
        .reverse()
        .find(
          (message) =>
            message.direction === "outbound" &&
            message.metadata?.kind === "recovery_prompt" &&
            message.metadata?.gatewayPaymentId === payment.gatewayPaymentId,
        ) ?? null;

    if (!latestPrompt) {
      await this.startLeadFlow({ leadId: lead.leadId });
      return { state: "created" as const };
    }

    if (latestPrompt.status !== "queued" && latestPrompt.status !== "failed") {
      return {
        state: "already_dispatched" as const,
        message: latestPrompt,
      };
    }

    const dispatch = await this.messaging.dispatchOutboundMessage({
      conversation,
      content: latestPrompt.content,
      metadata: latestPrompt.metadata,
    });
    const updatedMessage = await this.storage.updateMessageById({
      messageId: latestPrompt.id,
      status: dispatch.status,
      providerMessageId: dispatch.providerMessageId,
      error: dispatch.error,
    });

    if (!updatedMessage) {
      throw new HttpError(500, "Unable to update recovery prompt message.");
    }

    await this.storage.updateConversationStatus({
      conversationId: conversation.id,
      status: "pending",
    });

    await this.storage.addLog(
      createStructuredLog({
        eventType: "message_dispatched",
        level: dispatch.status === "failed" ? "warn" : "info",
        message:
          dispatch.status === "failed"
            ? "Scheduled retry failed to dispatch recovery prompt."
            : "Scheduled retry dispatched queued recovery prompt.",
        context: {
          leadId: lead.leadId,
          conversationId: conversation.id,
          messageId: updatedMessage.id,
          deliveryStatus: dispatch.status,
          providerMessageId: dispatch.providerMessageId,
          dispatchError: dispatch.error,
        },
      }),
    );

    return {
      state:
        dispatch.status === "failed"
          ? ("dispatch_failed" as const)
          : dispatch.status === "queued"
            ? ("queued" as const)
            : ("dispatched" as const),
      message: updatedMessage,
      error: dispatch.error,
    };
  }

  async ensureOperationalAgent(input: {
    name: string;
    email: string;
    phone?: string;
  }) {
    return this.storage.ensureAgent(input);
  }

  async moveLeadToStatus(input: {
    leadId: string;
    status: RecoveryLeadStatus;
    assignedAgent?: AgentRecord;
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

  async startLeadFlow(input: {
    leadId: string;
    assignedAgent?: AgentRecord;
  }) {
    const lead = await this.storage.findLeadByLeadId(input.leadId);

    if (!lead) {
      throw new HttpError(404, "Lead not found.");
    }

    const customer = await this.storage.findCustomer(lead.customerId);
    const payment = await this.storage.findPayment({ paymentId: lead.paymentId });

    if (!customer || !payment) {
      throw new HttpError(404, "Lead dependencies not found.");
    }

    const prepared = await this.prepareInitialFollowUp({
      lead,
      payment,
      customer,
      failureReason: payment.failureCode ?? payment.status,
      currentPaymentStatus: payment.status,
      source: "operator",
    });

    if (prepared.state === "missing_target") {
      throw new HttpError(
        400,
        "Esse lead ainda nao tem telefone ou email valido para iniciar o fluxo.",
      );
    }

    const nextLead =
      lead.status === "NEW_RECOVERY"
        ? (await this.storage.updateLeadStatus({
            leadId: lead.leadId,
            status: "CONTACTING",
            assignedAgent: input.assignedAgent,
          })) ?? lead
        : input.assignedAgent
          ? ((await this.storage.updateLeadStatus({
              leadId: lead.leadId,
              status: lead.status,
              assignedAgent: input.assignedAgent,
            })) ?? lead)
          : lead;

    await this.storage.addLog(
      createStructuredLog({
        eventType: "recovery_started",
        level: "info",
        message:
          prepared.state === "created"
            ? "Lead flow started manually from CRM."
            : "Lead flow confirmed manually from CRM.",
        context: {
          leadId: nextLead.leadId,
          paymentId: payment.id,
          conversationId: prepared.conversation?.id,
          messageId: prepared.message?.id,
          outcome: prepared.state,
        },
      }),
    );

    return nextLead;
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
      senderName: input.senderName ?? `${platformBrand.name} Ops`,
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
    const latestPaymentMetadata =
      [...messages]
        .reverse()
        .find((message) => message.metadata?.kind === "recovery_prompt")
        ?.metadata ?? undefined;

    const runtimeSettings =
      await getConnectionSettingsService().getRuntimeSettings();
    const automationPolicy = await this.getAutomationPolicyForSeller(
      conversation.assignedAgentName ?? contact?.assigned_agent,
    );

    // Classify inbound intent first to detect payment method selection
    const decision = contact
      ? getAIOrchestrator().decideConversationFollowUp({
          context: {
            contact,
            conversation: {
              id: conversation.id,
              status: conversation.status,
              channel: conversation.channel,
              unreadCount: conversation.status === "open" ? 1 : 0,
            },
            payment: {
              pixCode: latestPaymentMetadata?.pixCode,
              pixQrCode: latestPaymentMetadata?.pixQrCode,
              expiresAt: latestPaymentMetadata?.pixExpiresAt,
            },
            automation: {
              sellerActive: automationPolicy.control?.active ?? true,
              inboxEnabled: automationPolicy.control?.inboxEnabled ?? true,
              automationsEnabled: automationPolicy.enabled,
              autonomyMode: automationPolicy.autonomous ? "autonomous" : "supervised",
            },
          },
          latestInboundContent: latestInbound?.content,
        })
      : null;

    const detectedIntent = decision?.intent?.intent;
    const isMethodSelection =
      detectedIntent === "payment_method_pix" ||
      detectedIntent === "payment_method_card" ||
      detectedIntent === "payment_method_boleto";

    // Generate checkout link when user selects a payment method (or for other payment intents)
    let retryLink: string | undefined;
    let resolvedPixCode = latestPaymentMetadata?.pixCode;
    let resolvedPixQrCode = latestPaymentMetadata?.pixQrCode;
    let resolvedPixExpiresAt = latestPaymentMetadata?.pixExpiresAt;
    let selectedMethodType: "pix" | "card" | "boleto" | undefined;

    if (isMethodSelection && payment && contact) {
      // User just selected a payment method — generate a fresh checkout link
      selectedMethodType =
        detectedIntent === "payment_method_pix"
          ? "pix"
          : detectedIntent === "payment_method_card"
            ? "card"
            : "boleto";

      const paymentResolution = await this.createImmediatePaymentLink(
        payment,
        contact.payment_status,
        contact.payment_method,
        await this.resolveAppBaseUrl(),
        {
          id: conversation.customerId ?? "",
          gatewayCustomerId: "",
          name: contact.customer_name,
          email: contact.email,
          phone: contact.phone,
          createdAt: "",
          updatedAt: "",
        },
        selectedMethodType,
      );
      retryLink = paymentResolution.paymentLink;
      resolvedPixCode = paymentResolution.pixCode ?? resolvedPixCode;
      resolvedPixQrCode = paymentResolution.pixQrCode ?? resolvedPixQrCode;
      resolvedPixExpiresAt = paymentResolution.pixExpiresAt ?? resolvedPixExpiresAt;
    } else {
      // Look for existing link in previous messages, or generate one if needed
      retryLink =
        [...messages]
          .reverse()
          .find((message) => message.metadata?.retryLink || message.metadata?.paymentUrl)
          ?.metadata?.paymentUrl ??
        [...messages]
          .reverse()
          .find((message) => message.metadata?.retryLink || message.metadata?.paymentUrl)
          ?.metadata?.retryLink ??
        (payment && contact
          ? (
              await this.createImmediatePaymentLink(
              payment,
              contact.payment_status,
              contact.payment_method,
              await this.resolveAppBaseUrl(),
              {
                id: conversation.customerId ?? "",
                gatewayCustomerId: "",
                name: contact.customer_name,
                email: contact.email,
                phone: contact.phone,
                createdAt: "",
                updatedAt: "",
              },
            )
            ).paymentLink
          : undefined);
    }

    const content = await generateConversationReply({
      apiKey: runtimeSettings.openAiApiKey,
      customerName: contact?.customer_name ?? conversation.customerName,
      productName: contact?.product,
      latestInboundContent: latestInbound?.content,
      latestInboundIntent: detectedIntent,
      retryLink,
      pixCode: resolvedPixCode,
      paymentMethod: selectedMethodType ?? contact?.payment_method,
      paymentStatus: contact?.payment_status,
      failureReason: payment?.failureCode ?? contact?.payment_status,
      tonePreference: decision?.tone,
      nextAction: decision?.nextAction,
      decisionReason: decision?.reason,
      requiresHumanHandoff: decision?.requiresHuman,
      sellerGuidance: automationPolicy.control?.notes,
    });

    const message = await this.createAndDispatchConversationMessage({
      conversation,
      content,
      senderName: `IA ${platformBrand.name}`,
      metadata: {
        kind: "ai_draft",
        generatedBy: "ai",
        strategyId: latestPaymentMetadata?.strategyId,
        strategyName: latestPaymentMetadata?.strategyName,
        recoveryProbability: latestPaymentMetadata?.recoveryProbability,
        recoveryScore: latestPaymentMetadata?.recoveryScore,
        recoveryUrgency: latestPaymentMetadata?.recoveryUrgency,
        nextAction: decision?.nextAction ?? "send_follow_up",
        followUpMode: decision?.followUpMode ?? "supervised",
        decisionReason: decision?.reason,
        inboundIntent: detectedIntent,
        selectedMethodType,
        product: contact?.product,
        paymentMethod: selectedMethodType ?? contact?.payment_method,
        paymentStatus: contact?.payment_status,
        paymentValue: contact?.payment_value,
        orderId: contact?.order_id,
        gatewayPaymentId: contact?.gateway_payment_id,
        retryLink,
        paymentUrl: retryLink,
        pixCode: resolvedPixCode,
        pixQrCode: resolvedPixQrCode,
        pixExpiresAt: resolvedPixExpiresAt,
        actionLabel: isMethodSelection
          ? `Pagar via ${selectedMethodType === "pix" ? "PIX" : selectedMethodType === "card" ? "Cartão" : "Boleto"}`
          : resolvedPixCode
            ? "Copiar código Pix"
            : retryLink
              ? "Abrir pagamento"
              : undefined,
      },
      logMessage: isMethodSelection
        ? `AI generated checkout link after ${selectedMethodType} method selection.`
        : "AI reply generated for conversation.",
      eventType: "ai_reply_generated",
      logContext: {
        conversationId: conversation.id,
        leadId: conversation.leadId,
        nextAction: decision?.nextAction,
        inboundIntent: detectedIntent,
        selectedMethodType,
      },
    });

    return message;
  }

  async sendScheduledPixFollowUp(input: { conversationId: string }) {
    const conversation = await this.storage.findConversationById(input.conversationId);

    if (!conversation) {
      throw new HttpError(404, "Conversation not found.");
    }

    const messages = await this.storage.getConversationMessages(conversation.id);
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

    if (!contact || !payment) {
      throw new HttpError(404, "Conversation dependencies not found.");
    }

    const runtimeSettings =
      await getConnectionSettingsService().getRuntimeSettings();
    const automationPolicy = await this.getAutomationPolicyForSeller(
      conversation.assignedAgentName ?? contact.assigned_agent,
    );
    const refreshedPayment = await this.createImmediatePaymentLink(
      payment,
      contact.payment_status,
      contact.payment_method,
      await this.resolveAppBaseUrl(),
      {
        id: conversation.customerId ?? "",
        gatewayCustomerId: "",
        name: contact.customer_name,
        email: contact.email,
        phone: contact.phone,
        createdAt: "",
        updatedAt: "",
      },
      "pix",
    );
    const latestPromptMetadata =
      [...messages]
        .reverse()
        .find((message) => message.metadata?.kind === "recovery_prompt")
        ?.metadata ?? undefined;
    const content = await generateConversationReply({
      apiKey: runtimeSettings.openAiApiKey,
      customerName: contact.customer_name ?? conversation.customerName,
      productName: contact.product,
      retryLink: refreshedPayment.paymentLink,
      pixCode: refreshedPayment.pixCode,
      paymentMethod: "pix",
      paymentStatus: contact.payment_status,
      failureReason: payment.failureCode ?? contact.payment_status,
      tonePreference: "reassuring",
      nextAction: "send_follow_up",
      decisionReason:
        "O Pix anterior ficou sem resposta. Um novo pagamento foi gerado para facilitar a retomada.",
      requiresHumanHandoff: false,
      sellerGuidance: automationPolicy.control?.notes,
    });

    return this.createAndDispatchConversationMessage({
      conversation,
      content,
      senderName: `IA ${platformBrand.name}`,
      metadata: {
        kind: "recovery_prompt",
        generatedBy: runtimeSettings.openAiApiKey ? "ai" : "workflow",
        strategyId: latestPromptMetadata?.strategyId,
        strategyName: latestPromptMetadata?.strategyName,
        recoveryProbability: latestPromptMetadata?.recoveryProbability,
        recoveryScore: latestPromptMetadata?.recoveryScore,
        recoveryUrgency: "today",
        nextAction: "send_follow_up",
        followUpMode: automationPolicy.autonomous ? "autonomous" : "supervised",
        decisionReason:
          "Pix regenerado automaticamente 6 minutos apos a primeira geracao para reforcar a retomada.",
        product: contact.product,
        paymentMethod: "pix",
        paymentStatus: contact.payment_status,
        paymentValue: contact.payment_value,
        orderId: contact.order_id,
        gatewayPaymentId: contact.gateway_payment_id,
        retryLink: refreshedPayment.paymentLink,
        paymentUrl: refreshedPayment.paymentLink,
        pixCode: refreshedPayment.pixCode,
        pixQrCode: refreshedPayment.pixQrCode,
        pixExpiresAt: refreshedPayment.pixExpiresAt,
        actionLabel: "Copiar codigo Pix",
      },
      logMessage: "Scheduled Pix follow-up generated with refreshed payment.",
      eventType: "ai_reply_generated",
      logContext: {
        conversationId: conversation.id,
        leadId: conversation.leadId,
        regeneratedPayment: true,
        method: "pix",
      },
    });
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
      service: platformBrand.slug,
      webhook_url: `${baseUrl}${buildGatewayWebhookPath()}`,
      whatsapp_webhook_url: `${baseUrl}/api/webhooks/whatsapp`,
      worker_url: `${baseUrl}/api/worker/run`,
      timestamp: new Date().toISOString(),
      signing: {
        provider: platformBrand.gateway.name,
        algorithm: "provider_payload_id",
        format: "dedupe pelo top-level id e reconciliacao via GET /v2/transactions/{id}",
        tolerance_seconds: runtimeSettings.webhookToleranceSeconds,
      },
      storage_mode: this.storage.mode,
      database_configured: runtimeSettings.databaseConfigured,
      required_headers: ["Content-Type: application/json"],
      integrations: {
        pagouai: appEnv.pagouAiConfigured,
        whatsapp: runtimeSettings.whatsappConfigured,
        email: runtimeSettings.emailConfigured,
        crm: runtimeSettings.crmConfigured,
        ai: runtimeSettings.aiConfigured,
      },
      automation: {
        worker_enabled: runtimeSettings.workerConfigured,
        worker_executor_configured: runtimeSettings.workerExecutorConfigured,
        cron_secret_configured: runtimeSettings.workerCronConfigured,
        worker_batch_size: appEnv.workerBatchSize,
        worker_concurrency: appEnv.workerConcurrency,
      },
    };
  }

  private async createInboundRecord(
    payload: unknown,
    webhookId: string,
    source = platformBrand.gateway.slug,
  ) {
    const optimisticEventType = extractRawEventType(payload);

    return this.storage.createWebhookEvent({
      webhookId,
      eventId: extractRawEventId(payload, webhookId),
      eventType: optimisticEventType ?? "unknown",
      source,
      payload,
    });
  }

  private async processPersistedInboundPayload(input: {
    payload: unknown;
    webhookId: string;
    webhookRecordId: string;
    timestamp: number;
    sellerKey?: string;
  }) {
    try {
      return await this.processInboundPayload(input);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : `Unknown processing error: ${String(error)}`;
      const errorStack = error instanceof Error ? error.stack : undefined;

      console.error("[webhook-process] Error processing webhook:", input.webhookId, errorMessage, errorStack ?? error);

      await this.storage.markWebhookFailed(input.webhookRecordId, errorMessage);
      await this.storage.addLog(
        createStructuredLog({
          eventType: "processing_error",
          level: "error",
          message: "Webhook processing failed.",
          context: {
            webhookId: input.webhookId,
            error: errorMessage,
            errorStack: errorStack ?? String(error),
            sellerKey: input.sellerKey ?? null,
          },
        }),
      );
      throw error;
    }
  }

  private async processInboundPayload(input: {
    payload: unknown;
    webhookId: string;
    webhookRecordId: string;
    timestamp: number;
    sellerKey?: string;
  }) {
    const webhookPayload = asRecord(input.payload);
    const normalizedEvent = await this.enrichNormalizedEventIfNeeded(
      normalizeShieldGatewayEvent(input.payload, {
        webhookId: input.webhookId,
        timestamp: input.timestamp,
      }),
      webhookPayload,
      input.sellerKey,
    );
    const customer = await this.storage.upsertCustomer(normalizedEvent);
    const payment = await this.storage.upsertPayment(normalizedEvent, customer.id);
    const forcedAssignedAgent = await this.resolveSellerWebhookAgent(input.sellerKey);

    let lead: RecoveryLeadRecord | null = null;
    let jobs: QueueJobRecord[] = [];

    if (isRecoverableEvent(normalizedEvent.event_type)) {
      lead = await createOrUpdateShieldLead({
        payment,
        customer,
        normalizedEvent,
        status: "NEW_RECOVERY",
        assignedAgent: forcedAssignedAgent,
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
        failureReason:
          normalizedEvent.payment.failure_code ?? payment.failureCode ?? payment.status,
        currentPaymentStatus: payment.status,
        paymentUrl: normalizedEvent.metadata.paymentUrl,
        pixCode: normalizedEvent.metadata.pixCode,
        pixQrCode: normalizedEvent.metadata.pixQrCode,
        pixExpiresAt: normalizedEvent.metadata.pixExpiresAt,
        source: "webhook",
      });
      lead =
        (await this.storage.updateLeadStatus({
          leadId: lead.leadId,
          status: "CONTACTING",
        })) ?? lead;

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
        assignedAgent: forcedAssignedAgent,
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
        failureReason:
          normalizedEvent.payment.failure_code ?? payment.failureCode ?? payment.status,
        currentPaymentStatus: payment.status,
        paymentUrl: normalizedEvent.metadata.paymentUrl,
        pixCode: normalizedEvent.metadata.pixCode,
        pixQrCode: normalizedEvent.metadata.pixQrCode,
        pixExpiresAt: normalizedEvent.metadata.pixExpiresAt,
        source: "webhook",
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
      seller_key: normalizeSellerIdentity(input.sellerKey) || null,
      queue_jobs: jobs.map((job) => ({
        queue: job.queueName,
        type: job.jobType,
        run_at: job.runAt,
      })),
    };
  }

  private async enqueueWebhookProcessing(input: {
    webhookId: string;
    timestamp: number;
    sellerKey?: string;
  }) {
    return this.automation.scheduleWebhookProcessing(input);
  }

  private async resolveSellerWebhookAgent(sellerKey?: string) {
    const normalizedSellerKey = normalizeSellerIdentity(sellerKey);

    if (!normalizedSellerKey) {
      return undefined;
    }

    const [controls, sellerUsers, agents] = await Promise.all([
      this.storage.getSellerAdminControls(),
      this.storage.listSellerUsers(),
      this.storage.getActiveAgents(),
    ]);
    const fallbackSeller = getSellerAgentProfile();
    const control = controls.find(
      (item) =>
        item.sellerKey === normalizedSellerKey ||
        normalizeSellerIdentity(item.sellerName) === normalizedSellerKey,
    );
    const sellerUser = sellerUsers.find(
      (item) =>
        normalizeSellerIdentity(item.agentName) === normalizedSellerKey ||
        normalizeSellerIdentity(item.displayName) === normalizedSellerKey,
    );
    const existingAgent = agents.find(
      (agent) => normalizeSellerIdentity(agent.name) === normalizedSellerKey,
    );
    const fallbackMatches =
      normalizeSellerIdentity(fallbackSeller.name) === normalizedSellerKey ||
      normalizeSellerIdentity(fallbackSeller.email) === normalizedSellerKey;
    const resolvedName =
      control?.sellerName ||
      sellerUser?.agentName ||
      sellerUser?.displayName ||
      (fallbackMatches ? fallbackSeller.name : undefined) ||
      existingAgent?.name;
    const resolvedEmail =
      sellerUser?.email ||
      control?.sellerEmail ||
      (fallbackMatches ? fallbackSeller.email : undefined) ||
      existingAgent?.email ||
      `${normalizedSellerKey}@pagrecovery.local`;

    if (!resolvedName) {
      throw new HttpError(404, "Seller webhook not recognized.");
    }

    if (existingAgent) {
      return existingAgent;
    }

    return this.ensureOperationalAgent({
      name: resolvedName,
      email: resolvedEmail,
      phone: "",
    });
  }

  private async prepareInitialFollowUp(input: {
    lead: RecoveryLeadRecord;
    payment: PaymentRecord;
    customer: CustomerRecord;
    failureReason?: string;
    currentPaymentStatus: string;
    paymentUrl?: string;
    pixCode?: string;
    pixQrCode?: string;
    pixExpiresAt?: string;
    source: "webhook" | "operator";
  }) {
    const target = resolveFollowUpTarget(input.customer);

    if (!target) {
      return {
        state: "missing_target" as const,
        conversation: null,
        message: null,
      };
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
    const latestPrompt =
      existingMessages.find(
        (message) =>
          message.direction === "outbound" &&
          message.metadata?.kind === "recovery_prompt" &&
          message.metadata?.gatewayPaymentId === input.payment.gatewayPaymentId,
      ) ?? null;

    if (latestPrompt && latestPrompt.status !== "failed") {
      return {
        state: "already_prepared" as const,
        conversation,
        message: latestPrompt,
      };
    }

    const runtimeSettings =
      await getConnectionSettingsService().getRuntimeSettings();
    const automationPolicy = await this.getAutomationPolicyForSeller(
      input.lead.assignedAgentName,
    );
    const initialPaymentAsset = await this.resolveInitialPixAsset({
      payment: input.payment,
      customer: input.customer,
      failureReason: input.failureReason,
      paymentUrl: input.paymentUrl,
      pixCode: input.pixCode,
      pixQrCode: input.pixQrCode,
      pixExpiresAt: input.pixExpiresAt,
    });

    const decision = getAIOrchestrator().decideRecoveryPlan({
      contact: {
        lead_id: input.lead.leadId,
        customer_name: input.customer.name,
        email: input.customer.email,
        phone: input.customer.phone,
        product: input.lead.product,
        payment_value: input.payment.amount,
        payment_status: input.currentPaymentStatus,
        payment_method: input.payment.paymentMethod,
        lead_status: input.lead.status,
        order_id: input.payment.orderId,
        gateway_payment_id: input.payment.gatewayPaymentId,
        assigned_agent: input.lead.assignedAgentName,
        created_at: input.lead.createdAt,
        updated_at: input.lead.updatedAt,
      },
      conversation: {
        id: conversation.id,
        status: conversation.status,
        channel: target.channel,
        unreadCount: 0,
      },
      payment: {
        paymentLink: initialPaymentAsset.paymentLink,
        pixCode: initialPaymentAsset.pixCode,
        pixQrCode: initialPaymentAsset.pixQrCode,
        expiresAt: initialPaymentAsset.pixExpiresAt,
      },
      automation: {
        sellerActive: automationPolicy.control?.active ?? true,
        inboxEnabled: automationPolicy.control?.inboxEnabled ?? true,
        automationsEnabled: automationPolicy.enabled,
        autonomyMode: automationPolicy.autonomous ? "autonomous" : "supervised",
      },
    });

    const generated = await generateRecoveryMessage({
      apiKey: runtimeSettings.openAiApiKey,
      context: {
        customerName: input.customer.name,
        productName: input.lead.product,
        cartValue: input.payment.amount,
        failureReason:
          input.failureReason ??
          input.payment.failureCode ??
          input.payment.status,
        channel: target.channel,
        attemptNumber: 1,
        paymentMethod: "pix",
        paymentLink: initialPaymentAsset.paymentLink,
        pixCode: initialPaymentAsset.pixCode,
        tonePreference: decision.tone,
        nextAction: "send_initial_message",
        recoveryUrgency: decision.urgency,
        decisionReason: decision.reason,
        sellerGuidance: automationPolicy.control?.notes,
      },
    });

    const metadata: MessageMetadata = {
      kind: "recovery_prompt",
      generatedBy:
        generated.templateUsed === "openai_recovery_flow" ? "ai" : "workflow",
      strategyId: decision.strategy?.id,
      strategyName: decision.strategy?.name,
      recoveryProbability: decision.classification.probability,
      recoveryScore: decision.classification.score,
      recoveryUrgency: decision.urgency,
      nextAction: "send_initial_message",
      followUpMode: decision.followUpMode,
      decisionReason: decision.reason,
      product: input.lead.product,
      paymentMethod: "pix",
      paymentStatus: input.currentPaymentStatus,
      failureReason: input.failureReason,
      paymentValue: input.payment.amount,
      orderId: input.payment.orderId,
      gatewayPaymentId: input.payment.gatewayPaymentId,
      retryLink: initialPaymentAsset.paymentLink,
      paymentUrl: initialPaymentAsset.paymentLink,
      pixCode: initialPaymentAsset.pixCode,
      pixQrCode: initialPaymentAsset.pixQrCode,
      pixExpiresAt: initialPaymentAsset.pixExpiresAt,
      actionLabel: "Escanear QR Pix",
    };

    const dispatch = await this.messaging.dispatchOutboundMessage({
      conversation,
      content: generated.content,
      metadata,
    });

    const resolvedLead =
      input.lead ??
      (conversation.channel === "whatsapp" || conversation.channel === "sms"
        ? await this.storage.findLeadByContact({
            phone: conversation.contactValue,
          })
        : await this.storage.findLeadByContact({
            email: conversation.contactValue,
          }));

    const message = await this.storage.createMessage({
      conversationId: conversation.id,
      channel: conversation.channel,
      direction: "outbound",
      senderAddress: platformBrand.slug,
      senderName: platformBrand.name,
      content: generated.content,
      status: dispatch.status,
      lead: resolvedLead,
      customerId: input.customer.id,
      providerMessageId: dispatch.providerMessageId,
      error: dispatch.error,
      metadata,
    });

    await this.storage.updateConversationStatus({
      conversationId: conversation.id,
      status: "pending",
    });

    await this.storage.addLog(
      createStructuredLog({
        eventType: "recovery_started",
        level: dispatch.status === "failed" ? "warn" : "info",
        message:
          input.source === "webhook"
            ? "Initial Pix follow-up sent from webhook."
            : "Initial Pix follow-up started manually.",
        context: {
          leadId: input.lead.leadId,
          conversationId: conversation.id,
          channel: target.channel,
          paymentId: input.payment.id,
          source: input.source,
          nextAction: "send_initial_message",
          strategyId: decision.strategy?.id,
          recoveryProbability: decision.classification.probability,
          deliveryStatus: dispatch.status,
          dispatchError: dispatch.error,
        },
      }),
    );

    return {
      state: "created" as const,
      conversation,
      message,
    };
  }

  private async resolveInitialPixAsset(input: {
    payment: PaymentRecord;
    customer: CustomerRecord;
    failureReason?: string;
    paymentUrl?: string;
    pixCode?: string;
    pixQrCode?: string;
    pixExpiresAt?: string;
  }) {
    let paymentLink = input.paymentUrl?.trim() || undefined;
    let pixCode = input.pixCode?.trim() || undefined;
    let pixQrCode = input.pixQrCode?.trim() || undefined;
    let pixExpiresAt = input.pixExpiresAt?.trim() || undefined;

    if ((!paymentLink && !pixCode) || (input.payment.paymentMethod === "pix" && !pixCode)) {
      const paymentResolution = await this.createImmediatePaymentLink(
        input.payment,
        input.failureReason,
        input.payment.paymentMethod || "pix",
        await this.resolveAppBaseUrl(),
        input.customer,
        "pix",
      );

      paymentLink = paymentResolution.paymentLink ?? paymentLink;
      pixCode = paymentResolution.pixCode ?? pixCode;
      pixQrCode = paymentResolution.pixQrCode ?? pixQrCode;
      pixExpiresAt = paymentResolution.pixExpiresAt ?? pixExpiresAt;
    }

    pixQrCode = await buildPixQrVisualization(pixCode, pixQrCode);

    return {
      paymentLink,
      pixCode,
      pixQrCode,
      pixExpiresAt,
    };
  }

  private async createImmediatePaymentLink(
    payment: PaymentRecord,
    failureReason: string | undefined,
    paymentMethod: string,
    baseUrl: string,
    customer?: CustomerRecord,
    selectedMethodType?: "pix" | "card" | "boleto",
  ): Promise<{
    paymentLink?: string;
    pixCode?: string;
    pixQrCode?: string;
    pixExpiresAt?: string;
  }> {
    if (appEnv.pagouAiConfigured && selectedMethodType === "pix") {
      return this.createPagouPixRecovery({
        payment,
        failureReason,
        paymentMethod,
        baseUrl,
        customer,
      });
    }

    try {
      const { createCheckoutSession } = await import("@/server/checkout");
      const result = await createCheckoutSession({
        amount: payment.amount / 100, // Convert cents to reais (checkout platform expects major unit)
        currency: payment.currency,
        description: `Pagamento #${payment.orderId || payment.gatewayPaymentId}`,
        customerName: customer?.name ?? "",
        customerEmail: customer?.email ?? "",
        customerPhone: customer?.phone ?? "",
        customerDocument: customer?.document,
        source: "recovery",
        sourceReferenceId: payment.id,
        metadata: {
          gatewayPaymentId: payment.gatewayPaymentId,
          orderId: payment.orderId,
          failureReason,
          paymentMethod,
        },
      });

      // Append ?method= to pre-select the payment method the user chose
      let checkoutUrl = result.checkoutUrl;
      if (selectedMethodType) {
        const sep = checkoutUrl.includes("?") ? "&" : "?";
        checkoutUrl = `${checkoutUrl}${sep}method=${selectedMethodType}`;
      }

      await this.storage.createPaymentAttempt({
        paymentId: payment.id,
        paymentLink: checkoutUrl,
        failureReason: failureReason ?? payment.failureCode ?? paymentMethod,
      });

      return { paymentLink: checkoutUrl };
    } catch {
      // Fallback to legacy retry link if checkout platform is unavailable
      const paymentLink = `${baseUrl}/retry/${payment.gatewayPaymentId}?token=${randomUUID()}`;

      await this.storage.createPaymentAttempt({
        paymentId: payment.id,
        paymentLink,
        failureReason: failureReason ?? payment.failureCode ?? paymentMethod,
      });

      return { paymentLink };
    }
  }

  private async createPagouPixRecovery(input: {
    payment: PaymentRecord;
    failureReason?: string;
    paymentMethod: string;
    baseUrl: string;
    customer?: CustomerRecord;
  }) {
    const { createPagouTransaction } = await import("@/server/pagouai/client");
    const buyerName = input.customer?.name?.trim() || `Cliente ${platformBrand.name}`;
    const buyerEmail =
      input.customer?.email?.trim() &&
      input.customer.email !== "unknown@pagrecovery.local"
        ? input.customer.email.trim()
        : undefined;
    const buyerPhone =
      input.customer?.phone && input.customer.phone !== "not_provided"
        ? input.customer.phone
        : undefined;
    const description = `Recuperacao #${input.payment.orderId || input.payment.gatewayPaymentId}`;
    const pagouTransaction = await createPagouTransaction({
      amount: Math.round(input.payment.amount),
      currency: input.payment.currency,
      method: "pix",
      externalRef: `${input.payment.id}:pix`,
      notifyUrl: `${input.baseUrl}${buildGatewayWebhookPath()}`,
      description,
      buyer: {
        name: buyerName,
        email: buyerEmail,
        phone: buyerPhone,
        document: input.customer?.document,
      },
      metadata: {
        product: description,
        campaign: platformBrand.slug,
        originalGatewayPaymentId: input.payment.gatewayPaymentId,
        orderId: input.payment.orderId,
        recoveryLead: true,
        failureReason: input.failureReason,
      },
    });

    const paymentLink =
      pagouTransaction.paymentUrl ||
      `${input.baseUrl}/retry/${input.payment.gatewayPaymentId}?provider=${platformBrand.gateway.slug}&transactionId=${encodeURIComponent(pagouTransaction.transactionId)}&method=pix`;

    await this.storage.createPaymentAttempt({
      paymentId: input.payment.id,
      paymentLink,
      failureReason:
        input.failureReason ?? input.payment.failureCode ?? input.paymentMethod,
    });

    return {
      paymentLink,
      pixCode: pagouTransaction.pixCode,
      pixQrCode: await buildPixQrVisualization(
        pagouTransaction.pixCode,
        pagouTransaction.pixQrCode,
      ),
      pixExpiresAt: pagouTransaction.pixExpiresAt,
    };
  }

  private async enrichNormalizedEventIfNeeded(
    normalizedEvent: ReturnType<typeof normalizeShieldGatewayEvent>,
    rawPayload: Record<string, unknown> | null | undefined,
    sellerKey?: string,
  ) {
    if (!looksLikePagouAiPayload(rawPayload) || !appEnv.pagouAiConfigured) {
      return normalizedEvent;
    }

    const missingCustomerDetails =
      normalizedEvent.customer.email === "unknown@pagrecovery.local" &&
      normalizedEvent.customer.phone === "not_provided";
    const missingPixDisplay = normalizedEvent.payment.method === "pix" && !normalizedEvent.metadata.pixCode;

    if (!missingCustomerDetails && !missingPixDisplay) {
      return normalizedEvent;
    }

    try {
      const { retrievePagouTransaction } = await import("@/server/pagouai/client");
      const pagouTransaction = await retrievePagouTransaction(normalizedEvent.payment.id);

      return {
        ...normalizedEvent,
        payment: {
          ...normalizedEvent.payment,
          status: pagouTransaction.status || normalizedEvent.payment.status,
          method: pagouTransaction.method || normalizedEvent.payment.method,
        },
        customer: {
          ...normalizedEvent.customer,
          name:
            pagouTransaction.buyerName ||
            normalizedEvent.customer.name,
          email:
            pagouTransaction.buyerEmail ||
            normalizedEvent.customer.email,
          phone:
            pagouTransaction.buyerPhone ||
            normalizedEvent.customer.phone,
        },
        metadata: {
          ...normalizedEvent.metadata,
          paymentUrl:
            pagouTransaction.paymentUrl || normalizedEvent.metadata.paymentUrl,
          pixCode: pagouTransaction.pixCode || normalizedEvent.metadata.pixCode,
          pixQrCode:
            pagouTransaction.pixQrCode || normalizedEvent.metadata.pixQrCode,
          pixExpiresAt:
            pagouTransaction.pixExpiresAt || normalizedEvent.metadata.pixExpiresAt,
        },
      };
    } catch (error) {
      await this.storage.addLog(
        createStructuredLog({
          eventType: "processing_error",
          level: "warn",
          message: "Pagou.ai reconciliation fallback failed; using webhook payload only.",
          context: {
            paymentId: normalizedEvent.payment.id,
            sellerKey: sellerKey ?? null,
            error: error instanceof Error ? error.message : String(error),
          },
        }),
      );

      return normalizedEvent;
    }
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
      metadata: input.metadata,
    });

    const message = await this.storage.createMessage({
      conversationId: input.conversation.id,
      channel: input.conversation.channel,
      direction: "outbound",
      senderAddress: platformBrand.slug,
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
    typeof currentService.startLeadFlow !== "function" ||
    typeof currentService.addManualConversationMessage !== "function" ||
    typeof currentService.updateConversationStatus !== "function" ||
    typeof currentService.sendAiConversationReply !== "function" ||
    typeof currentService.getCalendarSnapshot !== "function" ||
    typeof currentService.createCalendarNote !== "function" ||
    typeof currentService.deleteCalendarNote !== "function" ||
    typeof currentService.getAdminPanelSnapshot !== "function" ||
    typeof currentService.saveSellerAdminControl !== "function" ||
    typeof currentService.saveSellerUser !== "function" ||
    typeof currentService.createSellerInvite !== "function" ||
    typeof currentService.getSellerInviteByToken !== "function" ||
    typeof currentService.completeSellerInvite !== "function" ||
    typeof currentService.getAutomationPolicyForSeller !== "function" ||
    typeof currentService.processQueuedWebhookEvent !== "function" ||
    typeof currentService.getGatewayWebhookUrlForSeller !== "function" ||
    typeof currentService.getSellerWebhookSnapshot !== "function"
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

function normalizeSellerIdentity(value?: string | null) {
  return (
    value
      ?.trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") ?? ""
  );
}

function scopeWebhookId(webhookId: string, sellerKey?: string | null) {
  const normalizedSellerKey = normalizeSellerIdentity(sellerKey);
  return normalizedSellerKey ? `${normalizedSellerKey}:${webhookId}` : webhookId;
}

function buildAdminSellerSnapshot(input: {
  sellerName: string;
  contacts: FollowUpContact[];
  conversations: InboxConversation[];
  controls: SellerAdminControlRecord[];
  agent?: AgentRecord;
  webhook: SellerWebhookSnapshot;
}): AdminSellerSnapshot {
  const sellerKey = normalizeSellerIdentity(input.sellerName);
  const sellerContacts = input.contacts.filter(
    (contact) => normalizeSellerIdentity(contact.assigned_agent) === sellerKey,
  );
  const sellerConversations = input.conversations.filter(
    (conversation) => normalizeSellerIdentity(conversation.assigned_agent) === sellerKey,
  );
  const recoveredContacts = sellerContacts.filter(
    (contact) => contact.lead_status === "RECOVERED",
  );
  const activeLeads = sellerContacts.filter(
    (contact) => contact.lead_status !== "RECOVERED" && contact.lead_status !== "LOST",
  );
  const control =
    input.controls.find(
      (item) =>
        item.sellerKey === sellerKey ||
        normalizeSellerIdentity(item.sellerName) === sellerKey,
    ) ?? {
      id: sellerKey,
      sellerKey,
      sellerName: input.sellerName,
      sellerEmail: input.agent?.email,
      active: true,
      recoveryTargetPercent: 18,
      reportedRecoveryRatePercent: undefined,
      maxAssignedLeads: 30,
      inboxEnabled: true,
      automationsEnabled: true,
      autonomyMode: "autonomous",
      updatedAt: new Date().toISOString(),
    };
  const platformRecoveryRate = sellerContacts.length
    ? Number(((recoveredContacts.length / sellerContacts.length) * 100).toFixed(2))
    : 0;

  const lastActivityAt = [
    ...sellerContacts.map((contact) => contact.updated_at),
    ...sellerConversations.map((conversation) => conversation.last_message_at),
  ].sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0];

  return {
    sellerKey,
    sellerName: input.sellerName,
    sellerEmail: control.sellerEmail ?? input.agent?.email,
    activeLeads: activeLeads.length,
    waitingCustomer: sellerContacts.filter(
      (contact) => contact.lead_status === "WAITING_CUSTOMER",
    ).length,
    recoveredCount: recoveredContacts.length,
    recoveredRevenue: Number(
      recoveredContacts
        .reduce((sum, contact) => sum + Number(contact.payment_value), 0)
        .toFixed(2),
    ),
    openConversations: sellerConversations.length,
    unreadConversations: sellerConversations.reduce(
      (sum, conversation) => sum + conversation.unread_count,
      0,
    ),
    platformRecoveryRate,
    realRecoveryRate: control.reportedRecoveryRatePercent ?? platformRecoveryRate,
    lastActivityAt,
    control,
    webhook: input.webhook,
  };
}

function buildSellerWebhookSnapshot(input: {
  sellerName: string;
  webhookEvents: WebhookEventRecord[];
  appBaseUrl: string;
}): SellerWebhookSnapshot {
  const sellerKey = normalizeSellerIdentity(input.sellerName);
  const url = `${input.appBaseUrl}${buildGatewayWebhookPath(sellerKey)}`;
  const prefix = `${sellerKey}:`;
  const sellerEvents = sellerKey
    ? input.webhookEvents.filter((event) => event.webhookId.startsWith(prefix))
    : [];
  const latestEvent = sellerEvents[0];
  const processedCount = sellerEvents.filter((event) => event.processed).length;
  const failedCount = sellerEvents.filter((event) => Boolean(event.error)).length;
  const pendingCount = sellerEvents.filter(
    (event) => !event.processed && !event.error,
  ).length;

  return {
    sellerKey,
    url,
    eventCount: sellerEvents.length,
    processedCount,
    failedCount,
    pendingCount,
    lastReceivedAt: latestEvent?.createdAt,
    lastProcessedAt:
      sellerEvents.find((event) => event.processedAt)?.processedAt ?? undefined,
    lastEventType: latestEvent?.eventType,
    lastError:
      sellerEvents.find((event) => event.error)?.error ?? undefined,
    status:
      failedCount > 0
        ? "attention"
        : sellerEvents.length > 0
          ? "healthy"
          : "idle",
  };
}

function buildSellerInviteSnapshot(input: {
  invite: {
    id: string;
    token: string;
    email: string;
    suggestedDisplayName?: string;
    agentName?: string;
    note?: string;
    createdByEmail: string;
    status: "pending" | "accepted" | "revoked";
    createdAt: string;
    updatedAt: string;
    expiresAt: string;
    acceptedAt?: string;
    revokedAt?: string;
  };
  appBaseUrl: string;
}): SellerInviteSnapshot {
  return {
    ...input.invite,
    expired: isInviteExpired(input.invite.expiresAt),
    inviteUrl: `${input.appBaseUrl}/invite/${input.invite.token}`,
  };
}

function isInviteExpired(expiresAt: string) {
  return new Date(expiresAt).getTime() <= Date.now();
}

function extractRawEventType(payload: unknown): string | undefined {
  const record = asRecord(payload);

  if (!record) {
    return undefined;
  }

  const value =
    record.event_type ??
    asRecord(record.data)?.event_type ??
    record.type;

  return typeof value === "string" ? value : undefined;
}

function extractRawEventId(payload: unknown, fallbackWebhookId: string): string {
  const record = asRecord(payload);

  if (!record) {
    return fallbackWebhookId;
  }

  const value =
    record.event_id ??
    asRecord(record.data)?.id ??
    record.id;

  return typeof value === "string" && value.trim() ? value : fallbackWebhookId;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function looksLikePagouAiPayload(payload: Record<string, unknown> | null | undefined) {
  if (!payload) {
    return false;
  }

  const eventType = asRecord(payload.data)?.event_type;

  return payload.event === "transaction" || typeof eventType === "string";
}

async function buildPixQrVisualization(
  pixCode?: string,
  pixQrCode?: string,
) {
  const explicitQr = pixQrCode?.trim();

  if (explicitQr) {
    return explicitQr;
  }

  const trimmedPixCode = pixCode?.trim();

  if (!trimmedPixCode) {
    return undefined;
  }

  try {
    return await QRCode.toDataURL(trimmedPixCode, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 320,
    });
  } catch {
    return undefined;
  }
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

  if (customer.email && customer.email !== "unknown@pagrecovery.local") {
    return {
      channel: "email",
      contactValue: customer.email,
    };
  }

  return null;
}

function countInboundMessagesAfterLatestOutbound(messages: MessageRecord[]) {
  const latestOutboundAt =
    [...messages].reverse().find((message) => message.direction === "outbound")
      ?.createdAt ?? null;

  if (!latestOutboundAt) {
    return messages.filter((message) => message.direction === "inbound").length;
  }

  return messages.filter(
    (message) =>
      message.direction === "inbound" &&
      new Date(message.createdAt).getTime() > new Date(latestOutboundAt).getTime(),
  ).length;
}
