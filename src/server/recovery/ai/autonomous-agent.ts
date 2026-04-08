import { randomUUID } from "node:crypto";

import { UNKNOWN_EMAIL, NOT_PROVIDED } from "@/lib/contact";
import { appEnv } from "@/server/recovery/config";
import { getStorageService } from "@/server/recovery/services/storage";
import { getPaymentRecoveryService } from "@/server/recovery/services/payment-recovery-service";
import {
  getConnectionSettingsService,
  type RuntimeConnectionSettings,
} from "@/server/recovery/services/connection-settings-service";
import { createStructuredLog } from "@/server/recovery/utils/structured-logger";
import { getAIOrchestrator } from "./orchestrator";
import {
  buildFollowUpCadence,
  calculateStepSchedule,
  type CadenceStepRecord,
} from "./cadence-engine";
import {
  generateAgentFollowUp,
  analyzeInboundMessage,
  type ConversationContext,
  type CustomerSentiment,
} from "./conversation-agent";
import {
  processTranscription,
  type TranscriptionInsight,
} from "./transcription-processor";

import { getVapiService } from "@/server/recovery/services/vapi-service";

import type {
  ConversationRecord,
  CustomerRecord,
  MessageRecord,
  PaymentRecord,
  RecoveryLeadRecord,
} from "@/server/recovery/types";

/* ── Types ── */

export type AgentRunResult = {
  ok: true;
  runId: string;
  durationMs: number;
  inboundProcessed: number;
  cadencesExecuted: number;
  cadencesScheduled: number;
  callsScheduled: number;
  scoresRefreshed: number;
  escalations: number;
  leadsClosed: number;
  transcriptionsProcessed: number;
  insightsExtracted: number;
  errors: string[];
};

type LeadBundle = {
  record: RecoveryLeadRecord;
  customer: CustomerRecord;
  payment: PaymentRecord;
};

/* ── Autonomous Agent ── */

/**
 * The Autonomous Recovery Agent.
 *
 * Runs on cron (every 5 minutes) and autonomously manages the entire
 * follow-up lifecycle for every active lead. It does NOT touch the
 * initial trigger (payment link + WhatsApp message), only manages
 * everything that happens after.
 *
 * Each tick:
 * 1. Process unhandled inbound messages (Claude-powered replies)
 * 2. Execute due cadence steps (dynamic follow-up sequence)
 * 3. Schedule cadences for leads that don't have one yet
 * 4. Process call transcriptions → extract insights → feed back
 * 5. Refresh recovery scores based on latest signals
 * 6. Escalate leads that need human attention
 * 7. Close exhausted leads (7+ days, no engagement)
 */
export class AutonomousRecoveryAgent {
  private readonly storage = getStorageService();
  private readonly recovery = getPaymentRecoveryService();
  private readonly orchestrator = getAIOrchestrator();
  private readonly errors: string[] = [];

  async tick(): Promise<AgentRunResult> {
    // Reset errors from previous tick to prevent stale error accumulation
    this.errors.length = 0;

    const runId = randomUUID();
    const startedAt = Date.now();
    const counters = {
      inboundProcessed: 0,
      cadencesExecuted: 0,
      cadencesScheduled: 0,
      callsScheduled: 0,
      scoresRefreshed: 0,
      escalations: 0,
      leadsClosed: 0,
      transcriptionsProcessed: 0,
      insightsExtracted: 0,
    };

    try {
      const runtime = await getConnectionSettingsService().getRuntimeSettings();
      const apiKey = await this.getAIApiKey();

      // 1. Process inbound messages that haven't been responded to
      counters.inboundProcessed = await this.processInboundMessages(apiKey, runtime);

      // 2. Execute due cadence steps
      counters.cadencesExecuted = await this.executeDueCadenceSteps(apiKey, runtime);

      // 3. Schedule cadences for new leads without one
      counters.cadencesScheduled = await this.scheduleMissingCadences();

      // 4. Process call transcriptions
      const transcResult = await this.processCallTranscriptions(apiKey);
      counters.transcriptionsProcessed = transcResult.processed;
      counters.insightsExtracted = transcResult.insights;

      // 5. Refresh recovery scores
      counters.scoresRefreshed = await this.refreshRecoveryScores();

      // 6. Escalate leads that need human
      counters.escalations = await this.escalateToHuman();

      // 7. Close exhausted leads
      counters.leadsClosed = await this.closeExhaustedLeads();
    } catch (error) {
      this.errors.push(
        error instanceof Error ? error.message : "Unknown agent tick error",
      );
    }

    const durationMs = Date.now() - startedAt;

    // Log the run
    await this.logAgentRun(runId, startedAt, durationMs, counters);

    return {
      ok: true,
      runId,
      durationMs,
      ...counters,
      errors: this.errors,
    };
  }

