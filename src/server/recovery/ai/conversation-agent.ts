import type {
  MessageRecord,
  RecoveryLeadRecord,
  CustomerRecord,
  PaymentRecord,
  MessagingChannel,
} from "@/server/recovery/types";

import type {
  RecoveryMessageTone,
  InboundIntent,
  RecoveryNextActionType,
} from "./types";

import type { CadenceStrategy } from "./cadence-engine";

import { platformBrand } from "@/lib/platform";

/* ── Types ── */

export type ConversationContext = {
  lead: RecoveryLeadRecord;
  customer: CustomerRecord;
  payment: PaymentRecord;
  messages: MessageRecord[];
  cadenceStep: number;
  recoveryScore: number;
  customerSentiment: CustomerSentiment;
  objections: string[];
  commitments: string[];
  lastInboundIntent?: InboundIntent;
  callTranscriptSummary?: string;
  insightsFromHistory?: string[];
};

export type CustomerSentiment =
  | "positive"
  | "neutral"
  | "frustrated"
  | "hostile";

export type AgentDecision = {
  action: AgentAction;
  message?: string;
  tone: RecoveryMessageTone;
  reasoning: string;
  nextFollowUp?: { delayMinutes: number; channel: MessagingChannel };
  callRequired?: boolean;
  humanEscalation?: { reason: string; priority: "low" | "medium" | "high" };
  commitmentDetected?: string;
  sentimentUpdate?: CustomerSentiment;
};

export type AgentAction =
  | "reply"
  | "schedule_call"
  | "escalate_human"
  | "offer_alternative"
  | "schedule_followup"
  | "close_recovered"
  | "close_lost"
  | "wait";

/* ── Conversation Agent ── */

/**
 * Generate an AI-powered follow-up message using Claude API.
 * Falls back to template-based reply if API is unavailable.
 */
export async function generateAgentFollowUp(input: {
  context: ConversationContext;
  strategy: CadenceStrategy;
  channel: MessagingChannel;
  apiKey: string;
}): Promise<AgentDecision> {
  const { context, strategy, channel } = input;

  // Build decision without API call first (fallback)
  const fallback = buildFallbackDecision(context, strategy, channel);

  if (!input.apiKey) {
    return fallback;
  }

  try {
    const systemPrompt = buildAgentSystemPrompt();
    const userPrompt = buildAgentUserPrompt(context, strategy, channel);

    const response = await callAI({
      apiKey: input.apiKey,
      systemPrompt,
      userPrompt,
    });

    if (!response) {
      return fallback;
    }

    return parseAgentResponse(response, fallback);
  } catch {
    return fallback;
  }
}

/**
 * Analyze an inbound message with full conversation context
 * to determine the best response strategy.
 */
export async function analyzeInboundMessage(input: {
  context: ConversationContext;
  inboundContent: string;
  apiKey: string;
}): Promise<AgentDecision> {
  const fallback = buildInboundFallbackDecision(input.context, input.inboundContent);

  if (!input.apiKey) {
    return fallback;
  }

  try {
    const systemPrompt = buildAgentSystemPrompt();
    const userPrompt = buildInboundAnalysisPrompt(
      input.context,
      input.inboundContent,
    );

    const response = await callAI({
      apiKey: input.apiKey,
      systemPrompt,
      userPrompt,
    });

    if (!response) {
      return fallback;
    }

    return parseAgentResponse(response, fallback);
  } catch {
    return fallback;
  }
}

/* ── System prompt ── */

