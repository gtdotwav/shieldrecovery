import { getStorageService } from "@/server/recovery/services/storage";
import type { FrequencyCheck, FrequencyLogInput } from "@/server/recovery/types";

/**
 * Check whether we can send a message to the given contact
 * without violating frequency caps configured for the seller.
 */
export async function checkFrequency(
  contactValue: string,
  sellerKey?: string,
): Promise<FrequencyCheck> {
  const storage = getStorageService();
  return storage.checkFrequencyLimit(contactValue, sellerKey);
}

/**
 * Log an outbound contact (message or call) for frequency tracking.
 * Should be called AFTER successfully sending a message or initiating a call.
 */
export async function logOutboundContact(input: FrequencyLogInput): Promise<void> {
  const storage = getStorageService();
  await storage.logContactFrequency({
    ...input,
    direction: input.direction ?? "outbound",
  });
}

/**
 * Combined pre-send check: verifies both opt-out status and frequency caps.
 * Returns { allowed, reason } to decide whether to proceed with dispatch.
 */
export async function canContactLead(input: {
  contactValue: string;
  channel: string;
  sellerKey?: string;
}): Promise<{ allowed: boolean; reason?: string }> {
  // 1. Check opt-out
  const { canSendToContact } = await import(
    "@/server/recovery/services/opt-out-service"
  );
  const optOutCheck = await canSendToContact(input.contactValue, input.channel);
  if (!optOutCheck.allowed) {
    return optOutCheck;
  }

  // 2. Check frequency caps
  const freqCheck = await checkFrequency(input.contactValue, input.sellerKey);
  if (!freqCheck.allowed) {
    return {
      allowed: false,
      reason: freqCheck.reason ?? `Frequency cap reached (${freqCheck.contactsToday}/${freqCheck.maxPerDay} today, ${freqCheck.contactsThisWeek}/${freqCheck.maxPerWeek} week)`,
    };
  }

  return { allowed: true };
}

/* ── Singleton ── */

let _instance: FrequencyService | undefined;

export function getFrequencyService(): FrequencyService {
  if (!_instance) {
    _instance = new FrequencyService();
  }
  return _instance;
}

export class FrequencyService {
  checkFrequency = checkFrequency;
  logOutboundContact = logOutboundContact;
  canContactLead = canContactLead;
}