  /* ── 1. Process inbound messages ── */

  private async processInboundMessages(
    apiKey: string,
    runtime: RuntimeConnectionSettings,
  ): Promise<number> {
    let processed = 0;

    try {
      // Find conversations with unread inbound messages
      const contacts = await this.recovery.getFollowUpContacts();
      const activeContacts = contacts.filter(
        (c) =>
          c.lead_status !== "RECOVERED" &&
          c.lead_status !== "LOST",
      );

      for (const contact of activeContacts.slice(0, 20)) {
        try {
          const lead = await this.storage.findLeadByLeadId(contact.lead_id);
          if (!lead) continue;

          const conversation = await this.findActiveConversation(lead, runtime);
          if (!conversation) continue;

          const messages = await this.storage.getConversationMessages(conversation.id);
          if (!messages.length) continue;

          // Check if there's an unread inbound after the last outbound
          const lastOutbound = [...messages]
            .reverse()
            .find((m) => m.direction === "outbound");
          const unreadInbound = messages.filter(
            (m) =>
              m.direction === "inbound" &&
              (!lastOutbound ||
                new Date(m.createdAt).getTime() >
                  new Date(lastOutbound.createdAt).getTime()),
          );

          if (!unreadInbound.length) continue;

          const latestInbound = unreadInbound[unreadInbound.length - 1];
          const automationPolicy =
            await this.recovery.getAutomationPolicyForSeller(lead.assignedAgentName);

          if (!automationPolicy.enabled || !automationPolicy.autonomous) continue;

          // Build context and analyze
          const bundle = await this.resolveLeadBundle(lead);
          if (!bundle) continue;

          const context = this.buildConversationContext(bundle, messages);

          const decision = await analyzeInboundMessage({
            context,
            inboundContent: latestInbound.content,
            apiKey,
          });

          // Execute the decision
          if (decision.action === "reply" && decision.message) {
            await this.recovery.sendAiConversationReply({
              conversationId: conversation.id,
            });
            processed++;
          } else if (decision.action === "escalate_human") {
            await this.storage.addLog(
              createStructuredLog({
                eventType: "ai_reply_generated",
                level: "info",
                message: `Agent escalated lead ${lead.leadId} to human: ${decision.reasoning}`,
                context: { leadId: lead.leadId, decision },
              }),
            );
            processed++;
          } else if (decision.action === "schedule_followup" && decision.nextFollowUp) {
            await this.scheduleCustomFollowUp(
              lead,
              decision.nextFollowUp.delayMinutes,
              decision.nextFollowUp.channel,
              decision.commitmentDetected,
            );
            processed++;
          }

          // Store commitment if detected
          if (decision.commitmentDetected) {
            await this.storeInsight({
              leadId: lead.leadId,
              callId: "",
              source: "transcription",
              insightType: "commitment",
              content: decision.commitmentDetected,
              objections: [],
              commitments: [decision.commitmentDetected],
              metadata: { fromInbound: true },
            });
          }
        } catch (error) {
          this.errors.push(
            `Inbound processing error for ${contact.lead_id}: ${error instanceof Error ? error.message : "unknown"}`,
          );
        }
      }
    } catch (error) {
      this.errors.push(
        `Inbound batch error: ${error instanceof Error ? error.message : "unknown"}`,
      );
    }

    return processed;
  }

  /* ── 2. Execute due cadence steps ── */

