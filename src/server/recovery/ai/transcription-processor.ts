import type { CallRecord } from "@/server/recovery/types";
import { platformBrand } from "@/lib/platform";

/* ── Types ── */

export type TranscriptionInsight = {
  leadId?: string;
  callId: string;
  source: "transcription";
  insightType: InsightType;
  content: string;
  customerSentiment?: string;
  objections: string[];
  commitments: string[];
  preferredChannel?: string;
  preferredTime?: string;
  paymentIntentStrength?: PaymentIntentStrength;
  metadata: Record<string, unknown>;
};

export type InsightType =
  | "objection"
  | "commitment"
  | "sentiment"
  | "preference"
  | "payment_intent"
  | "escalation_needed"
  | "general";

export type PaymentIntentStrength =
  | "strong"
  | "moderate"
  | "weak"
  | "none";

export type TranscriptionAnalysis = {
  summary: string;
  insights: TranscriptionInsight[];
  nextAction: TranscriptionNextAction;
  callbackSuggested: boolean;
  callbackAt?: string;
};

export type TranscriptionNextAction =
  | "send_payment_link"
  | "schedule_callback"
  | "escalate_to_human"
  | "close_as_recovered"
  | "close_as_lost"
  | "send_follow_up"
  | "wait"
  | "offer_installments";

/* ── Processor ── */

/**
 * Process a call transcription and extract actionable insights.
 * Uses Claude API for deep analysis when available,
 * falls back to keyword-based extraction.
 */
export async function processTranscription(input: {
  call: CallRecord;
  apiKey?: string;
}): Promise<TranscriptionAnalysis> {
  const { call } = input;

  if (!call.transcript) {
    return emptyAnalysis(call);
  }

  if (input.apiKey) {
    try {
      return await analyzeWithAI(call, input.apiKey);
    } catch {
      // Fall through to keyword analysis
    }
  }

  return analyzeWithKeywords(call);
}

/* ── Claude-based analysis ── */

async function analyzeWithAI(
  call: CallRecord,
  apiKey: string,
): Promise<TranscriptionAnalysis> {
  const prompt = buildTranscriptionPrompt(call);

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      instructions: buildTranscriptionSystemPrompt(),
      input: prompt,
    }),
    signal: AbortSignal.timeout(25_000),
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
  const nestedText = payload.output
    ?.flatMap((item) => item.content ?? [])
    .map((content) => content.text?.trim() ?? "")
    .find(Boolean);

  const text = fromTopLevel || nestedText || "";
  return parseTranscriptionResponse(text, call);
}

function buildTranscriptionSystemPrompt(): string {
  return [
    `Voce analisa transcricoes de chamadas de recuperacao de pagamento da ${platformBrand.name}.`,
    "Seu objetivo e extrair insights acionaveis que alimentam o sistema de follow-up autonomo.",
    "",
    "EXTRAIA:",
    "1. OBJECOES: motivos pelos quais o cliente nao pagou (sem dinheiro, nao reconhece, caro, etc.)",
    "2. COMPROMISSOS: qualquer promessa de pagamento com data/hora",
    "3. SENTIMENTO: como o cliente se sentiu (positivo, neutro, frustrado, hostil)",
    "4. PREFERENCIAS: canal preferido (whatsapp, email, ligacao) e horario",
    "5. INTENCAO DE PAGAMENTO: forte, moderada, fraca ou nenhuma",
    "6. PROXIMA ACAO: o que o sistema deve fazer a seguir",
    "",
    "FORMATO (JSON):",
    "{",
    '  "summary": "resumo em 1-2 frases",',
    '  "objections": ["sem dinheiro agora", "acha caro"],',
    '  "commitments": ["vai pagar segunda-feira"],',
    '  "sentiment": "neutral",',
    '  "preferredChannel": "whatsapp",',
    '  "preferredTime": "manha",',
    '  "paymentIntentStrength": "moderate",',
    '  "nextAction": "schedule_callback|send_payment_link|escalate_to_human|close_as_recovered|close_as_lost|send_follow_up|wait|offer_installments",',
    '  "callbackSuggested": true,',
    '  "callbackAt": "2026-03-31T09:00:00Z"',
    "}",
  ].join("\n");
}

function buildTranscriptionPrompt(call: CallRecord): string {
  return [
    "TRANSCRICAO DA CHAMADA:",
    call.transcript ?? "(vazia)",
    "",
    `DURACAO: ${call.durationSeconds}s`,
    `RESULTADO REGISTRADO: ${call.outcome ?? "nao definido"}`,
    `PRODUTO: ${call.product ?? "nao informado"}`,
    `SENTIMENTO REGISTRADO: ${call.sentiment ?? "nao informado"}`,
    "",
    "Analise a transcricao e extraia os insights.",
  ].join("\n");
}

