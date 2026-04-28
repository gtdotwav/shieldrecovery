import { createClient } from "@supabase/supabase-js";
import { appEnv } from "@/server/recovery/config";

/* ── Types ── */

export type PartnerWebhookConfig = {
  id: string;
  partnerId: string;
  url: string;
  secret: string;
  events: string[];
  active: boolean;
  lastDeliveryAt: string | null;
  lastDeliveryStatus: number | null;
  failureCount: number;
  createdAt: string;
  updatedAt: string;
};

export type PartnerWebhookDelivery = {
  id: string;
  webhookConfigId: string;
  eventType: string;
  payload: Record<string, unknown>;
  responseStatus: number | null;
  responseBody: string | null;
  success: boolean;
  durationMs: number | null;
  createdAt: string;
};

export type PartnerWebhookEvent = {
  type: string;
  partnerId: string;
  payload: Record<string, unknown>;
};

type DispatchResult = {
  configId: string;
  success: boolean;
  status?: number;
  error?: string;
  durationMs: number;
};

/* ── Constants ── */

const MAX_FAILURE_COUNT = 10;
const DELIVERY_TIMEOUT_MS = 5_000;
const DEFAULT_RETRY_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24h

/* ── HMAC Signing ── */

async function signPayload(payload: string, secret: string, timestamp: number): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${payload}`),
  );
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/* ── Row Mappers ── */

function mapConfig(row: Record<string, unknown>): PartnerWebhookConfig {
  return {
    id: row.id as string,
    partnerId: row.partner_id as string,
    url: row.url as string,
    secret: row.secret as string,
    events: row.events as string[],
    active: row.active as boolean,
    lastDeliveryAt: (row.last_delivery_at as string) ?? null,
    lastDeliveryStatus: (row.last_delivery_status as number) ?? null,
    failureCount: (row.failure_count as number) ?? 0,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapDelivery(row: Record<string, unknown>): PartnerWebhookDelivery {
  return {
    id: row.id as string,
    webhookConfigId: row.webhook_config_id as string,
    eventType: row.event_type as string,
    payload: (row.payload as Record<string, unknown>) ?? {},
    responseStatus: (row.response_status as number) ?? null,
    responseBody: (row.response_body as string) ?? null,
    success: row.success as boolean,
    durationMs: (row.duration_ms as number) ?? null,
    createdAt: row.created_at as string,
  };
}

/* ── Service ── */

export class PartnerWebhookService {
  private readonly supabase;

  constructor() {
    this.supabase = createClient(appEnv.supabaseUrl, appEnv.supabaseServiceRoleKey);
  }

  /* ── Config CRUD ── */

  async getWebhookConfigs(partnerId: string): Promise<PartnerWebhookConfig[]> {
    const { data, error } = await this.supabase
      .from("partner_webhook_configs")
      .select("*")
      .eq("partner_id", partnerId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(`Failed to list webhook configs: ${error.message}`);
    return (data ?? []).map(mapConfig);
  }

  async createWebhookConfig(
    partnerId: string,
    url: string,
    secret: string,
    events?: string[],
  ): Promise<PartnerWebhookConfig> {
    const row: Record<string, unknown> = {
      partner_id: partnerId,
      url,
      secret,
    };

    if (events && events.length > 0) {
      row.events = events;
    }

    const { data, error } = await this.supabase
      .from("partner_webhook_configs")
      .insert(row)
      .select()
      .single();

    if (error) throw new Error(`Failed to create webhook config: ${error.message}`);
    return mapConfig(data);
  }

  async updateWebhookConfig(
    configId: string,
    updates: Partial<Pick<PartnerWebhookConfig, "url" | "secret" | "events" | "active">>,
  ): Promise<PartnerWebhookConfig> {
    const row: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (updates.url !== undefined) row.url = updates.url;
    if (updates.secret !== undefined) row.secret = updates.secret;
    if (updates.events !== undefined) row.events = updates.events;
    if (updates.active !== undefined) row.active = updates.active;

    const { data, error } = await this.supabase
      .from("partner_webhook_configs")
      .update(row)
      .eq("id", configId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update webhook config: ${error.message}`);
    return mapConfig(data);
  }

  async deleteWebhookConfig(configId: string): Promise<void> {
    const { error } = await this.supabase
      .from("partner_webhook_configs")
      .delete()
      .eq("id", configId);

    if (error) throw new Error(`Failed to delete webhook config: ${error.message}`);
  }

  /* ── Dispatch ── */

  async dispatchEvent(event: PartnerWebhookEvent): Promise<DispatchResult[]> {
    const { data: configs, error } = await this.supabase
      .from("partner_webhook_configs")
      .select("*")
      .eq("partner_id", event.partnerId)
      .eq("active", true);

    if (error) {
      console.error("[partner-webhook] Failed to fetch configs:", error.message);
      return [];
    }

    if (!configs || configs.length === 0) return [];

    const results: DispatchResult[] = [];

    for (const row of configs) {
      const config = mapConfig(row);

      // Skip if this config doesn't subscribe to this event type
      if (!config.events.includes(event.type)) continue;

      const result = await this.deliverWebhook(config, event);
      results.push(result);
    }

    return results;
  }

  async dispatchEventToAll(event: { type: string; payload: Record<string, unknown> }): Promise<DispatchResult[]> {
    const { data: configs, error } = await this.supabase
      .from("partner_webhook_configs")
      .select("*")
      .eq("active", true)
      .contains("events", [event.type]);

    if (error) {
      console.error("[partner-webhook] Failed to fetch all configs:", error.message);
      return [];
    }

    if (!configs || configs.length === 0) return [];

    const results: DispatchResult[] = [];

    for (const row of configs) {
      const config = mapConfig(row);
      const result = await this.deliverWebhook(config, {
        type: event.type,
        partnerId: config.partnerId,
        payload: event.payload,
      });
      results.push(result);
    }

    return results;
  }

  async retryFailedDeliveries(maxAgeMs: number = DEFAULT_RETRY_MAX_AGE_MS): Promise<DispatchResult[]> {
    const cutoff = new Date(Date.now() - maxAgeMs).toISOString();

    const { data: deliveries, error } = await this.supabase
      .from("partner_webhook_deliveries")
      .select("*, partner_webhook_configs!inner(*)")
      .eq("success", false)
      .gte("created_at", cutoff)
      .order("created_at", { ascending: true })
      .limit(50);

    if (error) {
      console.error("[partner-webhook] Failed to fetch failed deliveries:", error.message);
      return [];
    }

    if (!deliveries || deliveries.length === 0) return [];

    const results: DispatchResult[] = [];

    for (const delivery of deliveries) {
      const configRow = delivery.partner_webhook_configs;
      if (!configRow || !configRow.active) continue;

      const config = mapConfig(configRow);
      const result = await this.deliverWebhook(config, {
        type: delivery.event_type as string,
        partnerId: config.partnerId,
        payload: (delivery.payload as Record<string, unknown>) ?? {},
      });
      results.push(result);
    }

    return results;
  }

  /* ── Internal ── */

  private async deliverWebhook(
    config: PartnerWebhookConfig,
    event: PartnerWebhookEvent,
  ): Promise<DispatchResult> {
    const timestamp = Math.floor(Date.now() / 1000);
    const payloadStr = JSON.stringify(event.payload);
    const signature = await signPayload(payloadStr, config.secret, timestamp);

    const startTime = Date.now();
    let responseStatus: number | undefined;
    let responseBody = "";
    let success = false;

    try {
      const response = await fetch(config.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Signature": signature,
          "X-Webhook-Timestamp": String(timestamp),
          "X-Event-Type": event.type,
        },
        body: payloadStr,
        signal: AbortSignal.timeout(DELIVERY_TIMEOUT_MS),
      });

      responseStatus = response.status;
      responseBody = await response.text().catch(() => "");
      success = response.ok;
    } catch (err) {
      responseBody = err instanceof Error ? err.message : "Unknown delivery error";
    }

    const durationMs = Date.now() - startTime;

    // Log the delivery
    await this.supabase
      .from("partner_webhook_deliveries")
      .insert({
        webhook_config_id: config.id,
        event_type: event.type,
        payload: event.payload,
        response_status: responseStatus ?? null,
        response_body: responseBody.slice(0, 2000),
        success,
        duration_ms: durationMs,
      })
      .then(({ error: logErr }) => {
        if (logErr) console.error("[partner-webhook] Failed to log delivery:", logErr.message);
      });

    // Update config delivery status
    const updatePayload: Record<string, unknown> = {
      last_delivery_at: new Date().toISOString(),
      last_delivery_status: responseStatus ?? null,
      updated_at: new Date().toISOString(),
    };

    if (success) {
      updatePayload.failure_count = 0;
    } else {
      const newCount = config.failureCount + 1;
      updatePayload.failure_count = newCount;

      // Auto-disable after MAX_FAILURE_COUNT consecutive failures
      if (newCount >= MAX_FAILURE_COUNT) {
        updatePayload.active = false;
        console.warn(
          `[partner-webhook] Auto-disabled webhook ${config.id} for partner ${config.partnerId} after ${newCount} consecutive failures.`,
        );
      }
    }

    await this.supabase
      .from("partner_webhook_configs")
      .update(updatePayload)
      .eq("id", config.id)
      .then(({ error: updateErr }) => {
        if (updateErr) console.error("[partner-webhook] Failed to update config status:", updateErr.message);
      });

    return {
      configId: config.id,
      success,
      status: responseStatus,
      error: success ? undefined : responseBody.slice(0, 500),
      durationMs,
    };
  }
}

/* ── Singleton ── */

declare global {
  var __partnerWebhookService__: PartnerWebhookService | undefined;
}

export function getPartnerWebhookService(): PartnerWebhookService {
  if (!globalThis.__partnerWebhookService__) {
    globalThis.__partnerWebhookService__ = new PartnerWebhookService();
  }
  return globalThis.__partnerWebhookService__;
}

/* ── Fire-and-forget helper ── */

export function notifyPartnerEvent(event: {
  type: string;
  partnerId: string;
  payload: Record<string, unknown>;
}) {
  getPartnerWebhookService().dispatchEvent(event).catch((err) => {
    console.error("[partner-webhook] dispatch error:", err);
  });
}