  private async executeDueCadenceSteps(
    apiKey: string,
    runtime: RuntimeConnectionSettings,
  ): Promise<number> {
    let executed = 0;

    try {
      const dueSteps = await this.getDueCadenceSteps();

      for (const step of dueSteps.slice(0, 15)) {
        try {
          const lead = await this.storage.findLeadByLeadId(step.leadId);
          if (!lead) {
            await this.skipCadenceStep(step.id, "lead_not_found");
            continue;
          }

          if (lead.status === "RECOVERED" || lead.status === "LOST") {
            await this.skipCadenceStep(step.id, "lead_closed");
            continue;
          }

          const automationPolicy =
            await this.recovery.getAutomationPolicyForSeller(lead.assignedAgentName);
          if (!automationPolicy.enabled || !automationPolicy.autonomous) {
            await this.skipCadenceStep(step.id, "automation_disabled");
            continue;
          }

          const bundle = await this.resolveLeadBundle(lead);
          if (!bundle) {
            await this.skipCadenceStep(step.id, "missing_dependencies");
            continue;
          }

          if (step.channel === "voice") {
            // Schedule a call instead of sending a message
            await this.scheduleVoiceCall(bundle, step);
            await this.completeCadenceStep(step.id, "call_scheduled");
            executed++;
            continue;
          }

          // Get conversation for this lead
          const conversation = await this.findActiveConversation(lead, runtime);
          if (!conversation) {
            await this.skipCadenceStep(step.id, "no_conversation_channel");
            continue;
          }

          // Check if customer already replied recently
          const messages = await this.storage.getConversationMessages(conversation.id);
          const recentInbound = messages.find(
            (m) =>
              m.direction === "inbound" &&
              Date.now() - new Date(m.createdAt).getTime() < 4 * 3_600_000,
          );

          if (recentInbound) {
            await this.skipCadenceStep(step.id, "customer_replied_recently");
            continue;
          }

          // Generate and send follow-up using the conversation agent
          const context = this.buildConversationContext(bundle, messages);
          const insights = await this.getLeadInsights(lead.leadId);

          const decision = await generateAgentFollowUp({
            context: {
              ...context,
              cadenceStep: step.stepNumber,
              insightsFromHistory: insights.map((i) => i.content),
            },
            strategy: step.strategy as Parameters<typeof generateAgentFollowUp>[0]["strategy"],
            channel: step.channel,
            apiKey,
          });

          if (decision.action === "reply" || decision.action === "offer_alternative") {
            await this.recovery.sendAiConversationReply({
              conversationId: conversation.id,
            });
            await this.completeCadenceStep(step.id, "message_sent");
            executed++;
          } else if (decision.action === "wait") {
            await this.skipCadenceStep(step.id, "agent_decided_to_wait");
          } else if (decision.action === "escalate_human") {
            await this.skipCadenceStep(step.id, "escalated_to_human");
          } else if (decision.action === "schedule_call") {
            await this.scheduleVoiceCall(bundle, step);
            await this.completeCadenceStep(step.id, "call_scheduled");
            executed++;
          } else {
            await this.completeCadenceStep(step.id, decision.action);
            executed++;
          }
        } catch (error) {
          this.errors.push(
            `Cadence step ${step.id} error: ${error instanceof Error ? error.message : "unknown"}`,
          );
        }
      }
    } catch (error) {
      this.errors.push(
        `Cadence batch error: ${error instanceof Error ? error.message : "unknown"}`,
      );
    }

    return executed;
  }

  /* ── 3. Schedule missing cadences ── */

