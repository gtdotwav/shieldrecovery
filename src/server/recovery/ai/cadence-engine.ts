import type {
  CustomerRecord,
  PaymentRecord,
  RecoveryLeadRecord,
  MessagingChannel,
} from "@/server/recovery/types";

import type { RecoveryMessageTone } from "./types";

/* ── Cadence step definition ── */

export type CadenceStep = {
  stepNumber: number;
  delayMinutes: number;
  channel: MessagingChannel;
  strategy: CadenceStrategy;
  tone: RecoveryMessageTone;
  condition?: CadenceCondition;
  fallbackChannel?: MessagingChannel;
  fallbackDelayMinutes?: number;
  templateSlug?: string;
  negotiationEligible?: boolean;
};

export type CadenceStrategy =
  | "contextual"
  | "urgency"
  | "alternative"
  | "reengagement"
  | "last_chance"
  | "voice_outreach"
  | "soft_close";

export type CadenceCondition =
  | "no_response"
  | "read_no_reply"
  | "high_value"
  | "has_commitment"
  | "always";

export type CadenceStepRecord = {
  id: string;
  leadId: string;
  customerId?: string;
  stepNumber: number;
  channel: MessagingChannel;
  strategy: string;
  tone: string;
  scheduledAt: string;
  executedAt?: string;
  skippedAt?: string;
  skipReason?: string;
  outcome?: string;
  messageId?: string;
  callId?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

/* ── Constants ── */

/**
 * DDD → timezone offset from UTC (hours).
 * Covers major Brazilian DDD codes. Defaults to -3 (Brasília).
 */
const DDD_TIMEZONE_MAP: Record<string, number> = {
  "61": -3, "62": -3, "63": -3, "64": -3, "65": -4, "66": -4,
  "67": -4, "68": -5, "69": -4, "91": -3, "92": -4, "93": -3,
  "94": -3, "95": -4, "96": -3, "97": -4, "98": -3, "99": -3,
  "11": -3, "12": -3, "13": -3, "14": -3, "15": -3, "16": -3,
  "17": -3, "18": -3, "19": -3, "21": -3, "22": -3, "24": -3,
  "27": -3, "28": -3, "31": -3, "32": -3, "33": -3, "34": -3,
  "35": -3, "37": -3, "38": -3, "41": -3, "42": -3, "43": -3,
  "44": -3, "45": -3, "46": -3, "47": -3, "48": -3, "49": -3,
  "51": -3, "53": -3, "54": -3, "55": -3, "71": -3, "73": -3,
  "74": -3, "75": -3, "77": -3, "79": -3, "81": -3, "82": -3,
  "83": -3, "84": -3, "85": -3, "86": -3, "87": -3, "88": -3,
  "89": -3,
};

const BUSINESS_HOUR_START = 9;
const BUSINESS_HOUR_END = 20;

/* ── Cadence builder ── */

/**
 * Build a dynamic follow-up cadence for a lead.
 * Steps 1-3 (initial message, WhatsApp, email) are handled by existing
 * recovery-queues.ts. This builds steps 4+ that the autonomous agent manages.
 *
 * Does NOT touch the initial trigger flow.
 */
export function buildFollowUpCadence(input: {
  lead: RecoveryLeadRecord;
  customer: CustomerRecord;
  payment: PaymentRecord;
  existingSteps: number;
  hasResponded: boolean;
  hasReadMessages: boolean;
  lastOutboundAt?: string;
  smsEnabled?: boolean;
  aiNegotiationEnabled?: boolean;
}): CadenceStep[] {
  const { lead, payment, hasResponded, hasReadMessages, smsEnabled } = input;
  const isHighValue = payment.amount >= 30_000; // R$300+
  const isVeryHighValue = payment.amount >= 100_000; // R$1000+
  const baseDelay = hasResponded ? 120 : 240; // 2h if responded, 4h if not

  const steps: CadenceStep[] = [];

  // Step 4: Contextual follow-up (T+4h or T+2h if engaged)
  // Fallback to SMS if WhatsApp not delivered after 1h
  steps.push({
    stepNumber: 4,
    delayMinutes: baseDelay,
    channel: "whatsapp",
    strategy: "contextual",
    tone: hasReadMessages ? "direct" : "empathetic",
    condition: hasReadMessages ? "read_no_reply" : "no_response",
    fallbackChannel: smsEnabled ? "sms" : undefined,
    fallbackDelayMinutes: 60,
    templateSlug: "gentle-reminder-general",
  });

  // Step 5: Voice call for high-value OR SMS fallback for standard
  if (isHighValue) {
    steps.push({
      stepNumber: 5,
      delayMinutes: baseDelay + 480, // T+12h
      channel: "voice",
      strategy: "voice_outreach",
      tone: "empathetic",
      condition: "high_value",
      templateSlug: "post-call-checkout",
    });
  } else {
    steps.push({
      stepNumber: 5,
      delayMinutes: baseDelay + 480,
      channel: "whatsapp",
      strategy: "contextual",
      tone: "casual",
      condition: "no_response",
      fallbackChannel: smsEnabled ? "sms" : undefined,
      fallbackDelayMinutes: 360, // 6h SMS fallback
      templateSlug: "reengagement-48h",
    });
  }

  // Step 6: Approach shift — offer alternatives + negotiation (T+48h)
  steps.push({
    stepNumber: 6,
    delayMinutes: 2_880,
    channel: "whatsapp",
    strategy: "alternative",
    tone: "urgent",
    condition: "no_response",
    templateSlug: "payment-alternative",
    negotiationEligible: input.aiNegotiationEnabled,
  });

  // Step 7: Discount offer if negotiation enabled, else last chance (T+72h)
  steps.push({
    stepNumber: 7,
    delayMinutes: 4_320,
    channel: "whatsapp",
    strategy: input.aiNegotiationEnabled ? "urgency" : "last_chance",
    tone: isVeryHighValue ? "urgent" : "empathetic",
    condition: "no_response",
    templateSlug: input.aiNegotiationEnabled ? "discount-offer" : "last-chance",
    negotiationEligible: input.aiNegotiationEnabled,
    fallbackChannel: smsEnabled ? "sms" : undefined,
    fallbackDelayMinutes: 360,
  });

  // Step 8: Multi-channel re-engagement — email (T+5 days)
  steps.push({
    stepNumber: 8,
    delayMinutes: 7_200,
    channel: "email",
    strategy: "reengagement",
    tone: "casual",
    condition: "no_response",
    templateSlug: "reengagement-48h",
  });

  // Step 9: SMS follow-up right after email if enabled (T+5d + 6h)
  if (smsEnabled) {
    steps.push({
      stepNumber: 9,
      delayMinutes: 7_560,
      channel: "sms",
      strategy: "reengagement",
      tone: "direct",
      condition: "no_response",
      templateSlug: "last-chance",
    });
  }

  // Step 10: Voice attempt for very high value at T+5.5 days
  if (isVeryHighValue) {
    steps.push({
      stepNumber: 10,
      delayMinutes: 7_920,
      channel: "voice",
      strategy: "voice_outreach",
      tone: "direct",
      condition: "high_value",
      templateSlug: "post-call-checkout",
    });
  }

  // Final step: Soft close with open door (T+7 days)
  const finalStep = isVeryHighValue ? 11 : smsEnabled ? 10 : 9;
  steps.push({
    stepNumber: finalStep,
    delayMinutes: 10_080,
    channel: "whatsapp",
    strategy: "soft_close",
    tone: "empathetic",
    condition: "no_response",
    templateSlug: "last-chance",
  });

  // Filter out steps that already exist
  return steps.filter((s) => s.stepNumber > input.existingSteps);
}

/* ── Timing helpers ── */

/**
 * Adjust a scheduled time to fall within business hours
 * in the customer's timezone (estimated from phone DDD).
 */
export function adjustToBusinessHours(
  scheduledAt: Date,
  phone?: string,
): Date {
  const offset = getTimezoneOffset(phone);
  const localHour = (scheduledAt.getUTCHours() + offset + 24) % 24;

  if (localHour >= BUSINESS_HOUR_START && localHour < BUSINESS_HOUR_END) {
    return scheduledAt;
  }

  const adjusted = new Date(scheduledAt);

  if (localHour < BUSINESS_HOUR_START) {
    // Too early — push to 9am
    adjusted.setUTCHours(BUSINESS_HOUR_START - offset, 0, 0, 0);
  } else {
    // Too late — push to next day 9am
    adjusted.setDate(adjusted.getDate() + 1);
    adjusted.setUTCHours(BUSINESS_HOUR_START - offset, 0, 0, 0);
  }

  // Skip Saturday (day 6) → push to Monday
  if (adjusted.getUTCDay() === 6) {
    adjusted.setDate(adjusted.getDate() + 2);
  }
  // Skip Sunday (day 0) → push to Monday
  if (adjusted.getUTCDay() === 0) {
    adjusted.setDate(adjusted.getDate() + 1);
  }

  return adjusted;
}

/**
 * Calculate the absolute scheduled time for a cadence step,
 * relative to the lead creation time, adjusted for business hours.
 */
export function calculateStepSchedule(
  leadCreatedAt: string,
  step: CadenceStep,
  phone?: string,
): Date {
  const base = new Date(leadCreatedAt);
  const raw = new Date(base.getTime() + step.delayMinutes * 60_000);
  return adjustToBusinessHours(raw, phone);
}

function getTimezoneOffset(phone?: string): number {
  if (!phone) return -3;
  // Extract DDD from Brazilian phone: +55XX... or 55XX...
  const cleaned = phone.replace(/\D/g, "");
  const ddd = cleaned.startsWith("55") ? cleaned.slice(2, 4) : cleaned.slice(0, 2);
  return DDD_TIMEZONE_MAP[ddd] ?? -3;
}

/* ── Multi-channel fallback ── */

/**
 * Determine the fallback channel order for a given primary channel.
 * Returns the next channel to try if the primary fails or is undelivered.
 */
export function getFallbackChannels(
  primary: MessagingChannel,
  smsEnabled: boolean,
): MessagingChannel[] {
  switch (primary) {
    case "whatsapp":
      return smsEnabled ? ["sms", "email"] : ["email"];
    case "sms":
      return ["whatsapp", "email"];
    case "email":
      return smsEnabled ? ["sms", "whatsapp"] : ["whatsapp"];
    case "voice":
      return smsEnabled ? ["whatsapp", "sms"] : ["whatsapp"];
    default:
      return [];
  }
}

/**
 * Build a multi-channel sequence for a single step.
 * Example: WhatsApp at T+0, SMS fallback at T+1h if not delivered, Email at T+24h if still not delivered.
 */
export function buildMultiChannelSequence(
  step: CadenceStep,
  smsEnabled: boolean,
): Array<{ channel: MessagingChannel; delayMinutes: number; condition: string }> {
  const sequence: Array<{ channel: MessagingChannel; delayMinutes: number; condition: string }> = [
    { channel: step.channel, delayMinutes: 0, condition: "always" },
  ];

  if (step.fallbackChannel && step.fallbackDelayMinutes) {
    sequence.push({
      channel: step.fallbackChannel,
      delayMinutes: step.fallbackDelayMinutes,
      condition: "if_not_delivered",
    });
  }

  return sequence;
}
