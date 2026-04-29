import { UNKNOWN_EMAIL, NOT_PROVIDED } from "@/lib/contact";
import { appEnv } from "@/server/recovery/config";
import { getAIOrchestrator } from "@/server/recovery/ai/orchestrator";
import { createStructuredLog } from "@/server/recovery/utils/structured-logger";
import { getStorageService } from "@/server/recovery/services/storage";
import { getPaymentRecoveryService } from "@/server/recovery/services/payment-recovery-service";
import {
  getConnectionSettingsService,
  type RuntimeConnectionSettings,
} from "@/server/recovery/services/connection-settings-service";
import type {
  ConversationRecord,
  CustomerRecord,
  PaymentRecord,
  QueueJobRecord,
  RecoveryLeadRecord,
  SellerAdminControlRecord,
} from "@/server/recovery/types";

type WorkerJobOutcome = {
  status: "processed" | "skipped";
  detail: string;
};

export type WorkerJobRunResult = {
  jobId: string;
  queue: QueueJobRecord["queueName"];
  type: string;
  status: "processed" | "skipped" | "rescheduled" | "failed";
  detail: string;
  nextRunAt?: string;
};

export type WorkerRunSummary = {
  ok: true;
  claimed: number;
  limit: number;
  concurrency: number;
  processed: number;
  skipped: number;
  rescheduled: number;
  failed: number;
  results: WorkerJobRunResult[];
  runAt: string;
};

export class RecoveryWorkerService {
  private readonly storage = getStorageService();
  private readonly recovery = getPaymentRecoveryService();

  async runDueJobs(input?: {
    limit?: number;
    concurrency?: number;
    perSellerConcurrency?: number;
    now?: string;
  }): Promise<WorkerRunSummary> {
    const runAt = input?.now ?? new Date().toISOString();
    const limit = Math.min(
      Math.max(1, Math.floor(input?.limit ?? appEnv.workerBatchSize)),
      250,
    );
    const jobs = await this.storage.claimDueQueueJobs({
      limit,
      runUntil: runAt,
    });
    const concurrency = Math.min(
      Math.max(1, Math.floor(input?.concurrency ?? appEnv.workerConcurrency)),
      Math.max(1, jobs.length || 1),
    );
    const perSellerConcurrency = Math.max(
      1,
      Math.min(concurrency, Math.floor(input?.perSellerConcurrency ?? 3)),
    );
    const results = await this.processClaimedJobsInParallel(
      jobs,
      concurrency,
      perSellerConcurrency,
    );

    return {
      ok: true,
      claimed: jobs.length,
      limit,
      concurrency,
      processed: results.filter((item) => item.status === "processed").length,
      skipped: results.filter((item) => item.status === "skipped").length,
      rescheduled: results.filter((item) => item.status === "rescheduled").length,
      failed: results.filter((item) => item.status === "failed").length,
      results,
      runAt,
    };
  }

  /**
   * Schedules claimed jobs across N global workers with a per-seller fairness
   * cap so that one seller with a huge backlog cannot starve the others or
   * burn down a shared rate-limited resource (WhatsApp / SendGrid / VAPI).
   *
   * Strategy:
   *  1. Group jobs by seller key (or "__nokey" bucket if absent).
   *  2. Each global worker repeatedly picks the next bucket whose in-flight
   *     count is below perSellerConcurrency.
   *  3. If every bucket is at cap, the worker waits for the next completion.
   */
  private async processClaimedJobsInParallel(
    jobs: QueueJobRecord[],
    concurrency: number,
    perSellerConcurrency: number,
  ) {
    if (!jobs.length) return [];

    const buckets = new Map<string, Array<{ index: number; job: QueueJobRecord }>>();
    jobs.forEach((job, index) => {
      const key = sellerKeyForJob(job);
      const list = buckets.get(key) ?? [];
      list.push({ index, job });
      buckets.set(key, list);
    });

    const inFlightBySeller = new Map<string, number>();
    const results = new Array<WorkerJobRunResult>(jobs.length);

    const claimNext = ():
      | { sellerKey: string; index: number; job: QueueJobRecord }
      | null => {
      for (const [sellerKey, queue] of buckets) {
        if (!queue.length) continue;
        const live = inFlightBySeller.get(sellerKey) ?? 0;
        if (live >= perSellerConcurrency) continue;
        const next = queue.shift()!;
        inFlightBySeller.set(sellerKey, live + 1);
        return { sellerKey, index: next.index, job: next.job };
      }
      return null;
    };

    const anyPending = () =>
      Array.from(buckets.values()).some((q) => q.length > 0);

    const workers = Array.from({ length: concurrency }, () => {
      return (async () => {
        // Each global worker drains whatever bucket allows another in-flight
        // job. When everything is capped, yield back via setTimeout so we
        // don't hot-spin between completions.
        while (true) {
          const claim = claimNext();
          if (!claim) {
            if (!anyPending()) return;
            await new Promise((resolve) => setTimeout(resolve, 25));
            continue;
          }
          try {
            results[claim.index] = await this.processClaimedJob(claim.job);
          } finally {
            const live = inFlightBySeller.get(claim.sellerKey) ?? 1;
            inFlightBySeller.set(claim.sellerKey, Math.max(0, live - 1));
          }
        }
      })();
    });
    await Promise.all(workers);

    return results;
  }