  private async scheduleMissingCadences(): Promise<number> {
    let scheduled = 0;

    try {
      const contacts = await this.recovery.getFollowUpContacts();
      const activeLeads = contacts.filter(
        (c) =>
          c.lead_status === "CONTACTING" ||
          c.lead_status === "WAITING_CUSTOMER",
      );

      for (const contact of activeLeads.slice(0, 20)) {
        try {
          // Check if seller has automations enabled before scheduling cadence
          const automationPolicy =
            await this.recovery.getAutomationPolicyForSeller(contact.assigned_agent);
          if (!automationPolicy.enabled) continue;

          const existingSteps = await this.getCadenceStepsForLead(contact.lead_id);

          // Only schedule if no cadence steps exist beyond the initial 3
          if (existingSteps.length > 0) continue;

          const lead = await this.storage.findLeadByLeadId(contact.lead_id);
          if (!lead) continue;

          const bundle = await this.resolveLeadBundle(lead);
          if (!bundle) continue;

          // Check if lead is old enough (at least 2h since creation)
          const leadAge = Date.now() - new Date(lead.createdAt).getTime();
          if (leadAge < 2 * 3_600_000) continue;

          // Check conversation state
          const conversation = await this.findLeadConversation(lead);
          const hasResponded = conversation
            ? await this.hasCustomerResponded(conversation.id)
            : false;

          const cadenceSteps = buildFollowUpCadence({
            lead,
            customer: bundle.customer,
            payment: bundle.payment,
            existingSteps: 3, // Steps 1-3 already handled by recovery-queues.ts
            hasResponded,
            hasReadMessages: false,
          });

          for (const step of cadenceSteps) {
            const scheduledAt = calculateStepSchedule(
              lead.createdAt,
              step,
              bundle.customer.phone,
            );

            // Don't schedule steps in the past
            if (scheduledAt.getTime() < Date.now()) continue;

            await this.createCadenceStep({
              leadId: lead.leadId,
              customerId: bundle.customer.id,
              stepNumber: step.stepNumber,
              channel: step.channel,
              strategy: step.strategy,
              tone: step.tone,
              scheduledAt: scheduledAt.toISOString(),
            });
          }

          scheduled++;
        } catch (error) {
          this.errors.push(
            `Schedule cadence error for ${contact.lead_id}: ${error instanceof Error ? error.message : "unknown"}`,
          );
        }
      }
    } catch (error) {
      this.errors.push(
        `Schedule batch error: ${error instanceof Error ? error.message : "unknown"}`,
      );
    }

    return scheduled;
  }

  /* ── 4. Process call transcriptions ── */

  private async processCallTranscriptions(
    apiKey: string,
  ): Promise<{ processed: number; insights: number }> {
    let processed = 0;
    let insightCount = 0;

    try {
      // Find calls with transcripts that haven't been processed
      const recentCalls = await this.storage.listCalls({
        limit: 20,
        status: "completed",
      });

      for (const call of recentCalls) {
        if (!call.transcript || call.transcriptSummary) continue;

        try {
          const analysis = await processTranscription({ call, apiKey });

          // Save summary back to call
          await this.storage.updateCall(call.id, {
            transcriptSummary: analysis.summary,
            sentiment: analysis.insights[0]?.customerSentiment as "positive" | "neutral" | "negative" | undefined,
          });

          // Store insights
          for (const insight of analysis.insights) {
            await this.storeInsight(insight);
            insightCount++;
          }

          // Act on next action from transcription
          if (analysis.callbackSuggested && analysis.callbackAt && call.leadId) {
            await this.scheduleCustomFollowUp(
              { leadId: call.leadId } as RecoveryLeadRecord,
              this.minutesUntil(analysis.callbackAt),
              "whatsapp",
              "callback agendado via chamada",
            );
          }

          processed++;
        } catch (error) {
          this.errors.push(
            `Transcription error for call ${call.id}: ${error instanceof Error ? error.message : "unknown"}`,
          );
        }
      }
    } catch (error) {
      this.errors.push(
        `Transcription batch error: ${error instanceof Error ? error.message : "unknown"}`,
      );
    }

    return { processed, insights: insightCount };
  }

  /* ── 5. Refresh recovery scores ── */

