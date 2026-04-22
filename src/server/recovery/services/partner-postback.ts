import { createHmac, randomUUID } from "node:crypto";

import { getPartnerStorageService } from "@/server/recovery/services/partner-storage";
import { getStorageService } from "@/server/recovery/services/storage";
import { createStructuredLog } from "@/server/recovery/utils/structured-logger";
import { logger } from "@/server/recovery/utils/logger";

// ── Postback event types ──

export type PartnerPostbackEvent =
  | "lead.created"
  | "lead.contacting"
  | "lead.recovered"
  | "lead.lost"
  | "lead.escalated"
  | "message.sent"
  | "message.delivered"
  | "message.read"
  | "customer.replied"
  | "payment.retry_started";

export type PartnerPostbackPayload = {
  event: PartnerPostbackEvent;
  timestamp: string;
  postback_id: string;
  tenant_key: string;
  data: Record<string, unknown>;
};

// ── Dispatcher ──

const POSTBACK_TIMEOUT_MS = 10_000;
const MAX_RETRIES = 3;

function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

async function sendPostback(
  webhookUrl: string,
  payload: PartnerPostbackPayload,
  secret: string,
): Promise<{ ok: boolean; statusCode?: number; error?: string }> {
  const body = JSON.stringify(payload);
  const signature = signPayload(body, secret);

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-PagRecovery-Signature": signature,
        "X-PagRecovery-Event": payload.event,
        "X-PagRecovery-Postback-ID": payload.postback_id,
        "X-PagRecovery-Timestamp": payload.timestamp,
      },
      body,
      signal: AbortSignal.timeout(POSTBACK_TIMEOUT_MS),
    });

    return { ok: response.ok, statusCode: response.status };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown postback error",
    };
  }
}

async function sendWithRetry(
  webhookUrl: string,
  payload: PartnerPostbackPayload,
  secret: string,
): Promise<void> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const result = await sendPostback(webhookUrl, payload, secret);

    if (result.ok) {
      logger.info("Partner postback delivered", {
        event: payload.event,
        tenantKey: payload.tenant_key,
        postbackId: payload.postback_id,
        attempt,
      });
      return;
    }

    logger.warn("Partner postback failed, retrying", {
      event: payload.event,
      tenantKey: payload.tenant_key,
      postbackId: payload.postback_id,
      attempt,
      statusCode: result.statusCode,
      error: result.error,
    });

    // Exponential backoff: 1s, 2s, 4s
    if (attempt < MAX_RETRIES - 1) {
      await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
    }
  }

  // Log final failure
  await getStorageService()
    .addLog(
      createStructuredLog({
        eventType: "postback_failed",
        level: "error",
        message: `Partner postback failed after ${MAX_RETRIES} attempts`,
        context: {
          event: payload.event,
          tenantKey: payload.tenant_key,
          postbackId: payload.postback_id,
          webhookUrl,
        },
      }),
    )
    .catch(() => {});
}

// ── Public API ──

/**
 * Dispatches a postback event to the partner's webhook URL.
 * Resolves the partner from the tenant/seller key.
 * Fire-and-forget: does not throw on failure.
 */
export async function dispatchPartnerPostback(
  tenantKey: string,
  event: PartnerPostbackEvent,
  data: Record<string, unknown>,
): Promise<void> {
  try {
    const partnerStorage = getPartnerStorageService();
    const profiles = await partnerStorage.listProfiles();

    // Find which partner owns this tenant
    for (const profile of profiles) {
      if (!profile.webhookUrl || !profile.active) continue;

      const tenants = await partnerStorage.listTenants(profile.id);
      const tenant = tenants.find((t) => t.tenantKey === tenantKey && t.active);

      if (!tenant) continue;

      const payload: PartnerPostbackPayload = {
        event,
        timestamp: new Date().toISOString(),
        postback_id: randomUUID(),
        tenant_key: tenantKey,
        data,
      };

      // Use partner slug as HMAC secret (partner can configure a custom secret later)
      const secret = process.env.PARTNER_POSTBACK_SECRET || profile.slug;

      // Fire-and-forget with retry
      sendWithRetry(profile.webhookUrl, payload, secret).catch(() => {});
      return;
    }
  } catch (error) {
    logger.error("dispatchPartnerPostback error", {
      tenantKey,
      event,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Convenience dispatchers for specific events.
 */

export function postbackLeadCreated(tenantKey: string, data: {
  leadId: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  paymentId: string;
  orderId: string;
  amount: number;
  currency: string;
  method: string;
  failureCode?: string;
  product?: string;
}) {
  return dispatchPartnerPostback(tenantKey, "lead.created", data);
}

export function postbackLeadRecovered(tenantKey: string, data: {
  leadId: string;
  paymentId: string;
  orderId: string;
  amount: number;
  currency: string;
  recoveredAt: string;
  customerName: string;
  customerEmail: string;
}) {
  return dispatchPartnerPostback(tenantKey, "lead.recovered", data);
}

export function postbackLeadLost(tenantKey: string, data: {
  leadId: string;
  paymentId: string;
  reason: string;
}) {
  return dispatchPartnerPostback(tenantKey, "lead.lost", data);
}

export function postbackMessageSent(tenantKey: string, data: {
  leadId: string;
  channel: string;
  messageId: string;
  content: string;
  paymentUrl?: string;
  pixCode?: string;
}) {
  return dispatchPartnerPostback(tenantKey, "message.sent", data);
}

export function postbackMessageDelivered(tenantKey: string, data: {
  leadId: string;
  channel: string;
  messageId: string;
  deliveredAt: string;
}) {
  return dispatchPartnerPostback(tenantKey, "message.delivered", data);
}

export function postbackMessageRead(tenantKey: string, data: {
  leadId: string;
  channel: string;
  messageId: string;
  readAt: string;
}) {
  return dispatchPartnerPostback(tenantKey, "message.read", data);
}

export function postbackCustomerReplied(tenantKey: string, data: {
  leadId: string;
  channel: string;
  messageContent: string;
  detectedIntent?: string;
}) {
  return dispatchPartnerPostback(tenantKey, "customer.replied", data);
}

export function postbackPaymentRetryStarted(tenantKey: string, data: {
  leadId: string;
  paymentId: string;
  retryUrl: string;
  attemptNumber: number;
}) {
  return dispatchPartnerPostback(tenantKey, "payment.retry_started", data);
}
