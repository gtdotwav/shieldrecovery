import type { RecoveryStrategy } from "./types";

/**
 * Default recovery strategies.
 * In production these would live in the database and be editable via UI.
 * For now they're defined here as the source of truth.
 */
export const DEFAULT_STRATEGIES: RecoveryStrategy[] = [
  {
    id: "card-declined",
    name: "Cartão recusado",
    triggerCondition: "payment_failed + failure_code contains 'declined' or 'refused'",
    failureReasons: [
      "card_declined",
      "generic_decline",
      "insufficient_funds",
      "do_not_honor",
      "refused",
    ],
    enabled: true,
    steps: [
      {
        order: 1,
        channel: "whatsapp",
        action: "Enviar mensagem explicando o problema",
        delayMinutes: 5,
        template: "payment_recovery_initial",
      },
      {
        order: 2,
        channel: "whatsapp",
        action: "Lembrete se não respondeu em 2h",
        delayMinutes: 120,
        template: "payment_recovery_follow_up",
        condition: "no_response",
      },
      {
        order: 3,
        channel: "email",
        action: "Oferecer link de pagamento alternativo",
        delayMinutes: 360,
        template: "payment_recovery_email",
      },
      {
        order: 4,
        channel: "system",
        action: "Mover lead para 'Em contato' se interagiu",
        delayMinutes: 0,
        template: "crm_stage_update",
        condition: "user_responded",
      },
      {
        order: 5,
        channel: "system",
        action: "Fechar lead se pagamento confirmado",
        delayMinutes: 0,
        template: "crm_close_lead",
        condition: "payment_confirmed",
      },
    ],
  },
  {
    id: "insufficient-funds",
    name: "Saldo insuficiente",
    triggerCondition: "failure_code = 'insufficient_funds'",
    failureReasons: ["insufficient_funds"],
    enabled: true,
    steps: [
      {
        order: 1,
        channel: "whatsapp",
        action: "Mensagem empática com opção Pix",
        delayMinutes: 10,
        template: "insufficient_funds_initial",
      },
      {
        order: 2,
        channel: "whatsapp",
        action: "Follow-up com link Pix após 4h",
        delayMinutes: 240,
        template: "insufficient_funds_pix",
        condition: "no_response",
      },
      {
        order: 3,
        channel: "email",
        action: "E-mail com opções de parcelamento",
        delayMinutes: 1440,
        template: "insufficient_funds_installment",
      },
    ],
  },
  {
    id: "expired-card",
    name: "Cartão expirado",
    triggerCondition: "failure_code = 'expired_card'",
    failureReasons: ["expired_card"],
    enabled: true,
    steps: [
      {
        order: 1,
        channel: "whatsapp",
        action: "Avisar que cartão expirou, sugerir atualizar",
        delayMinutes: 5,
        template: "expired_card_initial",
      },
      {
        order: 2,
        channel: "email",
        action: "E-mail com instruções detalhadas",
        delayMinutes: 60,
        template: "expired_card_email",
      },
      {
        order: 3,
        channel: "whatsapp",
        action: "Lembrete final com link de pagamento",
        delayMinutes: 1440,
        template: "expired_card_final",
        condition: "no_response",
      },
    ],
  },
  {
    id: "gateway-timeout",
    name: "Timeout do gateway",
    triggerCondition: "failure_code contains 'timeout' or 'gateway_error'",
    failureReasons: ["gateway_timeout", "processing_error", "gateway_error"],
    enabled: true,
    steps: [
      {
        order: 1,
        channel: "whatsapp",
        action: "Explicar que foi um erro técnico, não do cliente",
        delayMinutes: 3,
        template: "gateway_error_initial",
      },
      {
        order: 2,
        channel: "system",
        action: "Gerar novo link de pagamento automaticamente",
        delayMinutes: 3,
        template: "auto_retry_link",
      },
      {
        order: 3,
        channel: "whatsapp",
        action: "Enviar novo link direto",
        delayMinutes: 5,
        template: "gateway_error_retry_link",
      },
    ],
  },
  {
    id: "subscription-renewal",
    name: "Renovação de assinatura",
    triggerCondition: "metadata.campaign contains 'subscription' or 'renewal'",
    failureReasons: [
      "card_declined",
      "insufficient_funds",
      "expired_card",
    ],
    enabled: true,
    steps: [
      {
        order: 1,
        channel: "whatsapp",
        action: "Notificar sobre falha na renovação",
        delayMinutes: 15,
        template: "subscription_renewal_initial",
      },
      {
        order: 2,
        channel: "email",
        action: "E-mail detalhado sobre a assinatura",
        delayMinutes: 120,
        template: "subscription_renewal_email",
      },
      {
        order: 3,
        channel: "whatsapp",
        action: "Alerta de encerramento iminente",
        delayMinutes: 4320,
        template: "subscription_renewal_urgent",
        condition: "no_response",
      },
    ],
  },
];

/**
 * Find the best matching strategy for a given failure reason.
 */
export function matchStrategy(
  failureReason: string | undefined,
  strategies: RecoveryStrategy[] = DEFAULT_STRATEGIES,
): RecoveryStrategy | undefined {
  if (!failureReason) return strategies[0]; // default to card-declined

  const normalized = failureReason.toLowerCase();

  return (
    strategies.find(
      (s) =>
        s.enabled &&
        s.failureReasons.some((reason) => normalized.includes(reason)),
    ) ?? strategies.find((s) => s.enabled) // fallback to first enabled
  );
}

/**
 * Compute total duration of a strategy in hours.
 */
export function strategyDurationHours(strategy: RecoveryStrategy): number {
  const lastStep = strategy.steps[strategy.steps.length - 1];
  return lastStep ? lastStep.delayMinutes / 60 : 0;
}