  private async refreshRecoveryScores(): Promise<number> {
    let refreshed = 0;

    try {
      const contacts = await this.recovery.getFollowUpContacts();
      const activeContacts = contacts.filter(
        (c) =>
          c.lead_status !== "RECOVERED" &&
          c.lead_status !== "LOST",
      );

      for (const contact of activeContacts.slice(0, 30)) {
        try {
          const lead = await this.storage.findLeadByLeadId(contact.lead_id);
          if (!lead) continue;

          // Compute a basic recovery score based on available signals
          const leadAgeDays =
            (Date.now() - new Date(lead.createdAt).getTime()) / 86_400_000;
          const paymentValue = contact.payment_value;

          // Score factors (0-100):
          // - Recency: newer leads score higher
          // - Value: higher value = higher priority
          // - Status: WAITING_CUSTOMER scores higher than CONTACTING
          const recencyScore = Math.max(0, 100 - leadAgeDays * 10);
          const valueScore = Math.min(100, paymentValue / 1000); // R$10+ gets full score
          const statusBonus =
            contact.lead_status === "WAITING_CUSTOMER" ? 15 : 0;

          const scorePriority = Math.round(
            recencyScore * 0.4 + valueScore * 0.4 + statusBonus * 0.2,
          );
          const clampedScore = Math.max(0, Math.min(100, scorePriority));

          // Persist the score to the lead's metadata via Supabase
          const supabase = this.getSupabaseClient();
          if (supabase) {
            await supabase
              .from("recovery_leads")
              .update({
                metadata: { scorePriority: clampedScore, scoreUpdatedAt: new Date().toISOString() },
              })
              .eq("lead_id", lead.leadId);
          }

          refreshed++;
        } catch (error) {
          this.errors.push(
            `Score refresh error for ${contact.lead_id}: ${error instanceof Error ? error.message : "unknown"}`,
          );
        }
      }

      if (refreshed > 0) {
        await this.storage.addLog(
          createStructuredLog({
            eventType: "worker_job_processed",
            level: "info",
            message: `Agent refreshed recovery scores for ${refreshed} leads`,
            context: { refreshed },
          }),
        );
      }
    } catch (error) {
      this.errors.push(
        `Score refresh batch error: ${error instanceof Error ? error.message : "unknown"}`,
      );
    }

    return refreshed;
  }

  /* ── 6. Escalate to human ── */

  private async escalateToHuman(): Promise<number> {
    let escalated = 0;

    try {
      const contacts = await this.recovery.getFollowUpContacts();

      for (const contact of contacts) {
        if (
          contact.lead_status === "RECOVERED" ||
          contact.lead_status === "LOST"
        )
          continue;

        // Escalate if: 3+ days with no response AND high value
        const leadAge = Date.now() - new Date(contact.updated_at).getTime();
        const isHighValue = contact.payment_value >= 50_000;
        const isStagnant = leadAge > 3 * 86_400_000;

        if (isHighValue && isStagnant) {
          await this.storage.addLog(
            createStructuredLog({
              eventType: "ai_reply_generated",
              level: "warn",
              message: `Agent recommends human attention for high-value stagnant lead ${contact.lead_id}`,
              context: {
                leadId: contact.lead_id,
                value: contact.payment_value,
                ageHours: Math.round(leadAge / 3_600_000),
              },
            }),
          );
          escalated++;
        }
      }
    } catch (error) {
      this.errors.push(
        `Escalation error: ${error instanceof Error ? error.message : "unknown"}`,
      );
    }

    return escalated;
  }

  /* ── 7. Close exhausted leads ── */

  private async closeExhaustedLeads(): Promise<number> {
    let closed = 0;

    try {
      const contacts = await this.recovery.getFollowUpContacts();
      const runtime = await getConnectionSettingsService().getRuntimeSettings();

      for (const contact of contacts) {
        if (
          contact.lead_status === "RECOVERED" ||
          contact.lead_status === "LOST"
        )
          continue;

        const leadAge = Date.now() - new Date(contact.updated_at).getTime();
        const daysOld = leadAge / 86_400_000;

        // Close leads older than 10 days with no recent activity
        if (daysOld > 10) {
          const lead = await this.storage.findLeadByLeadId(contact.lead_id);
          if (!lead) continue;

          // Also check the last inbound message date — don't close if the
          // customer sent a message within the last 10 days.
          let lastCustomerMessageAgeDays = Infinity;
          try {
            const conversation = await this.findActiveConversation(lead, runtime);
            if (conversation) {
              const messages = await this.storage.getConversationMessages(conversation.id);
              const lastInbound = [...messages]
                .reverse()
                .find((m) => m.direction === "inbound");
              if (lastInbound) {
                lastCustomerMessageAgeDays =
                  (Date.now() - new Date(lastInbound.createdAt).getTime()) / 86_400_000;
              }
            }
          } catch {
            // If conversation lookup fails, rely on updated_at alone
          }

          // Only close if BOTH the lead hasn't been updated AND no customer
          // message was received in the last 10 days
          if (lastCustomerMessageAgeDays <= 10) continue;

          await this.storage.markLeadLost(lead.id);
          await this.storage.addLog(
            createStructuredLog({
              eventType: "ai_reply_generated",
              level: "info",
              message: `Agent closed exhausted lead ${contact.lead_id} after ${Math.round(daysOld)} days`,
              context: { leadId: contact.lead_id, daysOld: Math.round(daysOld) },
            }),
          );
          closed++;
        }
      }
    } catch (error) {
      this.errors.push(
        `Close leads error: ${error instanceof Error ? error.message : "unknown"}`,
      );
    }

    return closed;
  }

