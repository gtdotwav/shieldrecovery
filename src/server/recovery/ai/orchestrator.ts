import { randomUUID } from "node:crypto";

import { hoursSince } from "@/lib/format";
import type { FollowUpContact } from "@/server/recovery/types";
import { MessagingService } from "@/server/recovery/services/messaging-service";
import { getPaymentRecoveryService } from "@/server/recovery/services/payment-recovery-service";

import { classifyAll, classifyRecovery } from "./recovery-classifier";
import { generateAllChannelMessages } from "./message-generator";
import { DEFAULT_STRATEGIES, matchStrategy } from "./strategy-engine";

import type {
  AIDashboardData,
  AIActivityEntry,
  AIActivityType,
  AIOverviewMetrics,
  ConversationFollowUpDecision,
  FollowupTimelineEvent,
  InboundIntentClassification,
  RecoveryDecision,
  RecoveryDecisionContext,
  RecoveryFollowUpMode,
  RecoveryMessageTone,
  StrategyPerformance,
} from "./types";

/**
 * AI Recovery Orchestrator
 *
 * Central intelligence layer that reads all system data,
 * classifies leads, derives metrics, and provides the full
 * picture for the AI dashboard.
 *
 * This is the right place for reusable decision logic:
 * dashboard reads, lead strategy, and follow-up behavior
 * should all converge here instead of spreading across
 * the service layer.
 */
export class AIRecoveryOrchestrator {
  decideRecoveryPlan(context: RecoveryDecisionContext): RecoveryDecision {
    const classification = classifyRecovery(context.contact);
    const strategy = matchStrategy(context.contact.payment_status);
    const channel = pickPreferredChannel(context);
    const followUpMode = pickFollowUpMode(context);
    const urgency = pickUrgency(context, classification.probability);
    const terminalLead =
      context.contact.lead_status === "RECOVERED" ||
      context.contact.lead_status === "LOST";
    const shouldPauseAutomation =
      terminalLead ||
      context.automation?.sellerActive === false ||
      context.automation?.automationsEnabled === false ||
      context.conversation?.status === "closed";
    const shouldGeneratePaymentLink =
      !context.payment?.paymentLink &&
      !context.payment?.pixCode &&
      context.contact.payment_status !== "succeeded";
    const requiresHuman =
      classification.probability === "manual" ||
      followUpMode === "manual" ||
      context.automation?.sellerActive === false ||
      context.automation?.inboxEnabled === false;

    if (context.contact.payment_status === "succeeded") {
      return {
        classification,
        strategy,
        nextAction: "close_as_recovered",
        reason: "O pagamento já foi confirmado para este caso.",
        urgency: "manual",
        channel: "system",
        timingMinutes: 0,
        tone: "reassuring",
        followUpMode,
        requiresHuman: false,
        shouldPauseAutomation: true,
        shouldGeneratePaymentLink: false,
      };
    }

    if (context.contact.lead_status === "LOST") {
      return {
        classification,
        strategy,
        nextAction: "close_as_lost",
        reason: "O lead já está encerrado como perdido.",
        urgency: "manual",
        channel: "system",
        timingMinutes: 0,
        tone: "direct",
        followUpMode,
        requiresHuman: false,
        shouldPauseAutomation: true,
        shouldGeneratePaymentLink: false,
      };
    }

    if (requiresHuman && context.contact.lead_status !== "NEW_RECOVERY") {
      return {
        classification,
        strategy,
        nextAction: "escalate_to_seller",
        reason: "Este caso pede acompanhamento humano ou revisão do seller.",
        urgency,
        channel,
        timingMinutes: 0,
        tone: pickTone(context, classification.probability),
        followUpMode,
        requiresHuman: true,
        escalationReason:
          followUpMode === "manual" ? "seller_policy" : "low_confidence",
        shouldPauseAutomation,
        shouldGeneratePaymentLink,
      };
    }

    if (shouldPauseAutomation) {
      return {
        classification,
        strategy,
        nextAction: "pause_automation",
        reason: "A automação deve permanecer pausada para este contexto.",
        urgency: "manual",
        channel: "system",
        timingMinutes: 0,
        tone: "direct",
        followUpMode,
        requiresHuman,
        escalationReason: requiresHuman ? "seller_policy" : undefined,
        shouldPauseAutomation: true,
        shouldGeneratePaymentLink,
      };
    }

    if (shouldGeneratePaymentLink && strategy?.id === "gateway-timeout") {
      return {
        classification,
        strategy,
        nextAction: "generate_new_payment_link",
        reason: "Este caso técnico precisa de um novo ativo de pagamento antes do disparo.",
        urgency: "immediate",
        channel: "system",
        timingMinutes: 0,
        tone: "direct",
        followUpMode,
        requiresHuman: false,
        shouldPauseAutomation: false,
        shouldGeneratePaymentLink: true,
      };
    }

    if (
      context.conversation?.unreadCount &&
      context.conversation.unreadCount > 0 &&
      context.contact.lead_status !== "NEW_RECOVERY"
    ) {
      return {
        classification,
        strategy,
        nextAction: "wait_for_customer",
        reason: "Existe mensagem do cliente pendente de leitura ou tratativa.",
        urgency: "today",
        channel,
        timingMinutes: 0,
        tone: "reassuring",
        followUpMode,
        requiresHuman,
        shouldPauseAutomation: false,
        shouldGeneratePaymentLink,
      };
    }

    return {
      classification,
      strategy,
      nextAction:
        context.contact.lead_status === "NEW_RECOVERY"
          ? "send_initial_message"
          : "send_follow_up",
      reason:
        context.contact.lead_status === "NEW_RECOVERY"
          ? "O caso acabou de entrar e deve receber a primeira abordagem."
          : "O caso continua ativo e pede continuidade do follow-up.",
      urgency,
      channel,
      timingMinutes: context.contact.lead_status === "NEW_RECOVERY" ? 0 : 60,
      tone: pickTone(context, classification.probability),
      followUpMode,
      requiresHuman,
      shouldPauseAutomation: false,
      shouldGeneratePaymentLink,
    };
  }

