import { randomUUID } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import {
  CHECKOUT_DEFAULT_CURRENCY,
  CHECKOUT_DEFAULT_EXPIRY_MINUTES,
  CHECKOUT_SHORT_ID_LENGTH,
} from "../constants";
import type {
  CheckoutAnalytics,
  CheckoutMethodType,
  CheckoutPaymentProvider,
  CheckoutSession,
  CheckoutSessionStatus,
  CheckoutTrackingEvent,
  CheckoutTrackingRecord,
  CreateSessionInput,
  InstallmentRule,
  TrackEventInput,
} from "../types";

// ─── Database row types ─────────────────────────────────────────────

type ProviderRow = {
  id: string;
  slug: string;
  display_name: string;
  method_type: string;
  gateway: string;
  credentials: Record<string, unknown>;
  installment_rules: InstallmentRule[];
  enabled: boolean;
  priority: number;
  min_amount: number;
  max_amount: number;
  created_at: string;
  updated_at: string;
};

type SessionRow = {
  id: string;
  merchant_id: string;
  short_id: string;
  amount: number;
  currency: string;
  description: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_document: string | null;
  selected_provider_id: string | null;
  selected_method_type: string | null;
  selected_installments: number | null;
  provider_payment_id: string | null;
  pix_code: string | null;
  pix_qr_code: string | null;
  boleto_barcode: string | null;
  boleto_url: string | null;
  crypto_address: string | null;
  crypto_currency: string | null;
  status: string;
  source: string;
  source_reference_id: string | null;
  expires_at: string;
  paid_at: string | null;
  failed_at: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type TrackingRow = {
  id: string;
  session_id: string;
  event_type: string;
  method_type: string | null;
  provider_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

// ─── Mappers ────────────────────────────────────────────────────────

function mapProvider(r: ProviderRow): CheckoutPaymentProvider {
  const creds = (r.credentials ?? {}) as Record<string, unknown>;
  return {
    id: r.id,
    slug: r.slug,
    displayName: r.display_name,
    methodType: r.method_type as CheckoutMethodType,
    gateway: r.gateway as CheckoutPaymentProvider["gateway"],
    credentials: creds,
    publicKey: typeof creds.publicKey === "string" ? creds.publicKey : undefined,
    installmentRules: r.installment_rules ?? [],
    enabled: r.enabled,
    priority: r.priority,
    minAmount: r.min_amount,
    maxAmount: r.max_amount,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapSession(r: SessionRow): CheckoutSession {
  return {
    id: r.id,
    shortId: r.short_id,
    amount: r.amount,
    currency: r.currency,
    description: r.description,
    customerName: r.customer_name,
    customerEmail: r.customer_email,
    customerPhone: r.customer_phone,
    customerDocument: r.customer_document ?? undefined,
    selectedProviderId: r.selected_provider_id ?? undefined,
    selectedMethodType: (r.selected_method_type as CheckoutMethodType) ?? undefined,
    selectedInstallments: r.selected_installments ?? undefined,
    providerPaymentId: r.provider_payment_id ?? undefined,
    pixCode: r.pix_code ?? undefined,
    pixQrCode: r.pix_qr_code ?? undefined,
    boletoBarcode: r.boleto_barcode ?? undefined,
    boletoUrl: r.boleto_url ?? undefined,
    cryptoAddress: r.crypto_address ?? undefined,
    cryptoCurrency: r.crypto_currency ?? undefined,
    status: r.status as CheckoutSession["status"],
    source: r.source as CheckoutSession["source"],
    sourceReferenceId: r.source_reference_id ?? undefined,
    expiresAt: r.expires_at,
    paidAt: r.paid_at ?? undefined,
    failedAt: r.failed_at ?? undefined,
    utmSource: r.utm_source ?? undefined,
    utmMedium: r.utm_medium ?? undefined,
    utmCampaign: r.utm_campaign ?? undefined,
    metadata: r.metadata ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapTracking(r: TrackingRow): CheckoutTrackingRecord {
  return {
    id: r.id,
    sessionId: r.session_id,
    eventType: r.event_type as CheckoutTrackingEvent,
    methodType: (r.method_type as CheckoutMethodType) ?? undefined,
    providerId: r.provider_id ?? undefined,
    metadata: r.metadata ?? undefined,
    createdAt: r.created_at,
  };
}

// ─── Short ID generator ─────────────────────────────────────────────

const SHORT_ID_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

function generateShortId(length = CHECKOUT_SHORT_ID_LENGTH): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => SHORT_ID_CHARS[b % SHORT_ID_CHARS.length]).join("");
}

// ─── Storage class ──────────────────────────────────────────────────

export class CheckoutStorage {
  private db: SupabaseClient;

  constructor(supabaseUrl: string, supabaseServiceRoleKey: string) {
    this.db = createClient(supabaseUrl, supabaseServiceRoleKey);
  }

  // ── Providers ───────────────────────────────────────────────────

  async listEnabledProviders(): Promise<CheckoutPaymentProvider[]> {
    const { data, error } = await this.db
      .from("checkout_payment_providers")
      .select("*")
      .eq("enabled", true)
      .order("priority", { ascending: true });

    if (error) throw new Error(`listEnabledProviders: ${error.message}`);
    return (data as ProviderRow[]).map(mapProvider);
  }

  async listProvidersByMethod(
    methodType: CheckoutMethodType,
  ): Promise<CheckoutPaymentProvider[]> {
    const { data, error } = await this.db
      .from("checkout_payment_providers")
      .select("*")
      .eq("method_type", methodType)
      .eq("enabled", true)
      .order("priority", { ascending: true });

    if (error) throw new Error(`listProvidersByMethod: ${error.message}`);
    return (data as ProviderRow[]).map(mapProvider);
  }

  async getProviderBySlug(
    slug: string,
  ): Promise<CheckoutPaymentProvider | null> {
    const { data, error } = await this.db
      .from("checkout_payment_providers")
      .select("*")
      .eq("slug", slug)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw new Error(`getProviderBySlug: ${error.message}`);
    }
    return mapProvider(data as ProviderRow);
  }

  async getProviderById(
    id: string,
  ): Promise<CheckoutPaymentProvider | null> {
    const { data, error } = await this.db
      .from("checkout_payment_providers")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw new Error(`getProviderById: ${error.message}`);
    }
    return mapProvider(data as ProviderRow);
  }

  // ── Sessions ────────────────────────────────────────────────────

  async createSession(input: CreateSessionInput): Promise<CheckoutSession> {
    const id = randomUUID();
    const shortId = generateShortId();
    const now = new Date().toISOString();
    const expiresAt = new Date(
      Date.now() +
        (input.expiresInMinutes ?? CHECKOUT_DEFAULT_EXPIRY_MINUTES) * 60_000,
    ).toISOString();

    const row: Partial<SessionRow> = {
      id,
      merchant_id: input.merchantId,
      short_id: shortId,
      amount: input.amount,
      currency: input.currency ?? CHECKOUT_DEFAULT_CURRENCY,
      description: input.description,
      customer_name: input.customerName,
      customer_email: input.customerEmail,
      customer_phone: input.customerPhone,
      customer_document: input.customerDocument ?? null,
      status: "open",
      source: input.source,
      source_reference_id: input.sourceReferenceId ?? null,
      expires_at: expiresAt,
      utm_source: input.utmSource ?? null,
      utm_medium: input.utmMedium ?? null,
      utm_campaign: input.utmCampaign ?? null,
      metadata: input.metadata ?? null,
      created_at: now,
      updated_at: now,
    };

    const { data, error } = await this.db
      .from("checkout_sessions")
      .insert(row)
      .select()
      .single();

    if (error) throw new Error(`createSession: ${error.message}`);
    return mapSession(data as SessionRow);
  }

  async getSessionByShortId(shortId: string): Promise<CheckoutSession | null> {
    const { data, error } = await this.db
      .from("checkout_sessions")
      .select("*")
      .eq("short_id", shortId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw new Error(`getSessionByShortId: ${error.message}`);
    }
    return mapSession(data as SessionRow);
  }

  async getSessionById(id: string): Promise<CheckoutSession | null> {
    const { data, error } = await this.db
      .from("checkout_sessions")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw new Error(`getSessionById: ${error.message}`);
    }
    return mapSession(data as SessionRow);
  }

  async updateSession(
    id: string,
    updates: Partial<
      Pick<
        SessionRow,
        | "selected_provider_id"
        | "selected_method_type"
        | "selected_installments"
        | "provider_payment_id"
        | "pix_code"
        | "pix_qr_code"
        | "boleto_barcode"
        | "boleto_url"
        | "crypto_address"
        | "crypto_currency"
        | "status"
        | "paid_at"
        | "failed_at"
        | "metadata"
      >
    >,
  ): Promise<CheckoutSession> {
    const { data, error } = await this.db
      .from("checkout_sessions")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(`updateSession: ${error.message}`);
    return mapSession(data as SessionRow);
  }

  async getSessionByProviderPaymentId(
    providerPaymentId: string,
  ): Promise<CheckoutSession | null> {
    const { data, error } = await this.db
      .from("checkout_sessions")
      .select("*")
      .eq("provider_payment_id", providerPaymentId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw new Error(`getSessionByProviderPaymentId: ${error.message}`);
    }
    return mapSession(data as SessionRow);
  }

  // ── Tracking ────────────────────────────────────────────────────

  async trackEvent(input: TrackEventInput): Promise<CheckoutTrackingRecord> {
    const row: Partial<TrackingRow> = {
      id: randomUUID(),
      session_id: input.sessionId,
      event_type: input.eventType,
      method_type: input.methodType ?? null,
      provider_id: input.providerId ?? null,
      metadata: input.metadata ?? null,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await this.db
      .from("checkout_tracking_events")
      .insert(row)
      .select()
      .single();

    if (error) throw new Error(`trackEvent: ${error.message}`);
    return mapTracking(data as TrackingRow);
  }

  async getSessionEvents(
    sessionId: string,
  ): Promise<CheckoutTrackingRecord[]> {
    const { data, error } = await this.db
      .from("checkout_tracking_events")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (error) throw new Error(`getSessionEvents: ${error.message}`);
    return (data as TrackingRow[]).map(mapTracking);
  }

  // ── Analytics ───────────────────────────────────────────────────

  async getAnalytics(
    fromDate?: string,
    toDate?: string,
  ): Promise<CheckoutAnalytics> {
    // Build date filter for RPC or manual SQL via Supabase
    const dateFilters: string[] = [];
    if (fromDate) dateFilters.push(`created_at >= '${fromDate}'`);
    if (toDate) dateFilters.push(`created_at <= '${toDate}'`);
    const whereClause = dateFilters.length > 0
      ? `WHERE ${dateFilters.join(" AND ")}`
      : "";

    // ── Totals via SQL aggregation ──
    type AnalyticsTotals = {
      total_sessions: number;
      paid_sessions: number;
      total_revenue: number;
    };
    const { data: totalsData, error: totalsError } = await this.db.rpc(
      "run_checkout_analytics_totals",
      { date_filter: whereClause },
    ).single<AnalyticsTotals>();

    // Fallback: if RPC doesn't exist, use filtered count queries
    let total: number;
    let paidCount: number;
    let totalRevenue: number;

    if (totalsError || !totalsData) {
      // Fallback: use Supabase count queries (no SELECT *)
      let countQuery = this.db
        .from("checkout_sessions")
        .select("id", { count: "exact", head: true });
      if (fromDate) countQuery = countQuery.gte("created_at", fromDate);
      if (toDate) countQuery = countQuery.lte("created_at", toDate);
      const { count: totalCount } = await countQuery;
      total = totalCount ?? 0;

      let paidQuery = this.db
        .from("checkout_sessions")
        .select("id", { count: "exact", head: true })
        .eq("status", "paid");
      if (fromDate) paidQuery = paidQuery.gte("created_at", fromDate);
      if (toDate) paidQuery = paidQuery.lte("created_at", toDate);
      const { count: paidTotal } = await paidQuery;
      paidCount = paidTotal ?? 0;

      // Revenue: fetch only paid sessions' amounts (not SELECT *)
      let revenueQuery = this.db
        .from("checkout_sessions")
        .select("amount")
        .eq("status", "paid");
      if (fromDate) revenueQuery = revenueQuery.gte("created_at", fromDate);
      if (toDate) revenueQuery = revenueQuery.lte("created_at", toDate);
      const { data: revenueRows } = await revenueQuery;
      totalRevenue = (revenueRows ?? []).reduce(
        (sum: number, r: { amount: number }) => sum + r.amount,
        0,
      );
    } else {
      total = Number(totalsData.total_sessions ?? 0);
      paidCount = Number(totalsData.paid_sessions ?? 0);
      totalRevenue = Number(totalsData.total_revenue ?? 0);
    }

    // ── By-method breakdown ──
    const byMethod: CheckoutAnalytics["byMethod"] = {} as CheckoutAnalytics["byMethod"];
    for (const method of ["card", "pix", "boleto", "crypto"] as const) {
      let methodCountQuery = this.db
        .from("checkout_sessions")
        .select("id", { count: "exact", head: true })
        .eq("selected_method_type", method);
      if (fromDate) methodCountQuery = methodCountQuery.gte("created_at", fromDate);
      if (toDate) methodCountQuery = methodCountQuery.lte("created_at", toDate);
      const { count: methodTotal } = await methodCountQuery;

      let methodPaidQuery = this.db
        .from("checkout_sessions")
        .select("amount")
        .eq("selected_method_type", method)
        .eq("status", "paid");
      if (fromDate) methodPaidQuery = methodPaidQuery.gte("created_at", fromDate);
      if (toDate) methodPaidQuery = methodPaidQuery.lte("created_at", toDate);
      const { data: methodPaidRows } = await methodPaidQuery;

      const methodPaidCount = methodPaidRows?.length ?? 0;
      const methodRevenue = (methodPaidRows ?? []).reduce(
        (sum: number, r: { amount: number }) => sum + r.amount,
        0,
      );
      const methodTotalCount = methodTotal ?? 0;

      byMethod[method] = {
        count: methodPaidCount,
        revenue: methodRevenue,
        conversionRate:
          methodTotalCount > 0 ? methodPaidCount / methodTotalCount : 0,
      };
    }

    // ── Tracking funnel (aggregated count per event_type) ──
    let trackingQuery = this.db
      .from("checkout_tracking_events")
      .select("event_type");
    if (fromDate) trackingQuery = trackingQuery.gte("created_at", fromDate);
    if (toDate) trackingQuery = trackingQuery.lte("created_at", toDate);

    const { data: events } = await trackingQuery;
    const funnel: CheckoutAnalytics["funnel"] = {} as CheckoutAnalytics["funnel"];
    for (const e of (events ?? []) as { event_type: string }[]) {
      const key = e.event_type as CheckoutTrackingEvent;
      funnel[key] = (funnel[key] ?? 0) + 1;
    }

    return {
      totalSessions: total,
      paidSessions: paidCount,
      conversionRate: total > 0 ? paidCount / total : 0,
      totalRevenue,
      averageTicket: paidCount > 0 ? totalRevenue / paidCount : 0,
      byMethod,
      funnel,
    };
  }

  // ── Bulk expire open sessions ─────────────────────────────────

  async bulkExpireOpenSessions(): Promise<number> {
    const now = new Date().toISOString();
    const { data, error } = await this.db
      .from("checkout_sessions")
      .update({ status: "expired", updated_at: now })
      .eq("status", "open")
      .lt("expires_at", now)
      .select("id");

    if (error) throw new Error(`bulkExpireOpenSessions: ${error.message}`);
    return data?.length ?? 0;
  }
}