  /* ── Storage helpers (Supabase) ── */

  private async getDueCadenceSteps(): Promise<CadenceStepRecord[]> {
    const supabase = this.getSupabaseClient();
    if (!supabase) return [];

    const { data } = await supabase
      .from("follow_up_cadences")
      .select("*")
      .lte("scheduled_at", new Date().toISOString())
      .is("executed_at", null)
      .is("skipped_at", null)
      .order("scheduled_at", { ascending: true })
      .limit(15);

    return (data ?? []).map(mapCadenceRow);
  }

  private async getCadenceStepsForLead(leadId: string): Promise<CadenceStepRecord[]> {
    const supabase = this.getSupabaseClient();
    if (!supabase) return [];

    const { data } = await supabase
      .from("follow_up_cadences")
      .select("*")
      .eq("lead_id", leadId)
      .order("step_number", { ascending: true });

    return (data ?? []).map(mapCadenceRow);
  }

  private async createCadenceStep(input: {
    leadId: string;
    customerId?: string;
    stepNumber: number;
    channel: string;
    strategy: string;
    tone: string;
    scheduledAt: string;
  }): Promise<void> {
    const supabase = this.getSupabaseClient();
    if (!supabase) return;

    await supabase.from("follow_up_cadences").insert({
      id: randomUUID(),
      lead_id: input.leadId,
      customer_id: input.customerId ?? null,
      step_number: input.stepNumber,
      channel: input.channel,
      strategy: input.strategy,
      tone: input.tone,
      scheduled_at: input.scheduledAt,
      metadata: {},
    });
  }

  private async completeCadenceStep(stepId: string, outcome: string): Promise<void> {
    const supabase = this.getSupabaseClient();
    if (!supabase) return;

    await supabase
      .from("follow_up_cadences")
      .update({ executed_at: new Date().toISOString(), outcome })
      .eq("id", stepId);
  }

  private async skipCadenceStep(stepId: string, reason: string): Promise<void> {
    const supabase = this.getSupabaseClient();
    if (!supabase) return;

    await supabase
      .from("follow_up_cadences")
      .update({ skipped_at: new Date().toISOString(), skip_reason: reason })
      .eq("id", stepId);
  }

  private async storeInsight(insight: TranscriptionInsight): Promise<void> {
    const supabase = this.getSupabaseClient();
    if (!supabase) return;

    await supabase.from("recovery_insights").insert({
      id: randomUUID(),
      lead_id: insight.leadId ?? null,
      call_id: insight.callId || null,
      source: insight.source,
      insight_type: insight.insightType,
      content: insight.content,
      customer_sentiment: insight.customerSentiment ?? null,
      objections: insight.objections,
      commitments: insight.commitments,
      preferred_channel: insight.preferredChannel ?? null,
      preferred_time: insight.preferredTime ?? null,
      payment_intent_strength: insight.paymentIntentStrength ?? null,
      metadata: insight.metadata,
    });
  }

