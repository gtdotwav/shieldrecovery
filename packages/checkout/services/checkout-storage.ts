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

const SHORT_ID_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

function generateShortId(length = CHECKOUT_SHORT_ID_LENGTH): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += SHORT_ID_CHARS[Math.floor(Math.random() * SHORT_ID_CHARS.length)];
  }
  return result;
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
    let sessionsQuery = this.db.from("checkout_sessions").select("*");

    if (fromDate) sessionsQuery = sessionsQuery.gte("created_at", fromDate);
    if (toDate) sessionsQuery = sessionsQuery.lte("created_at", toDate);

    const { data: sessions, error: sessionsError } = await sessionsQuery;
    if (sessionsError) throw new Error(`getAnalytics: ${sessionsError.message}`);

    const rows = sessions as SessionRow[];
    const total = rows.length;
    const paid = rows.filter((s) => s.status === "paid");
    const paidCount = paid.length;
    const totalRevenue = paid.reduce((sum, s) => sum + s.amount, 0);

    const byMethod: CheckoutAnalytics["byMethod"] = {} as CheckoutAnalytics["byMethod"];
    for (const method of ["card", "pix", "boleto", "crypto"] as const) {
      const methodSessions = rows.filter(
        (s) => s.selected_method_type === method,
      );
      const methodPaid = methodSessions.filter((s) => s.status === "paid");
      byMethod[method] = {
        count: methodPaid.length,
        revenue: methodPaid.reduce((sum, s) => sum + s.amount, 0),
        conversionRate:
          methodSessions.length > 0
            ? methodPaid.length / methodSessions.length
            : 0,
      };
    }

    // Tracking funnel
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
}
