import { randomUUID } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { appEnv } from "@/server/recovery/config";
import { MessagingService } from "@/server/recovery/services/messaging-service";
import { getStorageService } from "@/server/recovery/services/storage";
import { createStructuredLog } from "@/server/recovery/utils/structured-logger";

/* ── Types ── */

type CartItem = {
  name: string;
  quantity: number;
  unitPrice: number;
};

type CartAbandonmentStatus = "pending" | "contacted" | "recovered" | "expired";

type CartAbandonmentRecord = {
  id: string;
  sellerKey: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  items: CartItem[];
  totalValue: number;
  currency: string;
  checkoutUrl: string;
  status: CartAbandonmentStatus;
  contactAttempts: number;
  recoveredValue: number | null;
  createdAt: string;
  updatedAt: string;
  recoveredAt: string | null;
};

export type IngestCartAbandonmentInput = {
  sellerKey: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  items: CartItem[];
  totalValue: number;
  currency?: string;
  checkoutUrl: string;
};

type CartAbandonmentAnalytics = {
  total: number;
  recovered: number;
  pending: number;
  contacted: number;
  expired: number;
  recoveryRate: number;
  totalRevenueLost: number;
  totalRevenueRecovered: number;
};

/* ── DB row mapping ── */

type DatabaseCartAbandonmentRow = {
  id: string;
  seller_key: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  items: CartItem[];
  total_value: number;
  currency: string;
  checkout_url: string;
  status: CartAbandonmentStatus;
  contact_attempts: number;
  recovered_value: number | null;
  created_at: string;
  updated_at: string;
  recovered_at: string | null;
};