  private async getLeadInsights(leadId: string): Promise<TranscriptionInsight[]> {
    const supabase = this.getSupabaseClient();
    if (!supabase) return [];

    const { data } = await supabase
      .from("recovery_insights")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })
      .limit(10);

    return (data ?? []).map((row: Record<string, unknown>) => ({
      leadId: row.lead_id as string,
      callId: row.call_id as string,
      source: "transcription" as const,
      insightType: row.insight_type as TranscriptionInsight["insightType"],
      content: row.content as string,
      customerSentiment: row.customer_sentiment as string | undefined,
      objections: (row.objections ?? []) as string[],
      commitments: (row.commitments ?? []) as string[],
      preferredChannel: row.preferred_channel as string | undefined,
      preferredTime: row.preferred_time as string | undefined,
      paymentIntentStrength: row.payment_intent_strength as TranscriptionInsight["paymentIntentStrength"],
      metadata: (row.metadata ?? {}) as Record<string, unknown>,
    }));
  }

  private async logAgentRun(
    runId: string,
    startedAt: number,
    durationMs: number,
    counters: Record<string, number>,
  ): Promise<void> {
    const supabase = this.getSupabaseClient();
    if (!supabase) return;

    await supabase.from("agent_runs").insert({
      id: runId,
      started_at: new Date(startedAt).toISOString(),
      completed_at: new Date().toISOString(),
      duration_ms: durationMs,
      inbound_processed: counters.inboundProcessed,
      cadences_executed: counters.cadencesExecuted,
      cadences_scheduled: counters.cadencesScheduled,
      calls_scheduled: counters.callsScheduled,
      scores_refreshed: counters.scoresRefreshed,
      escalations: counters.escalations,
      leads_closed: counters.leadsClosed,
      transcriptions_processed: counters.transcriptionsProcessed,
      insights_extracted: counters.insightsExtracted,
      errors: this.errors,
      metadata: {},
    });

    await this.storage.addLog(
      createStructuredLog({
        eventType: "worker_job_processed",
        level: this.errors.length ? "warn" : "info",
        message: `Agent tick completed in ${durationMs}ms`,
        context: {
          runId,
          durationMs,
          ...counters,
          errorCount: this.errors.length,
        },
      }),
    );
  }

  /* ── Lead / conversation helpers ── */

  private async resolveLeadBundle(lead: RecoveryLeadRecord): Promise<LeadBundle | null> {
    const [customer, payment] = await Promise.all([
      this.storage.findCustomer(lead.customerId),
      this.storage.findPayment({ paymentId: lead.paymentId }),
    ]);

    if (!customer || !payment) return null;

    return { record: lead, customer, payment };
  }

  private async findActiveConversation(
    lead: RecoveryLeadRecord,
    runtime: RuntimeConnectionSettings,
  ): Promise<ConversationRecord | null> {
    if (runtime.whatsappConfigured && isUsablePhone(lead.phone)) {
      return this.storage.upsertConversation({
        channel: "whatsapp",
        contactValue: lead.phone,
        customerName: lead.customerName,
        lead,
        customerId: lead.customerId,
      });
    }

    if (runtime.emailConfigured && isUsableEmail(lead.email)) {
      return this.storage.upsertConversation({
        channel: "email",
        contactValue: lead.email,
        customerName: lead.customerName,
        lead,
        customerId: lead.customerId,
      });
    }

    return null;
  }

  private async findLeadConversation(
    lead: RecoveryLeadRecord,
  ): Promise<ConversationRecord | null> {
    if (isUsablePhone(lead.phone)) {
      const conv = await this.storage.findConversationById?.(lead.id);
      if (conv) return conv;
    }
    return null;
  }

  private async hasCustomerResponded(conversationId: string): Promise<boolean> {
    const messages = await this.storage.getConversationMessages(conversationId);
    return messages.some((m) => m.direction === "inbound");
  }

  private buildConversationContext(
    bundle: LeadBundle,
    messages: MessageRecord[],
  ): ConversationContext {
    const inboundMessages = messages.filter((m) => m.direction === "inbound");
    const lastInbound = inboundMessages[inboundMessages.length - 1];

    return {
      lead: bundle.record,
      customer: bundle.customer,
      payment: bundle.payment,
      messages,
      cadenceStep: 0,
      recoveryScore: 50,
      customerSentiment: "neutral" as CustomerSentiment,
      objections: [],
      commitments: [],
      lastInboundIntent: lastInbound?.metadata?.inboundIntent as ConversationContext["lastInboundIntent"],
    };
  }

  private async scheduleVoiceCall(
    bundle: LeadBundle,
    step: CadenceStepRecord,
  ): Promise<void> {
    if (!isUsablePhone(bundle.customer.phone)) return;

    const voiceTone =
      (step.tone as "empathetic" | "professional" | "urgent" | "friendly" | "direct") ?? "empathetic";

    // Create the call record
    const callRecord = await this.storage.createCall({
      leadId: bundle.record.leadId,
      customerId: bundle.customer.id,
      direction: "outbound",
      toNumber: bundle.customer.phone,
      provider: "vapi",
      product: bundle.record.product ?? undefined,
      voiceTone,
      voiceGender: "female",
      metadata: { cadenceStep: step.stepNumber, strategy: step.strategy },
    });

    // Dispatch via Vapi if configured
    const vapi = getVapiService();
    if (vapi.configured) {
      const script = bundle.record.product
        ? `Pagamento pendente de ${bundle.record.product}. Ajudar o cliente a finalizar.`
        : "Pagamento pendente. Ajudar o cliente a finalizar.";

      await vapi.initiateCall({
        callRecord,
        customerName: bundle.customer.name,
        script,
        product: bundle.record.product ?? undefined,
        paymentValue: bundle.payment.amount,
        voiceTone,
        voiceGender: "female",
      });
    }
  }

  private async scheduleCustomFollowUp(
    lead: RecoveryLeadRecord | { leadId: string },
    delayMinutes: number,
    channel: string,
    commitment?: string,
  ): Promise<void> {
    const scheduledAt = new Date(Date.now() + delayMinutes * 60_000);

    await this.createCadenceStep({
      leadId: lead.leadId,
      stepNumber: 99, // custom/dynamic step
      channel,
      strategy: "contextual",
      tone: "empathetic",
      scheduledAt: scheduledAt.toISOString(),
    });
  }

  private minutesUntil(dateStr: string): number {
    const target = new Date(dateStr).getTime();
    return Math.max(0, Math.round((target - Date.now()) / 60_000));
  }

  /* ── Infrastructure ── */

  private async getAIApiKey(): Promise<string> {
    const settings = await this.storage.getConnectionSettings();
    return settings.openAiApiKey || appEnv.openAiApiKey || "";
  }

  private getSupabaseClient() {
    if (!appEnv.databaseConfigured) return null;

    // Access Supabase client from the storage service
    const storage = this.storage as { supabase?: unknown };
    if ("supabase" in storage && storage.supabase) {
      return storage.supabase as {
        from: (table: string) => {
          select: (...args: unknown[]) => unknown;
          insert: (data: unknown) => unknown;
          update: (data: unknown) => { eq: (col: string, val: string) => unknown };
          [key: string]: unknown;
        };
      };
    }

    // Fallback: create a new client
    const { createClient } = require("@supabase/supabase-js");
    return createClient(appEnv.supabaseUrl, appEnv.supabaseServiceRoleKey);
  }
}

