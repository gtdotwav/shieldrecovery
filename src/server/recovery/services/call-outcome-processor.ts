import { randomUUID } from "node:crypto";

import { getStorageService } from "@/server/recovery/services/storage";
import { createStructuredLog } from "@/server/recovery/utils/structured-logger";
import type { CallRecord, QueueJobRecord } from "@/server/recovery/types";

/* ── Types ── */

export type CallOutcomeResult = {
  action: string;
  detail: string;
};

/* ── Helpers ── */

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

/**
 * Determine sentiment from the call record.
 * Falls back to "neutral" when no explicit sentiment is recorded.
 */
function resolveSentiment(call: CallRecord): "positive" | "neutral" | "negative" {
  if (call.sentiment) return call.sentiment;

  // Infer from outcome when sentiment was not explicitly set
  const positiveOutcomes = ["recovered", "interested", "callback_scheduled"];
  const negativeOutcomes = ["no_interest", "wrong_number"];

  if (call.outcome && positiveOutcomes.includes(call.outcome)) return "positive";
  if (call.outcome && negativeOutcomes.includes(call.outcome)) return "negative";

  return "neutral";
}

/* ── Main Processor ── */

/**
 * Processes call outcomes and triggers appropriate recovery actions.
 * Called when a call reaches a terminal state (completed, failed, no_answer, busy, voicemail).
 */
export async function processCallOutcome(callId: string): Promise<CallOutcomeResult> {
  const storage = getStorageService();

  const call = await storage.getCall(callId);
  if (!call) {
    return { action: "skip", detail: `Call ${callId} not found.` };
  }

  const now = Date.now();
  const leadId = call.leadId;
  const jobs: QueueJobRecord[] = [];

  let action: string;
  let detail: string;

  switch (call.status) {
    /* ── Answered calls — route by sentiment ── */
    case "completed": {
      const sentiment = resolveSentiment(call);

      switch (sentiment) {
        case "positive": {
          // Lead is interested / already handled by callcenter-controller outcome logic.
          // Schedule a gentle follow-up reminder in 24h if they haven't paid yet.
          if (leadId) {
            try {
              await storage.updateLeadStatus({ leadId, status: "WAITING_CUSTOMER" });
            } catch { /* lead may already be in target status */ }

            jobs.push(
              createJob("recovery-jobs", "whatsapp-follow-up", now + 24 * 60 * 60_000, {
                leadId,
                callId,
                reason: "gentle_reminder_post_call",
                message: "Oi! Passando para lembrar do pagamento que conversamos por telefone. Precisa de alguma ajuda?",
              }),
            );
          }

          action = "waiting_customer";
          detail = `Positive sentiment — lead marked WAITING_CUSTOMER, gentle follow-up in 24h.`;
          break;
        }

        case "negative": {
          if (leadId) {
            try {
              await storage.updateLeadStatus({ leadId, status: "LOST" });
            } catch { /* lead may already be in target status */ }
          }

          action = "lost";
          detail = "Negative sentiment — lead marked LOST.";
          break;
        }

        case "neutral":
        default: {
          // Ambiguous outcome — schedule a WhatsApp follow-up with payment link in 2h
          if (leadId) {
            jobs.push(
              createJob("recovery-jobs", "whatsapp-follow-up", now + 2 * 60 * 60_000, {
                leadId,
                callId,
                reason: "neutral_call_follow_up",
                message: "Oi! Acabamos de falar por telefone. Segue o link para finalizar seu pagamento de forma rapida e segura:",
              }),
            );
          }

          action = "follow_up_scheduled";
          detail = "Neutral sentiment — WhatsApp follow-up with payment link in 2h.";
          break;
        }
      }
      break;
    }

    /* ── Voicemail ── */
    case "voicemail": {
      if (leadId) {
        jobs.push(
          createJob("recovery-jobs", "whatsapp-follow-up", now + 1 * 60 * 60_000, {
            leadId,
            callId,
            reason: "voicemail_follow_up",
            message: "Oi! Tentamos te ligar, mas nao conseguimos falar com voce. Estamos entrando em contato para ajudar com um pagamento pendente. Pode responder por aqui?",
          }),
        );
      }

      action = "whatsapp_after_voicemail";
      detail = "Voicemail — WhatsApp message scheduled in 1h.";
      break;
    }

    /* ── No Answer ── */
    case "no_answer": {
      if (leadId) {
        // WhatsApp in 30 min
        jobs.push(
          createJob("recovery-jobs", "whatsapp-follow-up", now + 30 * 60_000, {
            leadId,
            callId,
            reason: "no_answer_whatsapp",
            message: "Oi! Tentamos te ligar, mas nao conseguimos falar. Estamos entrando em contato sobre um pagamento pendente. Pode nos responder por aqui?",
          }),
        );

        // Callback in 4h
        jobs.push(
          createJob("recovery-jobs", "agent-task", now + 4 * 60 * 60_000, {
            leadId,
            callId,
            taskType: "callback_retry",
            reason: "no_answer_callback",
          }),
        );
      }

      action = "callback_and_whatsapp";
      detail = "No answer — WhatsApp in 30min + callback retry in 4h.";
      break;
    }

    /* ── Busy ── */
    case "busy": {
      if (leadId) {
        jobs.push(
          createJob("recovery-jobs", "agent-task", now + 2 * 60 * 60_000, {
            leadId,
            callId,
            taskType: "callback_retry",
            reason: "busy_callback",
          }),
        );
      }

      action = "callback_scheduled";
      detail = "Busy — callback retry scheduled in 2h.";
      break;
    }

    /* ── Failed ── */
    case "failed": {
      if (leadId) {
        // Fallback to WhatsApp immediately
        jobs.push(
          createJob("recovery-jobs", "whatsapp-follow-up", now + 5 * 60_000, {
            leadId,
            callId,
            reason: "call_failed_fallback",
            message: "Oi! Tivemos um problema tecnico ao tentar te ligar. Estamos entrando em contato sobre um pagamento pendente. Como podemos ajudar?",
          }),
        );
      }

      action = "whatsapp_fallback";
      detail = "Call failed — WhatsApp fallback scheduled in 5min.";
      break;
    }

    default: {
      action = "skip";
      detail = `Call status "${call.status}" is not a terminal state — no action taken.`;
    }
  }

  // Persist jobs
  if (jobs.length > 0) {
    try {
      await storage.createQueueJobs(jobs);
    } catch (err) {
      console.error("[call-outcome-processor] Failed to create queue jobs:", err);
    }
  }

  // Log the outcome processing
  await storage
    .addLog(
      createStructuredLog({
        eventType: "callcenter_checkout",
        level: "info",
        message: `[call-outcome] ${action}: ${detail}`,
        context: {
          callId,
          leadId,
          status: call.status,
          outcome: call.outcome,
          sentiment: call.sentiment,
          action,
          jobsCreated: jobs.length,
        },
      }),
    )
    .catch(() => {});

  return { action, detail };
}