function mapRow(row: DatabaseCartAbandonmentRow): CartAbandonmentRecord {
  return {
    id: row.id,
    sellerKey: row.seller_key,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    customerEmail: row.customer_email,
    items: row.items,
    totalValue: row.total_value,
    currency: row.currency,
    checkoutUrl: row.checkout_url,
    status: row.status,
    contactAttempts: row.contact_attempts,
    recoveredValue: row.recovered_value,
    recoveredAt: row.recovered_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/* ── Service ── */

export class CartAbandonmentService {
  private readonly supabase: SupabaseClient;
  private readonly messaging = new MessagingService();
  private readonly storage = getStorageService();

  constructor() {
    this.supabase = createClient(appEnv.supabaseUrl, appEnv.supabaseServiceRoleKey);
  }

  async ingestCartAbandonment(
    input: IngestCartAbandonmentInput,
  ): Promise<CartAbandonmentRecord> {
    const now = new Date().toISOString();
    const id = randomUUID();

    const row: DatabaseCartAbandonmentRow = {
      id,
      seller_key: input.sellerKey,
      customer_name: input.customerName,
      customer_phone: input.customerPhone,
      customer_email: input.customerEmail,
      items: input.items,
      total_value: input.totalValue,
      currency: input.currency ?? "BRL",
      checkout_url: input.checkoutUrl,
      status: "pending",
      contact_attempts: 0,
      recovered_value: null,
      created_at: now,
      updated_at: now,
      recovered_at: null,
    };

    const { error } = await this.supabase
      .from("cart_abandonments")
      .insert(row);

    if (error) {
      createStructuredLog({
        eventType: "processing_error",
        level: "error",
        message: "Failed to ingest cart abandonment.",
        context: { id, error: error.message },
      });
      throw new Error(`Failed to ingest cart abandonment: ${error.message}`);
    }

    await this.enqueueFollowUp(id, input.sellerKey);

    createStructuredLog({
      eventType: "webhook_received",
      level: "info",
      message: "Cart abandonment ingested.",
      context: { id, sellerKey: input.sellerKey, totalValue: input.totalValue },
    });

    return mapRow(row);
  }

  async processAbandonment(id: string): Promise<void> {
    const record = await this.findById(id);
    if (!record) {
      throw new Error(`Cart abandonment not found: ${id}`);
    }

    if (record.status === "recovered" || record.status === "expired") {
      return;
    }

    const itemsSummary = record.items
      .map((item) => `${item.quantity}x ${item.name}`)
      .join(", ");
    const formattedValue = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: record.currency,
    }).format(record.totalValue);

    const whatsappContent = [
      `Olá ${record.customerName}! 👋`,
      ``,
      `Notamos que você deixou itens no carrinho:`,
      `📦 ${itemsSummary}`,
      `💰 Total: ${formattedValue}`,
      ``,
      `Finalize sua compra aqui: ${record.checkoutUrl}`,
    ].join("\n");

    try {
      if (record.customerPhone) {
        const waConversation = await this.storage.upsertConversation({
          channel: "whatsapp",
          contactValue: record.customerPhone,
          customerName: record.customerName,
        });
        await this.messaging.dispatchOutboundMessage({
          conversation: waConversation,
          content: whatsappContent,
        });
      }

      if (record.customerEmail) {
        const emailConversation = await this.storage.upsertConversation({
          channel: "email",
          contactValue: record.customerEmail,
          customerName: record.customerName,
        });
        await this.messaging.dispatchOutboundMessage({
          conversation: emailConversation,
          content: whatsappContent,
        });
      }

      await this.supabase
        .from("cart_abandonments")
        .update({
          status: "contacted",
          contact_attempts: record.contactAttempts + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      createStructuredLog({
        eventType: "recovery_started",
        level: "info",
        message: "Cart abandonment contact dispatched.",
        context: { id, sellerKey: record.sellerKey },
      });
    } catch (err) {
      createStructuredLog({
        eventType: "processing_error",
        level: "error",
        message: "Failed to dispatch cart abandonment contact.",
        context: {
          id,
          error: err instanceof Error ? err.message : String(err),
        },
      });
    }
  }

  async markRecovered(id: string, value: number): Promise<CartAbandonmentRecord | undefined> {
    const now = new Date().toISOString();

    const { data, error } = await this.supabase
      .from("cart_abandonments")
      .update({
        status: "recovered",
        recovered_value: value,
        recovered_at: now,
        updated_at: now,
      })
      .eq("id", id)
      .select("*")
      .maybeSingle();

    if (error || !data) {
      createStructuredLog({
        eventType: "processing_error",
        level: "error",
        message: "Failed to mark cart abandonment as recovered.",
        context: { id, error: error?.message ?? "not found" },
      });
      return undefined;
    }

    createStructuredLog({
      eventType: "payment_recovered",
      level: "info",
      message: "Cart abandonment recovered.",
      context: { id, value },
    });

    return mapRow(data as DatabaseCartAbandonmentRow);
  }

  async getAbandonmentAnalytics(
    sellerKey?: string,
  ): Promise<CartAbandonmentAnalytics> {
    let query = this.supabase
      .from("cart_abandonments")
      .select("status, total_value, recovered_value");

    if (sellerKey) {
      query = query.eq("seller_key", sellerKey);
    }

    const { data, error } = await query;

    if (error || !data) {
      return {
        total: 0,
        recovered: 0,
        pending: 0,
        contacted: 0,
        expired: 0,
        recoveryRate: 0,
        totalRevenueLost: 0,
        totalRevenueRecovered: 0,
      };
    }

    const rows = data as Array<{
      status: CartAbandonmentStatus;
      total_value: number;
      recovered_value: number | null;
    }>;

    const total = rows.length;
    const recovered = rows.filter((r) => r.status === "recovered").length;
    const pending = rows.filter((r) => r.status === "pending").length;
    const contacted = rows.filter((r) => r.status === "contacted").length;
    const expired = rows.filter((r) => r.status === "expired").length;
    const totalRevenueLost = rows
      .filter((r) => r.status !== "recovered")
      .reduce((sum, r) => sum + r.total_value, 0);
    const totalRevenueRecovered = rows.reduce(
      (sum, r) => sum + (r.recovered_value ?? 0),
      0,
    );

    return {
      total,
      recovered,
      pending,
      contacted,
      expired,
      recoveryRate: total > 0 ? recovered / total : 0,
      totalRevenueLost,
      totalRevenueRecovered,
    };
  }

  async listAbandonments(
    sellerKey?: string,
    status?: CartAbandonmentStatus,
    limit = 50,
  ): Promise<CartAbandonmentRecord[]> {
    let query = this.supabase
      .from("cart_abandonments")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (sellerKey) {
      query = query.eq("seller_key", sellerKey);
    }
    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error || !data) return [];

    return (data as DatabaseCartAbandonmentRow[]).map(mapRow);
  }

  /* ── Private helpers ── */

  private async findById(id: string): Promise<CartAbandonmentRecord | undefined> {
    const { data, error } = await this.supabase
      .from("cart_abandonments")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) return undefined;
    return mapRow(data as DatabaseCartAbandonmentRow);
  }

  private async enqueueFollowUp(abandonmentId: string, sellerKey: string): Promise<void> {
    const now = new Date();
    const runAt = new Date(now.getTime() + 30 * 60 * 1000); // 30 min delay

    const job = {
      id: randomUUID(),
      queue_name: "notification-jobs",
      job_type: "cart_abandonment_followup",
      payload: { abandonmentId, sellerKey },
      run_at: runAt.toISOString(),
      attempts: 0,
      status: "scheduled",
      created_at: now.toISOString(),
    };

    const { error } = await this.supabase.from("queue_jobs").insert(job);

    if (error) {
      createStructuredLog({
        eventType: "processing_error",
        level: "warn",
        message: "Failed to enqueue cart abandonment follow-up job.",
        context: { abandonmentId, error: error.message },
      });
    }
  }
}

/* ── Singleton ── */

declare global {
  var __cartAbandonmentService__: CartAbandonmentService | undefined;
}

export function getCartAbandonmentService(): CartAbandonmentService {
  if (!globalThis.__cartAbandonmentService__) {
    globalThis.__cartAbandonmentService__ = new CartAbandonmentService();
  }
  return globalThis.__cartAbandonmentService__;
}