/* ── Singleton ── */

declare global {
  var __autonomousAgent__: AutonomousRecoveryAgent | undefined;
}

export function getAutonomousAgent(): AutonomousRecoveryAgent {
  if (!globalThis.__autonomousAgent__) {
    globalThis.__autonomousAgent__ = new AutonomousRecoveryAgent();
  }
  return globalThis.__autonomousAgent__;
}

/* ── Row mapper ── */

function mapCadenceRow(row: Record<string, unknown>): CadenceStepRecord {
  return {
    id: row.id as string,
    leadId: row.lead_id as string,
    customerId: row.customer_id as string | undefined,
    stepNumber: row.step_number as number,
    channel: row.channel as CadenceStepRecord["channel"],
    strategy: row.strategy as string,
    tone: row.tone as string,
    scheduledAt: row.scheduled_at as string,
    executedAt: row.executed_at as string | undefined,
    skippedAt: row.skipped_at as string | undefined,
    skipReason: row.skip_reason as string | undefined,
    outcome: row.outcome as string | undefined,
    messageId: row.message_id as string | undefined,
    callId: row.call_id as string | undefined,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    createdAt: row.created_at as string,
  };
}

/* ── Utility ── */

function isUsablePhone(phone?: string | null) {
  return Boolean(phone && phone !== NOT_PROVIDED);
}

function isUsableEmail(email?: string | null) {
  return Boolean(email && email !== UNKNOWN_EMAIL);
}