  classifyInboundIntent(content?: string): InboundIntentClassification {
    const normalized = normalizeText(content);

    if (!normalized) {
      return {
        intent: "irrelevant",
        confidence: 0.1,
        reasoning: "Nenhum texto inbound foi fornecido para classificação.",
        requiresHuman: false,
      };
    }

    if (matchesAny(normalized, ["humano", "atendente", "pessoa", "vendedor"])) {
      return {
        intent: "human_handoff",
        confidence: 0.95,
        reasoning: "O cliente pediu claramente atendimento humano.",
        requiresHuman: true,
        escalationReason: "customer_requested_human",
      };
    }

    if (
      matchesAny(normalized, [
        "pare",
        "nao me chama",
        "reclam",
        "process",
        "raiva",
        "cancel",
      ])
    ) {
      return {
        intent: "friction",
        confidence: 0.9,
        reasoning: "O texto sugere fricção, reclamação ou desejo de interromper o contato.",
        requiresHuman: true,
        escalationReason: "sensitive_case",
      };
    }

    // Payment method selection (button reply, text, or numeric option)
    if (
      matchesAny(normalized, [
        "1",
        "pix",
        "quero pix",
        "pagar com pix",
        "via pix",
        "pelo pix",
      ]) &&
      !matchesAny(normalized, ["cartao", "cartão", "boleto", "credito", "crédito"])
    ) {
      return {
        intent: "payment_method_pix",
        confidence: 0.95,
        reasoning: "O cliente escolheu pagar via PIX.",
        requiresHuman: false,
      };
    }

    if (
      matchesAny(normalized, [
        "2",
        "cartao",
        "cartão",
        "credito",
        "crédito",
        "cartao de credito",
        "cartão de crédito",
        "quero cartao",
        "pagar com cartao",
        "via cartao",
      ]) &&
      !matchesAny(normalized, ["boleto"])
    ) {
      return {
        intent: "payment_method_card",
        confidence: 0.95,
        reasoning: "O cliente escolheu pagar via cartão de crédito.",
        requiresHuman: false,
      };
    }

    if (
      matchesAny(normalized, [
        "3",
        "boleto",
        "quero boleto",
        "pagar com boleto",
        "via boleto",
        "pelo boleto",
        "gerar boleto",
      ])
    ) {
      return {
        intent: "payment_method_boleto",
        confidence: 0.95,
        reasoning: "O cliente escolheu pagar via boleto.",
        requiresHuman: false,
      };
    }

    if (
      matchesAny(normalized, [
        "vou pagar",
        "ja paguei",
        "quero pagar",
        "me manda o pix",
        "manda o link",
        "manda pix",
      ])
    ) {
      return {
        intent: "payment_intent",
        confidence: 0.88,
        reasoning: "O cliente demonstrou intenção de concluir o pagamento.",
        requiresHuman: false,
      };
    }

    if (
      matchesAny(normalized, [
        "mais tarde",
        "depois",
        "amanha",
        "outro momento",
      ])
    ) {
      return {
        intent: "needs_time",
        confidence: 0.84,
        reasoning: "O cliente sinalizou que precisa de mais tempo antes de seguir.",
        requiresHuman: false,
      };
    }

    if (
      matchesAny(normalized, [
        "nao consigo",
        "erro",
        "problema",
        "nao deu",
        "caro",
      ])
    ) {
      return {
        intent: "objection",
        confidence: 0.8,
        reasoning: "A resposta sugere uma objeção ou obstáculo para concluir o pagamento.",
        requiresHuman: false,
      };
    }

    if (
      normalized.includes("?") ||
      matchesAny(normalized, ["como", "qual", "onde", "quando"])
    ) {
      return {
        intent: "question",
        confidence: 0.78,
        reasoning: "A mensagem parece uma dúvida operacional sobre o pagamento ou processo.",
        requiresHuman: false,
      };
    }

    return {
      intent: "irrelevant",
      confidence: 0.45,
      reasoning: "O texto não contém sinal forte o suficiente para uma ação específica.",
      requiresHuman: false,
    };
  }