function buildAgentSystemPrompt(): string {
  return [
    `Voce e um agente autonomo de recuperacao de pagamentos da ${platformBrand.name}.`,
    "Seu objetivo e ajudar clientes a concluir pagamentos pendentes de forma natural, empatica e eficaz.",
    "",
    "PRINCIPIOS:",
    "- Nunca seja agressivo, ameacador ou insistente de forma excessiva",
    "- Sempre ofereca alternativas (PIX, cartao, boleto, parcelamento)",
    "- Se o cliente disse que vai pagar em data X, respeite e agende follow-up para X",
    "- Se o cliente esta irritado, recue e seja empatico",
    "- Se o cliente nao reconhece a compra, escale para humano imediatamente",
    "- Maximo de 3 mensagens sem resposta = pausa de 48h",
    "- Valor > R$300: considere sugerir chamada para facilitar",
    "- Use linguagem natural brasileira, sem formalidade excessiva",
    "- NAO use markdown, emojis, aspas ou formatacao especial",
    "- NAO inclua links ou codigos PIX no texto (sao adicionados automaticamente)",
    "- Quando referenciar link ou PIX, diga 'aqui embaixo'",
    "",
    "DETECCAO DE COMPROMISSOS:",
    "- Se o cliente disser 'vou pagar amanha/depois/segunda' → detecte como compromisso",
    "- Se disser 'ja paguei' → verifique e confirme",
    "- Se pedir parcelamento → ofereca e envie link",
    "",
    "SENTIMENTO:",
    "- Analise o tom do cliente e classifique: positive, neutral, frustrated, hostile",
    "- Ajuste sua abordagem de acordo",
    "",
    "FORMATO DE RESPOSTA:",
    "Responda EXCLUSIVAMENTE em JSON valido com esta estrutura:",
    '{',
    '  "action": "reply|schedule_call|escalate_human|offer_alternative|schedule_followup|close_recovered|close_lost|wait",',
    '  "message": "texto da mensagem para o cliente (se action=reply ou offer_alternative)",',
    '  "tone": "empathetic|urgent|casual|reassuring|direct",',
    '  "reasoning": "por que tomou esta decisao",',
    '  "nextFollowUp": { "delayMinutes": 240, "channel": "whatsapp" },',
    '  "callRequired": false,',
    '  "commitmentDetected": "cliente disse que paga amanha",',
    '  "sentimentUpdate": "neutral"',
    '}',
  ].join("\n");
}

/* ── User prompts ── */

function buildAgentUserPrompt(
  ctx: ConversationContext,
  strategy: CadenceStrategy,
  channel: MessagingChannel,
): string {
  const value = formatCurrency(ctx.payment.amount);
  const conversationSummary = summarizeConversation(ctx.messages);
  const insightsBlock = ctx.insightsFromHistory?.length
    ? `\nInsights de interacoes anteriores:\n${ctx.insightsFromHistory.map((i) => `- ${i}`).join("\n")}`
    : "";
  const transcriptBlock = ctx.callTranscriptSummary
    ? `\nResumo da ultima chamada:\n${ctx.callTranscriptSummary}`
    : "";

  return [
    `CONTEXTO DO LEAD:`,
    `- Cliente: ${ctx.customer.name}`,
    `- Produto: ${ctx.lead.product || "Nao informado"}`,
    `- Valor: ${value}`,
    `- Metodo: ${ctx.payment.paymentMethod}`,
    `- Falha: ${ctx.lead.failureReason || ctx.payment.failureCode || "Nao especificado"}`,
    `- Status: ${ctx.lead.status}`,
    `- Dias desde falha: ${daysSince(ctx.payment.firstFailureAt || ctx.lead.createdAt)}`,
    `- Score de recuperacao: ${ctx.recoveryScore}/100`,
    `- Sentimento atual: ${ctx.customerSentiment}`,
    `- Step da cadencia: ${ctx.cadenceStep}`,
    `- Canal: ${channel}`,
    `- Estrategia: ${strategy}`,
    "",
    `OBJECOES JA REGISTRADAS: ${ctx.objections.length ? ctx.objections.join(", ") : "nenhuma"}`,
    `COMPROMISSOS ANTERIORES: ${ctx.commitments.length ? ctx.commitments.join(", ") : "nenhum"}`,
    insightsBlock,
    transcriptBlock,
    "",
    `HISTORICO DA CONVERSA:`,
    conversationSummary || "(sem historico)",
    "",
    `TAREFA: Gere a proxima acao para este lead seguindo a estrategia "${strategy}".`,
  ].join("\n");
}