  private async processClaimedJob(job: QueueJobRecord): Promise<WorkerJobRunResult> {
    try {
      const outcome = await this.executeJob(job);
      await this.storage.completeQueueJob(job.id);
      await this.storage.addLog(
        createStructuredLog({
          eventType: "worker_job_processed",
          level: "info",
          message: "Worker processed scheduled job.",
          context: {
            jobId: job.id,
            queueName: job.queueName,
            jobType: job.jobType,
            outcome: outcome.status,
            detail: outcome.detail,
          },
        }),
      );

      return {
        jobId: job.id,
        queue: job.queueName,
        type: job.jobType,
        status: outcome.status,
        detail: outcome.detail,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown worker execution error.";
      const remainingAttempts = Math.max(0, job.attempts - 1);
      const nextRunAt =
        remainingAttempts > 0
          ? new Date(
              Date.now() + retryDelayMinutesForAttempt(job.attempts) * 60_000,
            ).toISOString()
          : undefined;

      await this.storage.rescheduleQueueJobFailure({
        jobId: job.id,
        error: errorMessage,
        remainingAttempts,
        nextRunAt,
      });
      await this.storage.addLog(
        createStructuredLog({
          eventType:
            remainingAttempts > 0 ? "worker_job_rescheduled" : "worker_job_failed",
          level: remainingAttempts > 0 ? "warn" : "error",
          message:
            remainingAttempts > 0
              ? "Worker rescheduled failed job."
              : "Worker exhausted retries for scheduled job.",
          context: {
            jobId: job.id,
            queueName: job.queueName,
            jobType: job.jobType,
            error: errorMessage,
            remainingAttempts,
            nextRunAt,
          },
        }),
      );

      return {
        jobId: job.id,
        queue: job.queueName,
        type: job.jobType,
        status: remainingAttempts > 0 ? "rescheduled" : "failed",
        detail: errorMessage,
        nextRunAt,
      };
    }
  }

  private async executeJob(job: QueueJobRecord): Promise<WorkerJobOutcome> {
    switch (job.jobType) {
      case "webhook-process":
        return this.handleWebhookProcess(job);
      case "lead-created":
        return this.handleLeadCreated(job);
      case "whatsapp-initial":
        return this.handleInitialWhatsApp(job);
      case "email-reminder":
        return this.handleEmailReminder(job);
      case "whatsapp-follow-up":
        return this.handleWhatsAppFollowUp(job);
      case "agent-task":
        return this.handleAgentTask(job);
      case "payment-link-generated":
        return this.handleRetryLinkGenerated(job);
      case "retry-failed-message":
        return this.handleRetryFailedMessage(job);
      default:
        throw new Error(`Unsupported worker job type: ${job.jobType}`);
    }
  }

  private async handleWebhookProcess(job: QueueJobRecord): Promise<WorkerJobOutcome> {
    const webhookId = readPayloadString(job, "webhookId");
    const timestamp = readPayloadNumber(job, "timestamp");
    const sellerKey = readPayloadOptionalString(job, "sellerKey");
    const result = await this.recovery.processQueuedWebhookEvent({
      webhookId,
      timestamp,
      sellerKey,
    });

    const isDuplicate = "duplicate" in result && result.duplicate;
    const isSkipped = "skipped" in result && result.skipped;

    return {
      status: isDuplicate || isSkipped ? "skipped" : "processed",
      detail: isDuplicate
        ? `Webhook ${webhookId} was already processed.`
        : isSkipped
          ? `Webhook ${webhookId} skipped (${("reason" in result && result.reason) || "unsupported"}).`
          : `Webhook ${webhookId} processed from queue.`,
    };
  }

  private async handleLeadCreated(job: QueueJobRecord): Promise<WorkerJobOutcome> {
    const leadId = readPayloadString(job, "leadId");
    const lead = await this.storage.findLeadByLeadId(leadId);

    if (!lead) {
      throw new Error(`Lead ${leadId} not found for lead-created job.`);
    }

    return {
      status: "processed",
      detail: `Lead ${leadId} acknowledged by worker.`,
    };
  }

  private async handleInitialWhatsApp(job: QueueJobRecord): Promise<WorkerJobOutcome> {
    const leadId = readPayloadString(job, "leadId");
    const result = await this.recovery.retryLeadRecoveryPrompt({ leadId });

    if (result.state === "lead_closed") {
      return {
        status: "skipped",
        detail: `Lead ${leadId} is already closed.`,
      };
    }

    if (result.state === "missing_target") {
      return {
        status: "skipped",
        detail: `Lead ${leadId} has no valid follow-up target.`,
      };
    }

    if (result.state === "skipped_by_strategy") {
      return {
        status: "skipped",
        detail: result.reason ?? `Lead ${leadId} was skipped by strategy.`,
      };
    }

    if (result.state === "dispatch_failed") {
      throw new Error(result.error ?? `Initial WhatsApp dispatch failed for ${leadId}.`);
    }

    if (result.state === "queued") {
      throw new Error(`WhatsApp channel still unavailable for ${leadId}.`);
    }

    return {
      status: "processed",
      detail:
        result.state === "created"
          ? `Initial flow created for ${leadId}.`
          : `Initial recovery prompt confirmed for ${leadId}.`,
    };
  }

  private async handleWhatsAppFollowUp(job: QueueJobRecord): Promise<WorkerJobOutcome> {
    const runtime = await getConnectionSettingsService().getRuntimeSettings();

    if (!runtime.whatsappConfigured) {
      throw new Error("WhatsApp is not configured yet.");
    }

    const lead = await this.resolveLeadDependencies(readPayloadString(job, "leadId"));

    if (!lead) {
      throw new Error("Lead dependencies not found for WhatsApp follow-up.");
    }

    if (lead.record.status === "RECOVERED" || lead.record.status === "LOST") {
      return {
        status: "skipped",
        detail: `Lead ${lead.record.leadId} is already closed.`,
      };
    }

    if (!isUsablePhone(lead.customer.phone)) {
      return {
        status: "skipped",
        detail: `Lead ${lead.record.leadId} has no WhatsApp contact.`,
      };
    }

    const automationPolicy = await this.recovery.getAutomationPolicyForSeller(
      lead.record.assignedAgentName,
    );

    if (!automationPolicy.enabled) {
      return {
        status: "skipped",
        detail: `Automation is disabled for ${lead.record.assignedAgentName ?? lead.record.leadId}.`,
      };
    }

    if (!automationPolicy.autonomous) {
      return {
        status: "skipped",
        detail: `Seller autonomy is not autonomous for ${lead.record.assignedAgentName ?? lead.record.leadId}.`,
      };
    }

    const conversation = await this.storage.upsertConversation({
      channel: "whatsapp",
      contactValue: lead.customer.phone,
      customerName: lead.customer.name,
      lead: lead.record,
      customerId: lead.customer.id,
    });
    const skipReason = await this.getFollowUpSkipReason(conversation.id);

    if (skipReason) {
      return {
        status: "skipped",
        detail: skipReason,
      };
    }

    const strategicSkipReason = await this.getStrategicFollowUpSkipReason({
      lead,
      conversation,
      automationPolicy,
    });

    if (strategicSkipReason) {
      return {
        status: "skipped",
        detail: strategicSkipReason,
      };
    }

    const message = await this.recovery.sendScheduledPixFollowUp({
      conversationId: conversation.id,
    });

    if (message.status === "failed" || message.status === "queued") {
      throw new Error(
        message.error ??
          `WhatsApp follow-up for ${lead.record.leadId} was not dispatched.`,
      );
    }

    return {
      status: "processed",
      detail: `WhatsApp follow-up sent for ${lead.record.leadId}.`,
    };
  }

  private async handleEmailReminder(job: QueueJobRecord): Promise<WorkerJobOutcome> {
    const lead = await this.resolveLeadDependencies(readPayloadString(job, "leadId"));

    if (!lead) {
      throw new Error("Lead dependencies not found for email reminder.");
    }

    if (lead.record.status === "RECOVERED" || lead.record.status === "LOST") {
      return {
        status: "skipped",
        detail: `Lead ${lead.record.leadId} is already closed.`,
      };
    }

    if (!isUsableEmail(lead.customer.email)) {
      return {
        status: "skipped",
        detail: `Lead ${lead.record.leadId} has no valid email.`,
      };
    }

    const automationPolicy = await this.recovery.getAutomationPolicyForSeller(
      lead.record.assignedAgentName,
    );

    if (!automationPolicy.enabled) {
      return {
        status: "skipped",
        detail: `Automation is disabled for ${lead.record.assignedAgentName ?? lead.record.leadId}.`,
      };
    }

    if (!automationPolicy.autonomous) {
      return {
        status: "skipped",
        detail: `Seller autonomy is not autonomous for ${lead.record.assignedAgentName ?? lead.record.leadId}.`,
      };
    }

    const conversation = await this.storage.upsertConversation({
      channel: "email",
      contactValue: lead.customer.email,
      customerName: lead.customer.name,
      lead: lead.record,
      customerId: lead.customer.id,
    });
    const skipReason = await this.getFollowUpSkipReason(conversation.id);

    if (skipReason) {
      return {
        status: "skipped",
        detail: skipReason,
      };
    }

    const strategicSkipReason = await this.getStrategicFollowUpSkipReason({
      lead,
      conversation,
      automationPolicy,
    });

    if (strategicSkipReason) {
      return {
        status: "skipped",
        detail: strategicSkipReason,
      };
    }

    await this.recovery.sendAiConversationReply({
      conversationId: conversation.id,
    });

    return {
      status: "processed",
      detail: `Email reminder queued for ${lead.record.leadId}.`,
    };
  }

  private async handleAgentTask(job: QueueJobRecord): Promise<WorkerJobOutcome> {
    const leadId = readPayloadString(job, "leadId");
    const runtime = await getConnectionSettingsService().getRuntimeSettings();
    const lead = await this.resolveLeadDependencies(leadId);

    if (!lead) {
      throw new Error(`Lead ${leadId} not found for agent-task job.`);
    }

    if (lead.record.status === "RECOVERED" || lead.record.status === "LOST") {
      return {
        status: "skipped",
        detail: `Lead ${leadId} no longer needs AI follow-up.`,
      };
    }

    const automationPolicy = await this.recovery.getAutomationPolicyForSeller(
      lead.record.assignedAgentName,
    );

    if (!automationPolicy.enabled) {
      return {
        status: "skipped",
        detail: `Automation is disabled for ${lead.record.assignedAgentName ?? lead.record.leadId}.`,
      };
    }

    if (!automationPolicy.autonomous) {
      return {
        status: "skipped",
        detail: `Seller autonomy is not autonomous for ${lead.record.assignedAgentName ?? lead.record.leadId}.`,
      };
    }

    const conversation = await this.resolveAutonomousConversation({
      lead,
      runtime,
    });

    if (!conversation) {
      return {
        status: "skipped",
        detail: `Lead ${leadId} has no configured channel for AI follow-up.`,
      };
    }

    const skipReason = await this.getFollowUpSkipReason(conversation.id);

    if (skipReason) {
      return {
        status: "skipped",
        detail: skipReason,
      };
    }

    const strategicSkipReason = await this.getStrategicFollowUpSkipReason({
      lead,
      conversation,
      automationPolicy,
    });

    if (strategicSkipReason) {
      return {
        status: "skipped",
        detail: strategicSkipReason,
      };
    }

    const result = await this.recovery.sendAiConversationReply({
      conversationId: conversation.id,
    });

    const message = "message" in result ? result.message : result;
    if (message && "status" in message && (message.status === "failed" || message.status === "queued")) {
      throw new Error(
        message.error ?? `AI follow-up for ${lead.record.leadId} was not dispatched.`,
      );
    }

    return {
      status: "processed",
      detail: `AI follow-up checkpoint completed for ${leadId}.`,
    };
  }

  private async handleRetryLinkGenerated(job: QueueJobRecord): Promise<WorkerJobOutcome> {
    const gatewayPaymentId = readPayloadString(job, "gatewayPaymentId");

    return {
      status: "processed",
      detail: `Retry link checkpoint confirmed for ${gatewayPaymentId}.`,
    };
  }

  private async handleRetryFailedMessage(job: QueueJobRecord): Promise<WorkerJobOutcome> {
    const messageId = readPayloadString(job, "messageId");

    const { MessagingService } = await import(
      "@/server/recovery/services/messaging-service"
    );
    const messagingService = new MessagingService();
    const result = await messagingService.retryFailedMessage(messageId);

    if (result.status === "failed") {
      throw new Error(result.error ?? `Retry failed for message ${messageId}.`);
    }

    return {
      status: "processed",
      detail: `Message ${messageId} retried successfully (status: ${result.status}).`,
    };
  }

  private async resolveLeadDependencies(
    leadId: string,
  ): Promise<
    | {
        record: RecoveryLeadRecord;
        customer: CustomerRecord;
        payment: PaymentRecord;
      }
    | null
  > {
    const lead = await this.storage.findLeadByLeadId(leadId);

    if (!lead) {
      return null;
    }

    const [customer, payment] = await Promise.all([
      this.storage.findCustomer(lead.customerId),
      this.storage.findPayment({ paymentId: lead.paymentId }),
    ]);

    if (!customer || !payment) {
      return null;
    }

    return {
      record: lead,
      customer,
      payment,
    };
  }

  private async getFollowUpSkipReason(conversationId: string): Promise<string | null> {
    const messages = await this.storage.getConversationMessages(conversationId);
    const latestInbound =
      [...messages].reverse().find((message) => message.direction === "inbound") ?? null;
    const latestOutbound =
      [...messages].reverse().find((message) => message.direction === "outbound") ?? null;

    if (
      latestInbound &&
      latestOutbound &&
      new Date(latestInbound.createdAt).getTime() >
        new Date(latestOutbound.createdAt).getTime()
    ) {
      return "Customer already replied after the latest outbound message.";
    }

    // Skip if there is a recent outbound but no customer response yet.
    // The first message should stand alone until the customer interacts.
    if (latestOutbound && !latestInbound) {
      return "Customer has not responded to the initial message yet.";
    }

    return null;
  }

  private async getStrategicFollowUpSkipReason(input: {
    lead: {
      record: RecoveryLeadRecord;
      customer: CustomerRecord;
      payment: PaymentRecord;
    };
    conversation: ConversationRecord;
    automationPolicy: {
      enabled: boolean;
      autonomous: boolean;
      control?: SellerAdminControlRecord;
    };
  }): Promise<string | null> {
    const messages = await this.storage.getConversationMessages(input.conversation.id);
    const latestInbound =
      [...messages].reverse().find((message) => message.direction === "inbound") ?? null;
    const latestOutbound =
      [...messages].reverse().find((message) => message.direction === "outbound") ?? null;
    const latestPaymentMetadata =
      [...messages]
        .reverse()
        .find((message) => message.metadata?.retryLink || message.metadata?.paymentUrl)
        ?.metadata ?? undefined;
    const decision = getAIOrchestrator().decideConversationFollowUp({
      context: {
        contact: {
          lead_id: input.lead.record.leadId,
          customer_name: input.lead.customer.name,
          email: input.lead.customer.email,
          phone: input.lead.customer.phone,
          product: input.lead.record.product,
          payment_value: input.lead.payment.amount,
          payment_status: input.lead.payment.status,
          payment_method: input.lead.payment.paymentMethod,
          lead_status: input.lead.record.status,
          order_id: input.lead.payment.orderId,
          gateway_payment_id: input.lead.payment.gatewayPaymentId,
          assigned_agent: input.lead.record.assignedAgentName,
          created_at: input.lead.record.createdAt,
          updated_at: input.lead.record.updatedAt,
        },
        conversation: {
          id: input.conversation.id,
          status: input.conversation.status,
          channel: input.conversation.channel,
          unreadCount: countInboundMessagesAfterLatestOutbound(messages),
          lastInboundAt: latestInbound?.createdAt,
          lastOutboundAt: latestOutbound?.createdAt,
        },
        payment: {
          paymentLink:
            latestPaymentMetadata?.paymentUrl ?? latestPaymentMetadata?.retryLink,
          pixCode: latestPaymentMetadata?.pixCode,
          pixQrCode: latestPaymentMetadata?.pixQrCode,
          expiresAt: latestPaymentMetadata?.pixExpiresAt,
        },
        automation: {
          sellerActive: input.automationPolicy.control?.active ?? true,
          inboxEnabled: input.automationPolicy.control?.inboxEnabled ?? true,
          automationsEnabled: input.automationPolicy.enabled,
          autonomyMode: input.automationPolicy.autonomous
            ? "autonomous"
            : "supervised",
        },
      },
      latestInboundContent: latestInbound?.content,
    });

    if (!decision.sendNow) {
      return decision.reason;
    }

    if (
      decision.nextAction !== "send_initial_message" &&
      decision.nextAction !== "send_follow_up"
    ) {
      return decision.reason;
    }

    return null;
  }

  private async resolveAutonomousConversation(input: {
    lead: {
      record: RecoveryLeadRecord;
      customer: CustomerRecord;
      payment: PaymentRecord;
    };
    runtime: RuntimeConnectionSettings;
  }) {
    if (input.runtime.whatsappConfigured && isUsablePhone(input.lead.customer.phone)) {
      return this.storage.upsertConversation({
        channel: "whatsapp",
        contactValue: input.lead.customer.phone,
        customerName: input.lead.customer.name,
        lead: input.lead.record,
        customerId: input.lead.customer.id,
      });
    }

    if (input.runtime.emailConfigured && isUsableEmail(input.lead.customer.email)) {
      return this.storage.upsertConversation({
        channel: "email",
        contactValue: input.lead.customer.email,
        customerName: input.lead.customer.name,
        lead: input.lead.record,
        customerId: input.lead.customer.id,
      });
    }

    return null;
  }
}

export function getRecoveryWorkerService() {
  return new RecoveryWorkerService();
}

function readPayloadString(job: QueueJobRecord, key: string) {
  const value = job.payload[key];

  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Queue job ${job.id} is missing payload.${key}.`);
  }

  return value;
}

function readPayloadNumber(job: QueueJobRecord, key: string) {
  const value = job.payload[key];

  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Queue job ${job.id} is missing payload.${key}.`);
  }

  return value;
}

