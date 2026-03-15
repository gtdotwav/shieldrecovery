import { randomUUID } from "node:crypto";

import type {
  NormalizedPaymentEvent,
  PaymentAttemptRecord,
  PaymentRecord,
  QueueJobRecord,
  RecoveryLeadRecord,
} from "@/server/recovery/types";

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
    createJob("notification-jobs", "whatsapp-initial", now + 5 * 60_000, {
      leadId: input.lead.leadId,
      channel: "whatsapp",
      template: "payment_recovery_initial",
    }),
    createJob("notification-jobs", "email-reminder", now + 30 * 60_000, {
      leadId: input.lead.leadId,
      channel: "email",
      template: "payment_recovery_email",
    }),
    createJob("notification-jobs", "whatsapp-follow-up", now + 6 * 60 * 60_000, {
      leadId: input.lead.leadId,
      channel: "whatsapp",
      template: "payment_recovery_follow_up",
    }),
    createJob("recovery-jobs", "agent-task", now + 24 * 60 * 60_000, {
      leadId: input.lead.leadId,
      taskType: "manual_follow_up",
      assignedAgent: input.lead.assignedAgentName,
    }),
  ];
}

export function buildRetryJobs(input: {
  payment: PaymentRecord;
  attempt: PaymentAttemptRecord;
}): QueueJobRecord[] {
  return [
    createJob("payment-retry-jobs", "payment-link-generated", Date.now(), {
      paymentId: input.payment.id,
      gatewayPaymentId: input.payment.gatewayPaymentId,
      attemptNumber: input.attempt.attemptNumber,
      paymentLink: input.attempt.paymentLink,
    }),
  ];
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
