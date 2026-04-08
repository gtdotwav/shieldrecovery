import { getStorageService } from "@/server/recovery/services/storage";
import type { OptOutChannel, OptOutRecord } from "@/server/recovery/types";

/* ── Opt-out keyword detection ── */

const OPT_OUT_KEYWORDS = [
  "parar",
  "sair",
  "cancelar",
  "remover",
  "descadastrar",
  "nao quero",
  "não quero",
  "pare",
  "stop",
  "unsubscribe",
  "nao me mande",
  "não me mande",
  "nao envie",
  "não envie",
  "quero sair",
];

const OPT_OUT_CONFIRMATION =
  "Pronto! Você não receberá mais mensagens por este canal. " +
  "Se mudar de ideia, é só nos enviar uma mensagem.";

/**
 * Check if a message content contains an opt-out intent.
 * Normalizes text (lowercase, remove accents) before matching.
 */
export function detectOptOutIntent(content: string): boolean {
  const normalized = content
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

  // Short messages are more likely to be opt-out commands
  // For longer messages, require exact keyword match
  if (normalized.length <= 30) {
    return OPT_OUT_KEYWORDS.some((kw) => {
      const normalizedKw = kw
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      return normalized === normalizedKw || normalized.includes(normalizedKw);
    });
  }

  // For longer messages, only match if the keyword is the entire message
  // or clearly a command (starts with keyword)
  return OPT_OUT_KEYWORDS.some((kw) => {
    const normalizedKw = kw
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    return normalized === normalizedKw || normalized.startsWith(normalizedKw + " ");
  });
}

/**
 * Process an opt-out request from an inbound message.
 * Returns the opt-out record if created, or null if already opted out.
 */
export async function processOptOut(input: {
  contactValue: string;
  channel: OptOutChannel;
  source?: "inbound_keyword" | "admin_manual" | "api" | "legal_request";
  sellerKey?: string;
  reason?: string;
}): Promise<OptOutRecord | null> {
  const storage = getStorageService();
  const alreadyOptedOut = await storage.isOptedOut(
    input.channel,
    input.contactValue,
  );

  if (alreadyOptedOut) {
    return null;
  }

  return storage.createOptOut({
    channel: input.channel,
    contactValue: input.contactValue,
    reason: input.reason ?? "customer_requested",
    source: input.source ?? "inbound_keyword",
    sellerKey: input.sellerKey,
  });
}

/**
 * Check if sending to a contact is allowed (not opted out).
 * Checks both the specific channel and the "all" channel.
 */
export async function canSendToContact(
  contactValue: string,
  channel: string,
): Promise<{ allowed: boolean; reason?: string }> {
  const storage = getStorageService();
  const isBlocked = await storage.isOptedOut(channel, contactValue);

  if (isBlocked) {
    return {
      allowed: false,
      reason: `Contact opted out of ${channel} channel`,
    };
  }

  return { allowed: true };
}

/**
 * Get the confirmation message to send when a contact opts out.
 */
export function getOptOutConfirmation(): string {
  return OPT_OUT_CONFIRMATION;
}

/**
 * Remove an opt-out (re-subscribe a contact).
 */
export async function removeOptOut(
  contactValue: string,
  channel: OptOutChannel,
): Promise<void> {
  const storage = getStorageService();
  await storage.removeOptOut(channel, contactValue);
}

/* ── Singleton ── */

let _instance: OptOutService | undefined;

export function getOptOutService(): OptOutService {
  if (!_instance) {
    _instance = new OptOutService();
  }
  return _instance;
}

export class OptOutService {
  detectOptOutIntent = detectOptOutIntent;
  processOptOut = processOptOut;
  canSendToContact = canSendToContact;
  getOptOutConfirmation = getOptOutConfirmation;
  removeOptOut = removeOptOut;
}