function buildInboundAnalysisPrompt(
  ctx: ConversationContext,
  inboundContent: string,
): string {
  const value = formatCurrency(ctx.payment.amount);
  const conversationSummary = summarizeConversation(ctx.messages);

  return [
    `MENSAGEM RECEBIDA DO CLIENTE:`,
    `"${inboundContent}"`,
    "",
    `CONTEXTO:`,
    `- Cliente: ${ctx.customer.name}`,
    `- Produto: ${ctx.lead.product || "Nao informado"}`,
    `- Valor: ${value}`,
    `- Status: ${ctx.lead.status}`,
    `- Score: ${ctx.recoveryScore}/100`,
    `- Sentimento anterior: ${ctx.customerSentiment}`,
    `- Objecoes: ${ctx.objections.join(", ") || "nenhuma"}`,
    "",
    `HISTORICO:`,
    conversationSummary || "(sem historico)",
    "",
    `TAREFA: Analise a mensagem do cliente e determine a melhor resposta.`,
    `Se o cliente demonstra intencao de pagar, facilite ao maximo.`,
    `Se esta frustrado, recue com empatia.`,
    `Se pede humano ou nao reconhece a compra, escale.`,
  ].join("\n");
}

/* ── AI API call (OpenAI) ── */

async function callAI(input: {
  apiKey: string;
  systemPrompt: string;
  userPrompt: string;
}): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      instructions: input.systemPrompt,
      input: input.userPrompt,
    }),
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const payload = (await response.json()) as {
    output_text?: string;
    output?: Array<{
      content?: Array<{ type?: string; text?: string }>;
    }>;
  };

  const fromTopLevel = payload.output_text?.trim();
  if (fromTopLevel) return fromTopLevel;

  const nestedText = payload.output
    ?.flatMap((item) => item.content ?? [])
    .map((content) => content.text?.trim() ?? "")
    .find(Boolean);

  return nestedText ?? "";
}

/* ── Response parsing ── */

function parseAgentResponse(raw: string, fallback: AgentDecision): AgentDecision {
  try {
    // Extract JSON from response (may be wrapped in markdown)
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return fallback;

    const parsed = JSON.parse(jsonMatch[0]) as Partial<AgentDecision>;

    return {
      action: validateAction(parsed.action) ?? fallback.action,
      message: parsed.message ?? fallback.message,
      tone: validateTone(parsed.tone) ?? fallback.tone,
      reasoning: parsed.reasoning ?? fallback.reasoning,
      nextFollowUp: parsed.nextFollowUp ?? fallback.nextFollowUp,
      callRequired: parsed.callRequired ?? fallback.callRequired,
      commitmentDetected: parsed.commitmentDetected,
      sentimentUpdate: validateSentiment(parsed.sentimentUpdate),
    };
  } catch {
    return fallback;
  }
}

function validateAction(action?: string): AgentAction | undefined {
  const valid: AgentAction[] = [
    "reply", "schedule_call", "escalate_human", "offer_alternative",
    "schedule_followup", "close_recovered", "close_lost", "wait",
  ];
  return valid.includes(action as AgentAction) ? (action as AgentAction) : undefined;
}

function validateTone(tone?: string): RecoveryMessageTone | undefined {
  const valid: RecoveryMessageTone[] = [
    "empathetic", "urgent", "casual", "reassuring", "direct",
  ];
  return valid.includes(tone as RecoveryMessageTone) ? (tone as RecoveryMessageTone) : undefined;
}

function validateSentiment(s?: string): CustomerSentiment | undefined {
  const valid: CustomerSentiment[] = ["positive", "neutral", "frustrated", "hostile"];
  return valid.includes(s as CustomerSentiment) ? (s as CustomerSentiment) : undefined;
}

/* ── Fallback decisions ── */

function buildFallbackDecision(
  ctx: ConversationContext,
  strategy: CadenceStrategy,
  channel: MessagingChannel,
): AgentDecision {
  const name = firstName(ctx.customer.name);
  const product = ctx.lead.product ? ` de ${ctx.lead.product}` : "";

  const messages: Record<CadenceStrategy, string> = {
    contextual: `${name}, o pagamento${product} continua disponivel aqui embaixo. Posso te ajudar com alguma duvida?`,
    urgency: `${name}, o pagamento${product} esta pendente. O link esta aqui embaixo para voce finalizar.`,
    alternative: `${name}, se preferir, posso gerar o pagamento via PIX, cartao ou boleto. Qual forma fica melhor pra voce?`,
    reengagement: `Oi ${name}, passando para lembrar que o pagamento${product} ainda esta disponivel aqui embaixo. Sem pressa.`,
    last_chance: `${name}, essa e a ultima vez que entro em contato sobre o pagamento${product}. O link fica aqui embaixo caso queira finalizar.`,
    voice_outreach: `${name}, vou te ligar para ajudar com o pagamento${product}. Pode atender agora?`,
    soft_close: `Oi ${name}, o link${product} continua aqui embaixo se voce quiser finalizar. Qualquer momento, sem pressa.`,
  };

  return {
    action: strategy === "voice_outreach" ? "schedule_call" : "reply",
    message: messages[strategy],
    tone: "empathetic",
    reasoning: `Fallback para estrategia ${strategy} no step ${ctx.cadenceStep}`,
    callRequired: strategy === "voice_outreach",
    nextFollowUp:
      strategy === "soft_close"
        ? undefined
        : { delayMinutes: 1_440, channel: "whatsapp" },
  };
}