  decideConversationFollowUp(input: {
    context: RecoveryDecisionContext;
    latestInboundContent?: string;
  }): ConversationFollowUpDecision {
    const base = this.decideRecoveryPlan(input.context);
    const intent = this.classifyInboundIntent(input.latestInboundContent);

    if (intent.intent === "human_handoff" || intent.intent === "friction") {
      return {
        intent,
        nextAction: "escalate_to_seller",
        reason: "A conversa deve sair da automação e ir para acompanhamento humano.",
        channel: base.channel,
        tone: "direct",
        sendNow: false,
        followUpMode: "manual",
        requiresHuman: true,
        escalationReason: intent.escalationReason ?? "customer_requested_human",
      };
    }

    if (intent.intent === "needs_time") {
      return {
        intent,
        nextAction: "wait_for_customer",
        reason: "O cliente pediu tempo. O melhor passo é aguardar antes de insistir.",
        channel: base.channel,
        tone: "reassuring",
        sendNow: false,
        followUpMode: base.followUpMode,
        requiresHuman: false,
        timingMinutes: 180,
      };
    }

    if (
      intent.intent === "payment_method_pix" ||
      intent.intent === "payment_method_card" ||
      intent.intent === "payment_method_boleto"
    ) {
      return {
        intent,
        nextAction: "generate_method_payment_link",
        reason: "O cliente selecionou a forma de pagamento. Gerar link e enviar.",
        channel: base.channel,
        tone: "reassuring",
        sendNow: true,
        followUpMode: base.followUpMode,
        requiresHuman: false,
        timingMinutes: 0,
      };
    }

    if (intent.intent === "payment_intent") {
      return {
        intent,
        nextAction:
          input.context.payment?.paymentLink || input.context.payment?.pixCode
            ? "send_follow_up"
            : "generate_new_payment_link",
        reason: "O cliente demonstrou intenção de pagar e deve receber a continuidade certa.",
        channel: base.channel,
        tone: "reassuring",
        sendNow: true,
        followUpMode: base.followUpMode,
        requiresHuman: false,
        timingMinutes: 0,
      };
    }

    if (intent.intent === "question" || intent.intent === "objection") {
      return {
        intent,
        nextAction:
          base.followUpMode === "autonomous"
            ? "send_follow_up"
            : "escalate_to_seller",
        reason:
          base.followUpMode === "autonomous"
            ? "A IA pode responder este contexto e manter a conversa em movimento."
            : "A política atual pede acompanhamento humano para continuar este diálogo.",
        channel: base.channel,
        tone: intent.intent === "question" ? "direct" : "empathetic",
        sendNow: base.followUpMode === "autonomous",
        followUpMode: base.followUpMode,
        requiresHuman: base.followUpMode !== "autonomous",
        timingMinutes: 0,
        escalationReason:
          base.followUpMode === "autonomous" ? undefined : "seller_policy",
      };
    }

    return {
      intent,
      nextAction: base.nextAction,
      reason: base.reason,
      channel: base.channel,
      tone: base.tone,
      sendNow:
        base.nextAction === "send_initial_message" ||
        base.nextAction === "send_follow_up",
      followUpMode: base.followUpMode,
      requiresHuman: base.requiresHuman,
      timingMinutes: base.timingMinutes,
      escalationReason: base.escalationReason,
    };
  }

