import { randomUUID } from "node:crypto";

import type {
  NormalizedPaymentEvent,
  PaymentAttemptRecord,
  PaymentRecord,
  QueueJobRecord,
  RecoveryLeadRecord,
} from "@/server/recovery/types";

const INITIAL_WHATSAPP_DELAY_MINUTES = 6;

export function buildRecoveryWorkflowJobs(input: {
  lead: RecoveryLeadRecord;
  payment: PaymentRecord;
  event: NormalizedPaymentEvent;
}): QueueJobRecord[] {
  const now = Date.now();

  return [
    createJob("recovery-jobs", "lead-created", now, {
      leadId: input.lead.leadId,
      paymentId: input.payment.id,
      eventType: input.event.event_type,
    }),
    createJob(
      "notification-jobs",
      "whatsapp-initial",
      now + INITIAL_WHATSAPP_DELAY_MINUTES * 60_000,
      {
      leadId: input.lead.leadId,
      channel: "whatsapp",
      template: "payment_recovery_initial",
      },
    ),
    createJob("notification-jobs", "email-reminder", now + 30 * 60_000, {
      leadId: input.lead.leadId,
      channel: "email",
      template: "payment_recovery_email",
    }),
    // WhatsApp follow-up is no longer scheduled upfront.
    // The first message already contains link + pix copia e cola.
    // Follow-ups happen only after the customer responds (via AI reply)
    // or via the 24h agent-task checkpoint.
    createJob("recovery-jobs", "agent-task", now + 24 * 60 * 60_000, {
      leadId: input.lead.leadId,
      taskType: "ai_follow_up",
      assignedAgent: input.lead.assignedAgentName,
    }),
    // After max agent-task attempts, escalate for manual review
    createJob("recovery-jobs", "escalation-review", now + 72 * 60 * 60_000, {
      leadId: input.lead.leadId,
      taskType: "manual_review_escalation",
      reason: "Agent follow-up attempts exhausted — requires manual review.",
      assignedAgent: input.lead.assignedAgentName,
    }),
  ];
}

export function buildWebhookProcessingJobs(input: {
  webhookId: string;
  timestamp: number;
  sellerKey?: string;
}): QueueJobRecord[] {
  return [
    createJob("recovery-jobs", "webhook-process", Date.now(), {
      webhookId: input.webhookId,
      timestamp: input.timestamp,
      ...(input.sellerKey ? { sellerKey: input.sellerKey } : {}),
    }),
  ];
}

export function buildRetryJobs(input: {
  payment: PaymentRecord;
  attempt: PaymentAttemptRecord;
}): QueueJobRecord[] {
  const delay = computeExponentialBackoff(input.attempt.attemptNumber);
  return [
    createJob("payment-retry-jobs", "payment-link-generated", Date.now() + delay, {
      paymentId: input.payment.id,
      gatewayPaymentId: input.payment.gatewayPaymentId,
      attemptNumber: input.attempt.attemptNumber,
      paymentLink: input.attempt.paymentLink,
    }),
  ];
}

const RETRY_BASE_DELAY_MS = 60_000; // 60 seconds
const RETRY_MAX_DELAY_MS = 3_600_000; // 1 hour

/**
 * Exponential backoff: min(baseDelay * 2^attempt, maxDelay)
 */
export function computeExponentialBackoff(attempt: number): number {
  return Math.min(RETRY_BASE_DELAY_MS * Math.pow(2, attempt), RETRY_MAX_DELAY_MS);
}

function createJob(
  queueName: QueueJobRecord["queueName"],
  jobType: string,
  runAtMs: number,
  payload: Record<string, unknown>,
): QueueJobRecord {
  return {
    id: randomUUID(),
    queueName,
    jobType,
    payload,
    runAt: new Date(runAtMs).toISOString(),
    attempts: 3,
    status: "scheduled",
    createdAt: new Date().toISOString(),
  };
}