function readPayloadOptionalString(job: QueueJobRecord, key: string) {
  const value = job.payload[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}

function sellerKeyForJob(job: QueueJobRecord): string {
  const fromPayload =
    typeof job.payload?.sellerKey === "string" ? job.payload.sellerKey.trim() : "";
  if (fromPayload) return fromPayload;
  const fromAgent =
    typeof job.payload?.assignedAgentName === "string"
      ? job.payload.assignedAgentName.trim()
      : "";
  if (fromAgent) return `agent:${fromAgent}`;
  return "__nokey";
}

function retryDelayMinutesForAttempt(attempts: number) {
  // Exponential backoff: 2min → 8min → 32min → 60min (capped)
  // attempts counts DOWN (3 → 2 → 1 → 0), so retryIndex counts UP
  const retryIndex = Math.max(0, 3 - attempts);
  const base = Math.min(60, 2 * Math.pow(4, retryIndex));
  // Add random jitter (0-25% of base) to prevent thundering herd
  const jitter = Math.random() * base * 0.25;
  return base + jitter;
}

function isUsablePhone(phone?: string | null) {
  return Boolean(phone && phone !== NOT_PROVIDED);
}

function countInboundMessagesAfterLatestOutbound(
  messages: Awaited<ReturnType<RecoveryWorkerService["storage"]["getConversationMessages"]>>,
) {
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

function isUsableEmail(email?: string | null) {
  return Boolean(email && email !== UNKNOWN_EMAIL);
}