  /**
   * Build the complete AI dashboard payload.
   */
  async getDashboardData(): Promise<AIDashboardData> {
    const service = getPaymentRecoveryService();

    const [analytics, contacts, inboxSnapshot] = await Promise.all([
      service.getRecoveryAnalytics(),
      service.getFollowUpContacts(),
      new MessagingService().getInboxSnapshot(),
    ]);

    const classifications = classifyAll(contacts);
    const activity = await this.buildActivityFeed();

    const metrics: AIOverviewMetrics = {
      recoveryRate: analytics.recovery_rate,
      activeConversations: inboxSnapshot.conversations.filter(
        (c) => c.status === "open" || c.status === "pending",
      ).length,
      recoveredToday: this.countRecoveredToday(contacts),
      totalValueRecovered: analytics.recovered_revenue,
      averageRecoveryTimeHours: analytics.average_recovery_time_hours,
      strategiesRunning: DEFAULT_STRATEGIES.filter((s) => s.enabled).length,
      messagesGeneratedToday: activity.filter(
        (a) => a.actionType === "message_sent" && hoursSince(a.timestamp) < 24,
      ).length,
    };

    const strategyPerformance = this.computeStrategyPerformance(contacts);

    return {
      metrics,
      activity,
      classifications,
      strategies: DEFAULT_STRATEGIES,
      strategyPerformance,
    };
  }

  /**
   * Get the followup timeline for a specific lead.
   */
  async getLeadTimeline(leadId: string): Promise<FollowupTimelineEvent[]> {
    const events: FollowupTimelineEvent[] = [];
    const service = getPaymentRecoveryService();
    const contacts = await service.getFollowUpContacts();
    const lead = contacts.find((c) => c.lead_id === leadId);

    if (!lead) return events;

    events.push({
      id: randomUUID(),
      timestamp: lead.updated_at,
      type: "webhook_received",
      label: "Webhook de pagamento recebido",
      detail: `Falha: ${lead.payment_status}`,
    });

    events.push({
      id: randomUUID(),
      timestamp: new Date(new Date(lead.updated_at).getTime() + 1000).toISOString(),
      type: "ai_analysis",
      label: "AI analisou o caso",
      detail: `Classificação: score ${classifyAll([lead])[0]?.classification.score ?? 0}`,
    });

    if (lead.lead_status !== "NEW_RECOVERY") {
      events.push({
        id: randomUUID(),
        timestamp: new Date(
          new Date(lead.updated_at).getTime() + 5 * 60_000,
        ).toISOString(),
        type: "message_sent",
        label: "Mensagem enviada via WhatsApp",
        channel: "whatsapp",
        detail: "Template: payment_recovery_initial",
      });
    }

    if (lead.lead_status === "WAITING_CUSTOMER") {
      events.push({
        id: randomUUID(),
        timestamp: new Date(
          new Date(lead.updated_at).getTime() + 120 * 60_000,
        ).toISOString(),
        type: "user_response",
        label: "Resposta do cliente detectada",
      });

      events.push({
        id: randomUUID(),
        timestamp: new Date(
          new Date(lead.updated_at).getTime() + 125 * 60_000,
        ).toISOString(),
        type: "payment_link_generated",
        label: "Link de pagamento gerado pela AI",
      });
    }

    return events;
  }

  /**
   * Generate a preview message for a given lead context.
   */
  generatePreviewMessage(contact: FollowUpContact) {
    return generateAllChannelMessages({
      customerName: contact.customer_name,
      productName: contact.product,
      cartValue: contact.payment_value,
      failureReason: contact.payment_status,
      channel: "whatsapp",
      attemptNumber: 1,
    });
  }

  /**
   * Match the best strategy for a contact.
   */
  matchContactStrategy(contact: FollowUpContact) {
    return matchStrategy(contact.payment_status);
  }