function parseTranscriptionResponse(
  raw: string,
  call: CallRecord,
): TranscriptionAnalysis {
  const fallback = analyzeWithKeywords(call);

  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return fallback;

    const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
    const objections = Array.isArray(parsed.objections) ? parsed.objections as string[] : [];
    const commitments = Array.isArray(parsed.commitments) ? parsed.commitments as string[] : [];

    const insights: TranscriptionInsight[] = [];

    if (objections.length) {
      insights.push({
        callId: call.id,
        leadId: call.leadId ?? undefined,
        source: "transcription",
        insightType: "objection",
        content: objections.join("; "),
        objections,
        commitments: [],
        metadata: {},
      });
    }

    if (commitments.length) {
      insights.push({
        callId: call.id,
        leadId: call.leadId ?? undefined,
        source: "transcription",
        insightType: "commitment",
        content: commitments.join("; "),
        objections: [],
        commitments,
        metadata: {},
      });
    }

    insights.push({
      callId: call.id,
      leadId: call.leadId ?? undefined,
      source: "transcription",
      insightType: "sentiment",
      content: String(parsed.summary ?? ""),
      customerSentiment: String(parsed.sentiment ?? "neutral"),
      objections,
      commitments,
      preferredChannel: parsed.preferredChannel as string | undefined,
      preferredTime: parsed.preferredTime as string | undefined,
      paymentIntentStrength: parsed.paymentIntentStrength as PaymentIntentStrength | undefined,
      metadata: { callDuration: call.durationSeconds, outcome: call.outcome },
    });

    return {
      summary: String(parsed.summary ?? fallback.summary),
      insights,
      nextAction: validateNextAction(parsed.nextAction as string) ?? fallback.nextAction,
      callbackSuggested: Boolean(parsed.callbackSuggested),
      callbackAt: parsed.callbackAt as string | undefined,
    };
  } catch {
    return fallback;
  }
}

/* ── Keyword-based fallback ── */

function analyzeWithKeywords(call: CallRecord): TranscriptionAnalysis {
  const text = (call.transcript ?? "").toLowerCase();
  const objections: string[] = [];
  const commitments: string[] = [];
  let sentiment = "neutral";
  let nextAction: TranscriptionNextAction = "send_follow_up";
  let paymentIntent: PaymentIntentStrength = "none";

  // Objection detection
  if (hasAny(text, ["nao tenho dinheiro", "sem dinheiro", "to sem grana"])) {
    objections.push("sem dinheiro");
  }
  if (hasAny(text, ["caro", "muito caro", "preco alto"])) {
    objections.push("acha caro");
    nextAction = "offer_installments";
  }
  if (hasAny(text, ["nao reconheco", "nao comprei", "nao fiz essa compra"])) {
    objections.push("nao reconhece a compra");
    nextAction = "escalate_to_human";
  }
  if (hasAny(text, ["golpe", "fraude", "scam"])) {
    objections.push("suspeita de fraude");
    nextAction = "escalate_to_human";
    sentiment = "hostile";
  }

  // Commitment detection
  if (hasAny(text, ["vou pagar", "pago amanha", "pago segunda", "pago hoje"])) {
    commitments.push(extractCommitment(text));
    paymentIntent = "strong";
    nextAction = "schedule_callback";
  }
  if (hasAny(text, ["ja paguei", "paguei", "fiz o pix"])) {
    paymentIntent = "strong";
    nextAction = "send_follow_up";
  }

  // Payment intent
  if (hasAny(text, ["quero pagar", "como pago", "manda o link", "manda o pix"])) {
    paymentIntent = "strong";
    nextAction = "send_payment_link";
  }
  if (hasAny(text, ["vou ver", "vou pensar", "talvez"])) {
    paymentIntent = "weak";
  }

  // Sentiment
  if (hasAny(text, ["obrigado", "valeu", "perfeito", "ok"])) {
    sentiment = "positive";
  }
  if (hasAny(text, ["irritado", "absurdo", "ridiculo", "raiva"])) {
    sentiment = "frustrated";
  }

  // Outcome-based adjustments
  if (call.outcome === "recovered") {
    nextAction = "close_as_recovered";
    sentiment = "positive";
  }
  if (call.outcome === "no_interest") {
    nextAction = "close_as_lost";
  }

  const summary = buildKeywordSummary(call, objections, commitments, sentiment);

  const insights: TranscriptionInsight[] = [
    {
      callId: call.id,
      leadId: call.leadId ?? undefined,
      source: "transcription",
      insightType: "general",
      content: summary,
      customerSentiment: sentiment,
      objections,
      commitments,
      paymentIntentStrength: paymentIntent,
      metadata: { callDuration: call.durationSeconds, outcome: call.outcome },
    },
  ];

  return {
    summary,
    insights,
    nextAction,
    callbackSuggested: commitments.length > 0 || call.callbackScheduledAt != null,
    callbackAt: call.callbackScheduledAt ?? undefined,
  };
}

/* ── Helpers ── */

function emptyAnalysis(call: CallRecord): TranscriptionAnalysis {
  return {
    summary: "Chamada sem transcricao disponivel.",
    insights: [],
    nextAction: "send_follow_up",
    callbackSuggested: false,
  };
}

function buildKeywordSummary(
  call: CallRecord,
  objections: string[],
  commitments: string[],
  sentiment: string,
): string {
  const parts = [
    `Chamada de ${call.durationSeconds}s`,
    call.outcome ? `resultado: ${call.outcome}` : null,
    objections.length ? `objecoes: ${objections.join(", ")}` : null,
    commitments.length ? `compromissos: ${commitments.join(", ")}` : null,
    `sentimento: ${sentiment}`,
  ].filter(Boolean);

  return parts.join(" | ");
}

function hasAny(text: string, fragments: string[]): boolean {
  return fragments.some((f) => text.includes(f));
}

function extractCommitment(text: string): string {
  if (text.includes("amanha")) return "pagar amanha";
  if (text.includes("segunda")) return "pagar segunda-feira";
  if (text.includes("hoje")) return "pagar hoje";
  return "compromisso de pagamento sem data";
}

function validateNextAction(action?: string): TranscriptionNextAction | undefined {
  const valid: TranscriptionNextAction[] = [
    "send_payment_link", "schedule_callback", "escalate_to_human",
    "close_as_recovered", "close_as_lost", "send_follow_up",
    "wait", "offer_installments",
  ];
  return valid.includes(action as TranscriptionNextAction)
    ? (action as TranscriptionNextAction)
    : undefined;
}
