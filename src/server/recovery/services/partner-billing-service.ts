import { createClient } from "@supabase/supabase-js";

import { appEnv } from "@/server/recovery/config";
import { logger } from "@/server/recovery/utils/logger";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BillingEventType =
  | "lead_created"
  | "message_sent"
  | "whatsapp_session"
  | "call_made"
  | "payment_recovered";

export interface UsageLogRow {
  id: string;
  partner_id: string;
  seller_key: string;
  event_type: string;
  quantity: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface UsageSummaryItem {
  event_type: string;
  total_quantity: number;
}

export interface InvoiceRow {
  id: string;
  partner_id: string;
  period_start: string;
  period_end: string;
  status: string;
  total_amount: number;
  currency: string;
  line_items: InvoiceLineItem[];
  notes: string | null;
  due_date: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceLineItem {
  event_type: string;
  quantity: number;
  unit_price: number;
  total: number;
  description: string;
}

export type InvoiceStatus = "draft" | "pending" | "paid" | "overdue" | "cancelled";

export interface BillingConfigRow {
  id: string;
  partner_id: string;
  plan_name: string;
  price_per_lead: number;
  price_per_message: number;
  price_per_whatsapp_session: number;
  price_per_call_minute: number;
  recovery_fee_percent: number;
  min_monthly_amount: number;
  billing_day: number;
  payment_terms_days: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BillingConfigInput {
  plan_name?: string;
  price_per_lead?: number;
  price_per_message?: number;
  price_per_whatsapp_session?: number;
  price_per_call_minute?: number;
  recovery_fee_percent?: number;
  min_monthly_amount?: number;
  billing_day?: number;
  payment_terms_days?: number;
  active?: boolean;
}

export interface PartnerDashboardBilling {
  current_period: {
    start: string;
    end: string;
    usage: UsageSummaryItem[];
    estimated_total: number;
  };
  outstanding_invoices: InvoiceRow[];
  billing_config: BillingConfigRow;
}

// ---------------------------------------------------------------------------
// Default billing config values
// ---------------------------------------------------------------------------

const DEFAULT_BILLING_CONFIG: Omit<BillingConfigRow, "id" | "partner_id" | "created_at" | "updated_at"> = {
  plan_name: "standard",
  price_per_lead: 0.5,
  price_per_message: 0.05,
  price_per_whatsapp_session: 49.9,
  price_per_call_minute: 0.15,
  recovery_fee_percent: 2.0,
  min_monthly_amount: 0,
  billing_day: 1,
  payment_terms_days: 15,
  active: true,
};

// ---------------------------------------------------------------------------
// Human-readable descriptions per event type
// ---------------------------------------------------------------------------

const EVENT_DESCRIPTIONS: Record<string, string> = {
  lead_created: "Lead criado",
  message_sent: "Mensagem enviada",
  whatsapp_session: "Sessao WhatsApp",
  call_made: "Chamada realizada",
  payment_recovered: "Pagamento recuperado",
};

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

function getClient() {
  return createClient(appEnv.supabaseUrl, appEnv.supabaseServiceRoleKey);
}

/**
 * Resolve the partner_id (UUID string) from a seller/tenant key by looking up
 * the partner_tenants table. Returns null if no match found.
 * Results are cached in-memory for 60s to avoid repeated lookups.
 */
const _partnerIdCache = new Map<string, { value: string | null; expiresAt: number }>();
const CACHE_TTL_MS = 60_000;

export async function resolvePartnerIdFromSellerKey(
  sellerKey: string,
): Promise<string | null> {
  if (!sellerKey) return null;

  const cached = _partnerIdCache.get(sellerKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const client = getClient();
  const { data, error } = await client
    .from("partner_tenants")
    .select("partner_id")
    .eq("tenant_key", sellerKey)
    .limit(1)
    .maybeSingle();

  if (error) {
    logger.warn("Failed to resolve partner_id from seller key", {
      sellerKey,
      error: error.message,
    });
    return null;
  }

  const partnerId = (data as { partner_id: string } | null)?.partner_id ?? null;
  _partnerIdCache.set(sellerKey, { value: partnerId, expiresAt: Date.now() + CACHE_TTL_MS });
  return partnerId;
}

/**
 * Log a usage event for a partner. Should be called fire-and-forget so it
 * never blocks the main flow.
 */
export async function logUsage(
  partnerId: string,
  sellerKey: string,
  eventType: BillingEventType,
  quantity = 1,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  const client = getClient();

  const { error } = await client.from("partner_usage_logs").insert({
    partner_id: partnerId,
    seller_key: sellerKey,
    event_type: eventType,
    quantity,
    metadata,
  });

  if (error) {
    logger.error("Failed to log partner usage", {
      partnerId,
      sellerKey,
      eventType,
      error: error.message,
    });
  }
}

/**
 * Aggregate usage by event_type for a partner within a period.
 */
export async function getUsageSummary(
  partnerId: string,
  periodStart: string,
  periodEnd: string,
): Promise<UsageSummaryItem[]> {
  const client = getClient();

  const { data, error } = await client
    .from("partner_usage_logs")
    .select("event_type, quantity")
    .eq("partner_id", partnerId)
    .gte("created_at", periodStart)
    .lte("created_at", periodEnd);

  if (error) {
    logger.error("Failed to get usage summary", {
      partnerId,
      error: error.message,
    });
    throw new Error(`Usage summary query failed: ${error.message}`);
  }

  const aggregated = new Map<string, number>();
  for (const row of data ?? []) {
    const current = aggregated.get(row.event_type) ?? 0;
    aggregated.set(row.event_type, current + (row.quantity ?? 1));
  }

  return Array.from(aggregated.entries()).map(([event_type, total_quantity]) => ({
    event_type,
    total_quantity,
  }));
}

/**
 * Get billing config for a partner. Returns defaults if none exists.
 */
export async function getBillingConfig(partnerId: string): Promise<BillingConfigRow> {
  const client = getClient();

  const { data, error } = await client
    .from("partner_billing_config")
    .select("*")
    .eq("partner_id", partnerId)
    .single();

  if (error && error.code !== "PGRST116") {
    logger.error("Failed to get billing config", {
      partnerId,
      error: error.message,
    });
    throw new Error(`Billing config query failed: ${error.message}`);
  }

  if (data) {
    return data as BillingConfigRow;
  }

  // Return virtual default config (not persisted yet)
  const now = new Date().toISOString();
  return {
    id: "",
    partner_id: partnerId,
    ...DEFAULT_BILLING_CONFIG,
    created_at: now,
    updated_at: now,
  };
}

/**
 * Update (upsert) billing config for a partner.
 */
export async function updateBillingConfig(
  partnerId: string,
  config: BillingConfigInput,
): Promise<BillingConfigRow> {
  const client = getClient();

  const payload = {
    partner_id: partnerId,
    ...config,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await client
    .from("partner_billing_config")
    .upsert(payload, { onConflict: "partner_id" })
    .select("*")
    .single();

  if (error) {
    logger.error("Failed to update billing config", {
      partnerId,
      error: error.message,
    });
    throw new Error(`Billing config update failed: ${error.message}`);
  }

  return data as BillingConfigRow;
}

/**
 * Calculate the unit price for a given event type based on billing config.
 */
function getUnitPrice(config: BillingConfigRow, eventType: string): number {
  switch (eventType) {
    case "lead_created":
      return Number(config.price_per_lead);
    case "message_sent":
      return Number(config.price_per_message);
    case "whatsapp_session":
      return Number(config.price_per_whatsapp_session);
    case "call_made":
      return Number(config.price_per_call_minute);
    case "payment_recovered":
      // recovery fee is percentage-based, handled differently
      return 0;
    default:
      return 0;
  }
}

/**
 * Generate an invoice for a partner covering a specific period.
 */
export async function generateInvoice(
  partnerId: string,
  periodStart: string,
  periodEnd: string,
): Promise<InvoiceRow> {
  const client = getClient();

  const [usage, config] = await Promise.all([
    getUsageSummary(partnerId, periodStart, periodEnd),
    getBillingConfig(partnerId),
  ]);

  const lineItems: InvoiceLineItem[] = [];
  let totalAmount = 0;

  for (const item of usage) {
    const unitPrice = getUnitPrice(config, item.event_type);
    const lineTotal = Number((unitPrice * item.total_quantity).toFixed(2));
    totalAmount += lineTotal;

    lineItems.push({
      event_type: item.event_type,
      quantity: item.total_quantity,
      unit_price: unitPrice,
      total: lineTotal,
      description: EVENT_DESCRIPTIONS[item.event_type] ?? item.event_type,
    });
  }

  // If payment_recovered events exist, add recovery fee line based on metadata amounts
  const recoveredUsage = usage.find((u) => u.event_type === "payment_recovered");
  if (recoveredUsage && config.recovery_fee_percent > 0) {
    // Fetch actual recovered amounts from metadata
    const { data: recoveredLogs } = await client
      .from("partner_usage_logs")
      .select("metadata")
      .eq("partner_id", partnerId)
      .eq("event_type", "payment_recovered")
      .gte("created_at", periodStart)
      .lte("created_at", periodEnd);

    let totalRecoveredAmount = 0;
    for (const log of recoveredLogs ?? []) {
      const meta = log.metadata as Record<string, unknown> | null;
      const amount = Number(meta?.amount ?? 0);
      if (Number.isFinite(amount)) totalRecoveredAmount += amount;
    }

    if (totalRecoveredAmount > 0) {
      const feeTotal = Number(
        ((totalRecoveredAmount * Number(config.recovery_fee_percent)) / 100).toFixed(2),
      );
      totalAmount += feeTotal;

      lineItems.push({
        event_type: "recovery_fee",
        quantity: 1,
        unit_price: feeTotal,
        total: feeTotal,
        description: `Taxa de recuperacao (${config.recovery_fee_percent}% sobre R$ ${totalRecoveredAmount.toFixed(2)})`,
      });
    }
  }

  // Apply minimum monthly amount
  const minAmount = Number(config.min_monthly_amount);
  if (minAmount > 0 && totalAmount < minAmount) {
    const diff = Number((minAmount - totalAmount).toFixed(2));
    lineItems.push({
      event_type: "minimum_adjustment",
      quantity: 1,
      unit_price: diff,
      total: diff,
      description: "Ajuste para valor minimo mensal",
    });
    totalAmount = minAmount;
  }

  totalAmount = Number(totalAmount.toFixed(2));

  // Calculate due date
  const periodEndDate = new Date(periodEnd);
  const dueDate = new Date(periodEndDate);
  dueDate.setDate(dueDate.getDate() + config.payment_terms_days);

  const { data, error } = await client
    .from("partner_invoices")
    .insert({
      partner_id: partnerId,
      period_start: periodStart,
      period_end: periodEnd,
      status: "draft",
      total_amount: totalAmount,
      currency: "BRL",
      line_items: lineItems,
      due_date: dueDate.toISOString().split("T")[0],
    })
    .select("*")
    .single();

  if (error) {
    logger.error("Failed to generate invoice", {
      partnerId,
      error: error.message,
    });
    throw new Error(`Invoice generation failed: ${error.message}`);
  }

  return data as InvoiceRow;
}

/**
 * List invoices for a partner, optionally filtered by status.
 */
export async function getInvoices(
  partnerId: string,
  status?: InvoiceStatus,
): Promise<InvoiceRow[]> {
  const client = getClient();

  let query = client
    .from("partner_invoices")
    .select("*")
    .eq("partner_id", partnerId)
    .order("period_start", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    logger.error("Failed to list invoices", {
      partnerId,
      error: error.message,
    });
    throw new Error(`Invoice list query failed: ${error.message}`);
  }

  return (data ?? []) as InvoiceRow[];
}

/**
 * List all invoices (admin view), optionally filtered by status.
 */
export async function getAllInvoices(status?: InvoiceStatus): Promise<InvoiceRow[]> {
  const client = getClient();

  let query = client
    .from("partner_invoices")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    logger.error("Failed to list all invoices", { error: error.message });
    throw new Error(`All invoices query failed: ${error.message}`);
  }

  return (data ?? []) as InvoiceRow[];
}

/**
 * Get a single invoice by ID.
 */
export async function getInvoiceById(invoiceId: string): Promise<InvoiceRow | null> {
  const client = getClient();

  const { data, error } = await client
    .from("partner_invoices")
    .select("*")
    .eq("id", invoiceId)
    .single();

  if (error && error.code !== "PGRST116") {
    logger.error("Failed to get invoice", {
      invoiceId,
      error: error.message,
    });
    throw new Error(`Invoice query failed: ${error.message}`);
  }

  return (data as InvoiceRow) ?? null;
}

/**
 * Update the status of an invoice.
 */
export async function updateInvoiceStatus(
  invoiceId: string,
  status: InvoiceStatus,
): Promise<InvoiceRow> {
  const client = getClient();

  const updatePayload: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === "paid") {
    updatePayload.paid_at = new Date().toISOString();
  }

  const { data, error } = await client
    .from("partner_invoices")
    .update(updatePayload)
    .eq("id", invoiceId)
    .select("*")
    .single();

  if (error) {
    logger.error("Failed to update invoice status", {
      invoiceId,
      status,
      error: error.message,
    });
    throw new Error(`Invoice status update failed: ${error.message}`);
  }

  return data as InvoiceRow;
}

/**
 * Get the current billing period boundaries for a partner based on their
 * billing_day config.
 */
function getCurrentPeriod(billingDay: number): { start: string; end: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed

  let periodStart: Date;
  let periodEnd: Date;

  if (now.getDate() >= billingDay) {
    periodStart = new Date(year, month, billingDay);
    periodEnd = new Date(year, month + 1, billingDay - 1);
  } else {
    periodStart = new Date(year, month - 1, billingDay);
    periodEnd = new Date(year, month, billingDay - 1);
  }

  return {
    start: periodStart.toISOString().split("T")[0],
    end: periodEnd.toISOString().split("T")[0],
  };
}

/**
 * Dashboard billing view: current period usage + outstanding invoices.
 */
export async function getPartnerDashboardBilling(
  partnerId: string,
): Promise<PartnerDashboardBilling> {
  const config = await getBillingConfig(partnerId);
  const period = getCurrentPeriod(config.billing_day);

  const [usage, outstanding] = await Promise.all([
    getUsageSummary(partnerId, period.start, `${period.end}T23:59:59.999Z`),
    getInvoices(partnerId).then((all) =>
      all.filter((inv) => inv.status === "pending" || inv.status === "overdue"),
    ),
  ]);

  // Estimate total for current period
  let estimatedTotal = 0;
  for (const item of usage) {
    estimatedTotal += getUnitPrice(config, item.event_type) * item.total_quantity;
  }
  estimatedTotal = Number(estimatedTotal.toFixed(2));

  return {
    current_period: {
      start: period.start,
      end: period.end,
      usage,
      estimated_total: estimatedTotal,
    },
    outstanding_invoices: outstanding,
    billing_config: config,
  };
}

// ---------------------------------------------------------------------------
// Fire-and-forget usage tracker utility
// ---------------------------------------------------------------------------

/**
 * Non-blocking usage tracker. Import this anywhere and call it to log
 * partner usage without awaiting or slowing down the caller.
 */
export function trackPartnerUsage(
  partnerId: string,
  sellerKey: string,
  eventType: BillingEventType,
  quantity = 1,
  metadata: Record<string, unknown> = {},
): void {
  if (!partnerId || !sellerKey) return;

  logUsage(partnerId, sellerKey, eventType, quantity, metadata).catch((err) => {
    logger.error("trackPartnerUsage fire-and-forget error", {
      partnerId,
      sellerKey,
      eventType,
      error: err instanceof Error ? err.message : String(err),
    });
  });
}
