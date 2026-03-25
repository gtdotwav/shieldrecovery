import type { FollowUpContact } from "@/server/recovery/types";
import type { RecoveryClassification, RecoveryProbability } from "./types";
import { hasPhone } from "@/lib/contact";
import { formatCurrency, hoursSince } from "@/lib/format";

/**
 * Classifies a recovery lead by probability of success.
 *
 * Scoring model (0–100):
 * - Base: 40 points
 * - Reachable channel (phone): +15
 * - Payment value > R$100: +10
 * - Payment value > R$500: +5 (additional)
 * - Fresh lead (<6h): +15
 * - Medium freshness (6–24h): +8
 * - Has assigned agent: +5
 * - Failure reason is retryable: +10
 * - Lead status is NEW_RECOVERY: +5
 *
 * Probability thresholds:
 * - >= 75: high
 * - >= 50: medium
 * - >= 30: low
 * - < 30: manual
 */
export function classifyRecovery(contact: FollowUpContact): RecoveryClassification {
  let score = 40;
  const reasons: string[] = [];

  // Channel reachability
  if (hasPhone(contact.phone)) {
    score += 15;
    reasons.push("Canal WhatsApp disponível");
  } else {
    reasons.push("Sem canal direto (apenas e-mail)");
  }

  // Payment value signals
  if (contact.payment_value > 50_000) {
    score += 15;
    reasons.push(`Alto valor: ${formatCurrency(contact.payment_value)}`);
  } else if (contact.payment_value > 10_000) {
    score += 10;
    reasons.push(`Valor moderado: ${formatCurrency(contact.payment_value)}`);
  } else {
    reasons.push(`Baixo valor: ${formatCurrency(contact.payment_value)}`);
  }

  // Freshness
  const hours = hoursSince(contact.updated_at);
  if (hours < 6) {
    score += 15;
    reasons.push("Lead recente (<6h)");
  } else if (hours < 24) {
    score += 8;
    reasons.push("Lead moderadamente fresco (<24h)");
  } else {
    score -= 5;
    reasons.push(`Lead parado há ${Math.floor(hours / 24)}d`);
  }

  // Agent assignment
  if (contact.assigned_agent) {
    score += 5;
    reasons.push(`Responsável: ${contact.assigned_agent}`);
  }

  // Failure reason analysis
  const retryableReasons = [
    "insufficient_funds",
    "expired_card",
    "gateway_timeout",
    "processing_error",
    "gateway_error",
  ];
  const failureNormalized = (contact.payment_status ?? "").toLowerCase();
  if (retryableReasons.some((r) => failureNormalized.includes(r))) {
    score += 10;
    reasons.push("Motivo de falha é retentável");
  }

  // Pipeline position
  if (contact.lead_status === "NEW_RECOVERY") {
    score += 5;
    reasons.push("Lead em etapa inicial");
  } else if (contact.lead_status === "CONTACTING") {
    score += 3;
    reasons.push("Em contato ativo");
  }

  // Clamp to 0–100
  score = Math.max(0, Math.min(100, score));

  // Map to probability
  let probability: RecoveryProbability;
  let suggestedStrategy: string;

  if (score >= 75) {
    probability = "high";
    suggestedStrategy = "Execução automática completa — AI envia sequência e monitora.";
  } else if (score >= 50) {
    probability = "medium";
    suggestedStrategy = "AI envia primeira mensagem, agente humano acompanha.";
  } else if (score >= 30) {
    probability = "low";
    suggestedStrategy = "Contato manual recomendado — AI prepara contexto.";
  } else {
    probability = "manual";
    suggestedStrategy = "Intervenção humana necessária — AI não consegue recuperar.";
  }

  return {
    probability,
    score,
    reasoning: reasons.join(" · "),
    suggestedStrategy,
  };
}

/**
 * Batch-classify an array of contacts.
 */
export function classifyAll(
  contacts: FollowUpContact[],
): Array<FollowUpContact & { classification: RecoveryClassification }> {
  return contacts
    .map((c) => ({
      ...c,
      classification: classifyRecovery(c),
    }))
    .sort((a, b) => b.classification.score - a.classification.score);
}