function buildInboundFallbackDecision(
  ctx: ConversationContext,
  inboundContent: string,
): AgentDecision {
  const name = firstName(ctx.customer.name);
  const lower = inboundContent.toLowerCase();

  if (hasAny(lower, ["humano", "atendente", "pessoa"])) {
    return {
      action: "escalate_human",
      tone: "direct",
      reasoning: "Cliente pediu atendimento humano",
      humanEscalation: { reason: "customer_requested", priority: "medium" },
    };
  }

  if (hasAny(lower, ["ja paguei", "paguei", "fiz o pix", "pago"])) {
    return {
      action: "reply",
      message: `${name}, vou verificar o status do seu pagamento. Um momento.`,
      tone: "reassuring",
      reasoning: "Cliente afirma que pagou — verificar status",
    };
  }

  if (hasAny(lower, ["vou pagar", "quero pagar", "manda o pix", "manda o link"])) {
    return {
      action: "reply",
      message: `Perfeito, ${name}. O link e o Pix estao aqui embaixo.`,
      tone: "reassuring",
      reasoning: "Cliente demonstrou intencao de pagar",
      commitmentDetected: "intencao_imediata",
      sentimentUpdate: "positive",
    };
  }

  if (hasAny(lower, ["amanha", "depois", "mais tarde", "semana que vem"])) {
    const commitment = extractTimeCommitment(lower);
    return {
      action: "schedule_followup",
      message: `Sem problema, ${name}. Vou te lembrar. O link fica disponivel aqui embaixo quando quiser.`,
      tone: "reassuring",
      reasoning: `Cliente pediu tempo — ${commitment}`,
      commitmentDetected: commitment,
      nextFollowUp: { delayMinutes: commitment.includes("amanha") ? 1_440 : 2_880, channel: "whatsapp" },
    };
  }

  if (hasAny(lower, ["nao quero", "cancela", "desisto", "nao tenho interesse"])) {
    return {
      action: "wait",
      message: `Entendido, ${name}. Se mudar de ideia, o link fica disponivel.`,
      tone: "empathetic",
      reasoning: "Cliente demonstrou desinteresse — pausar automacao",
      sentimentUpdate: "frustrated",
    };
  }

  return {
    action: "reply",
    message: `${name}, o pagamento esta pronto aqui embaixo. Se tiver alguma duvida, pode me perguntar.`,
    tone: "empathetic",
    reasoning: "Resposta generica para mensagem nao classificada",
  };
}

/* ── Helpers ── */

function summarizeConversation(messages: MessageRecord[]): string {
  if (!messages.length) return "";

  const recent = messages.slice(-10);
  return recent
    .map((m) => {
      const dir = m.direction === "inbound" ? "CLIENTE" : "AGENTE";
      const time = new Date(m.createdAt).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
      return `[${time}] ${dir}: ${m.content.slice(0, 200)}`;
    })
    .join("\n");
}

function daysSince(dateStr: string): number {
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / 86_400_000);
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || "Cliente";
}

function formatCurrency(amountCents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format((Number.isFinite(amountCents) ? amountCents : 0) / 100);
}

function hasAny(text: string, fragments: string[]): boolean {
  return fragments.some((f) => text.includes(f));
}

function extractTimeCommitment(text: string): string {
  if (text.includes("amanha")) return "amanha";
  if (text.includes("segunda")) return "segunda-feira";
  if (text.includes("terca") || text.includes("terça")) return "terca-feira";
  if (text.includes("semana que vem")) return "semana que vem";
  if (text.includes("depois")) return "depois — sem data definida";
  if (text.includes("mais tarde")) return "mais tarde hoje";
  return "sem data definida";
}