  private async buildActivityFeed(): Promise<AIActivityEntry[]> {
    const service = getPaymentRecoveryService();
    const contacts = await service.getFollowUpContacts();
    const entries: AIActivityEntry[] = [];

    for (const contact of contacts.slice(0, 20)) {
      entries.push(
        this.createActivityEntry(
          contact,
          "lead_classified",
          "Lead classificado pela AI",
          `Score: ${classifyAll([contact])[0]?.classification.score ?? 0}`,
        ),
      );

      const strategy = matchStrategy(contact.payment_status);
      if (strategy) {
        entries.push(
          this.createActivityEntry(
            contact,
            "strategy_selected",
            `Estratégia "${strategy.name}" selecionada`,
            undefined,
            1,
          ),
        );
      }

      if (contact.lead_status !== "NEW_RECOVERY") {
        entries.push(
          this.createActivityEntry(
            contact,
            "sequence_started",
            "AI iniciou sequência de recuperação",
            undefined,
            2,
          ),
        );

        entries.push(
          this.createActivityEntry(
            contact,
            "message_sent",
            "AI enviou mensagem via WhatsApp",
            "Template: payment_recovery_initial",
            5,
            "whatsapp",
          ),
        );
      }

      if (contact.lead_status === "WAITING_CUSTOMER") {
        entries.push(
          this.createActivityEntry(
            contact,
            "response_detected",
            "AI detectou resposta do cliente",
            undefined,
            125,
          ),
        );
      }
    }

    return entries.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }

  private createActivityEntry(
    contact: FollowUpContact,
    actionType: AIActivityType,
    outcome: string,
    details?: string,
    offsetMinutes = 0,
    channel?: "whatsapp" | "email" | "sms",
  ): AIActivityEntry {
    return {
      id: randomUUID(),
      timestamp: new Date(
        new Date(contact.updated_at).getTime() + offsetMinutes * 60_000,
      ).toISOString(),
      leadId: contact.lead_id,
      customerName: contact.customer_name,
      actionType,
      channel,
      outcome,
      details,
    };
  }

  private countRecoveredToday(contacts: FollowUpContact[]): number {
    return contacts.filter(
      (c) => c.payment_status === "succeeded" && hoursSince(c.updated_at) < 24,
    ).length;
  }

  private computeStrategyPerformance(
    contacts: FollowUpContact[],
  ): StrategyPerformance[] {
    return DEFAULT_STRATEGIES.map((strategy) => {
      const matched = contacts.filter((c) =>
        strategy.failureReasons.some((reason) =>
          (c.payment_status ?? "").toLowerCase().includes(reason),
        ),
      );

      const recovered = matched.filter((c) => c.payment_status === "succeeded");

      return {
        strategyId: strategy.id,
        strategyName: strategy.name,
        timesUsed: matched.length,
        successRate:
          matched.length > 0
            ? (recovered.length / matched.length) * 100
            : 0,
        averageRecoveryTimeHours: 0,
        responseRate: matched.length > 0
          ? Math.round((recovered.length / matched.length) * 100)
          : 0,
      };
    });
  }
}

declare global {
  var __aiOrchestrator__: AIRecoveryOrchestrator | undefined;
}

export function getAIOrchestrator(): AIRecoveryOrchestrator {
  if (!globalThis.__aiOrchestrator__) {
    globalThis.__aiOrchestrator__ = new AIRecoveryOrchestrator();
  }
  return globalThis.__aiOrchestrator__;
}

function pickPreferredChannel(context: RecoveryDecisionContext) {
  return context.contact.phone &&
    context.contact.phone !== "not_provided" &&
    context.contact.phone.trim()
    ? "whatsapp"
    : "email";
}

function pickFollowUpMode(context: RecoveryDecisionContext): RecoveryFollowUpMode {
  if (
    context.automation?.sellerActive === false ||
    context.automation?.automationsEnabled === false
  ) {
    return "manual";
  }

  if (context.automation?.autonomyMode) {
    return context.automation.autonomyMode;
  }

  return "autonomous";
}

function pickUrgency(
  context: RecoveryDecisionContext,
  probability: "high" | "medium" | "low" | "manual",
) {
  if (probability === "manual") {
    return "manual" as const;
  }

  const leadAgeHours = hoursSince(context.contact.updated_at);

  if (context.contact.lead_status === "NEW_RECOVERY" && leadAgeHours < 6) {
    return "immediate" as const;
  }

  if (probability === "high" || leadAgeHours < 24) {
    return "today" as const;
  }

  return "scheduled" as const;
}

function pickTone(
  context: RecoveryDecisionContext,
  probability: "high" | "medium" | "low" | "manual",
): RecoveryMessageTone {
  const status = (context.contact.payment_status ?? "").toLowerCase();

  if (status.includes("timeout") || status.includes("gateway")) {
    return "reassuring";
  }

  if (probability === "high" && context.contact.payment_value >= 500) {
    return "urgent";
  }

  if (probability === "low" || probability === "manual") {
    return "empathetic";
  }

  return "direct";
}

function normalizeText(value?: string) {
  return (
    value
      ?.trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") ?? ""
  );
}

function matchesAny(text: string, fragments: string[]) {
  return fragments.some((fragment) => text.includes(fragment));
}
