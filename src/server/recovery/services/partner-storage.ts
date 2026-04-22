import { randomBytes, randomUUID } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { appEnv } from "@/server/recovery/config";
import type {
  PartnerProfileRecord,
  PartnerProfileInput,
  PartnerTenantRecord,
  PartnerTenantInput,
  PartnerUserRecord,
  PartnerUserInput,
  PartnerTenantStats,
  PartnerDashboardSnapshot,
  WebhookEventRecord,
} from "@/server/recovery/types";

// ── Database row types ──

type DatabasePartnerProfileRow = {
  id: string;
  name: string;
  slug: string;
  contact_email: string;
  contact_phone: string;
  brand_accent: string;
  brand_logo: string;
  webhook_url: string;
  active: boolean;
  notes: string;
  created_at: string;
  updated_at: string;
};

type DatabasePartnerTenantRow = {
  id: string;
  partner_id: string;
  tenant_key: string;
  tenant_name: string;
  tenant_email: string;
  gateway_slug: string;
  active: boolean;
  api_key_id: string | null;
  webhook_secret: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

type DatabasePartnerUserRow = {
  id: string;
  partner_id: string;
  email: string;
  password_hash: string;
  display_name: string;
  active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
};

// ── Helpers ──

function toIso(value: string | null | undefined): string {
  if (!value) return new Date().toISOString();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function normalizeSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ── Mappers ──

function mapProfile(row: DatabasePartnerProfileRow, tenantsCount = 0): PartnerProfileRecord {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone ?? "",
    brandAccent: row.brand_accent ?? "#6366f1",
    brandLogo: row.brand_logo ?? "",
    webhookUrl: row.webhook_url ?? "",
    active: row.active,
    notes: row.notes ?? "",
    tenantsCount,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function mapTenant(row: DatabasePartnerTenantRow): PartnerTenantRecord {
  return {
    id: row.id,
    partnerId: row.partner_id,
    tenantKey: row.tenant_key,
    tenantName: row.tenant_name,
    tenantEmail: row.tenant_email ?? "",
    gatewaySlug: row.gateway_slug ?? "partner",
    active: row.active,
    apiKeyId: row.api_key_id ?? undefined,
    webhookSecret: row.webhook_secret ?? "",
    metadata: row.metadata ?? {},
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function mapUser(row: DatabasePartnerUserRow): PartnerUserRecord {
  return {
    id: row.id,
    partnerId: row.partner_id,
    email: row.email,
    passwordHash: row.password_hash,
    displayName: row.display_name ?? "",
    active: row.active,
    lastLoginAt: row.last_login_at ? toIso(row.last_login_at) : undefined,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

// ── Service ──

export class PartnerStorageService {
  private readonly supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(appEnv.supabaseUrl, appEnv.supabaseServiceRoleKey);
  }

  // ── Profiles ──

  async listProfiles(): Promise<PartnerProfileRecord[]> {
    const { data, error } = await this.supabase
      .from("partner_profiles")
      .select("*")
      .order("name", { ascending: true });

    if (error || !data) return [];

    const { data: tenantCounts } = await this.supabase
      .from("partner_tenants")
      .select("partner_id");

    const countMap = new Map<string, number>();
    for (const row of tenantCounts ?? []) {
      const pid = (row as { partner_id: string }).partner_id;
      countMap.set(pid, (countMap.get(pid) ?? 0) + 1);
    }

    return (data as DatabasePartnerProfileRow[]).map((row) =>
      mapProfile(row, countMap.get(row.id) ?? 0),
    );
  }

  async getProfile(id: string): Promise<PartnerProfileRecord | undefined> {
    const { data, error } = await this.supabase
      .from("partner_profiles")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) return undefined;

    const { count } = await this.supabase
      .from("partner_tenants")
      .select("id", { count: "exact", head: true })
      .eq("partner_id", id);

    return mapProfile(data as DatabasePartnerProfileRow, count ?? 0);
  }

  async getProfileBySlug(slug: string): Promise<PartnerProfileRecord | undefined> {
    const { data, error } = await this.supabase
      .from("partner_profiles")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    if (error || !data) return undefined;

    const { count } = await this.supabase
      .from("partner_tenants")
      .select("id", { count: "exact", head: true })
      .eq("partner_id", (data as DatabasePartnerProfileRow).id);

    return mapProfile(data as DatabasePartnerProfileRow, count ?? 0);
  }

  async saveProfile(input: PartnerProfileInput, id?: string): Promise<PartnerProfileRecord> {
    const now = new Date().toISOString();
    const existing = id ? await this.getProfile(id) : undefined;

    const payload = {
      id: existing?.id ?? id ?? randomUUID(),
      name: input.name.trim(),
      slug: input.slug?.trim() || normalizeSlug(input.name),
      contact_email: input.contactEmail.trim().toLowerCase(),
      contact_phone: input.contactPhone?.trim() ?? existing?.contactPhone ?? "",
      brand_accent: input.brandAccent?.trim() ?? existing?.brandAccent ?? "#6366f1",
      brand_logo: input.brandLogo?.trim() ?? existing?.brandLogo ?? "",
      webhook_url: input.webhookUrl?.trim() ?? existing?.webhookUrl ?? "",
      active: input.active ?? existing?.active ?? true,
      notes: input.notes?.trim() ?? existing?.notes ?? "",
      created_at: existing?.createdAt ?? now,
      updated_at: now,
    };

    const { data, error } = await this.supabase
      .from("partner_profiles")
      .upsert(payload, { onConflict: "id" })
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(`Failed to save partner profile: ${error?.message ?? "unknown"}`);
    }

    return mapProfile(data as DatabasePartnerProfileRow, existing?.tenantsCount ?? 0);
  }

  // ── Tenants ──

  async listTenants(partnerId: string): Promise<PartnerTenantRecord[]> {
    const { data, error } = await this.supabase
      .from("partner_tenants")
      .select("*")
      .eq("partner_id", partnerId)
      .order("tenant_name", { ascending: true });

    if (error || !data) return [];
    return (data as DatabasePartnerTenantRow[]).map(mapTenant);
  }

  async getTenant(id: string): Promise<PartnerTenantRecord | undefined> {
    const { data, error } = await this.supabase
      .from("partner_tenants")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) return undefined;
    return mapTenant(data as DatabasePartnerTenantRow);
  }

  async getTenantByKey(partnerId: string, tenantKey: string): Promise<PartnerTenantRecord | undefined> {
    const { data, error } = await this.supabase
      .from("partner_tenants")
      .select("*")
      .eq("partner_id", partnerId)
      .eq("tenant_key", tenantKey)
      .maybeSingle();

    if (error || !data) return undefined;
    return mapTenant(data as DatabasePartnerTenantRow);
  }

  async saveTenant(input: PartnerTenantInput, id?: string): Promise<PartnerTenantRecord> {
    const now = new Date().toISOString();
    const existing = id ? await this.getTenant(id) : undefined;
    const tenantKey = input.tenantKey?.trim() || normalizeSlug(input.tenantName);

    const payload = {
      id: existing?.id ?? id ?? randomUUID(),
      partner_id: input.partnerId,
      tenant_key: tenantKey,
      tenant_name: input.tenantName.trim(),
      tenant_email: input.tenantEmail?.trim().toLowerCase() ?? existing?.tenantEmail ?? "",
      gateway_slug: input.gatewaySlug ?? existing?.gatewaySlug ?? "partner",
      active: input.active ?? existing?.active ?? true,
      api_key_id: input.apiKeyId ?? existing?.apiKeyId ?? null,
      webhook_secret: input.webhookSecret ?? existing?.webhookSecret ?? randomBytes(32).toString("hex"),
      metadata: input.metadata ?? existing?.metadata ?? {},
      created_at: existing?.createdAt ?? now,
      updated_at: now,
    };

    const { data, error } = await this.supabase
      .from("partner_tenants")
      .upsert(payload, { onConflict: "id" })
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(`Failed to save partner tenant: ${error?.message ?? "unknown"}`);
    }

    return mapTenant(data as DatabasePartnerTenantRow);
  }

  async deleteTenant(id: string): Promise<void> {
    await this.supabase.from("partner_tenants").delete().eq("id", id);
  }

  // ── Users ──

  async findUserByEmail(email: string): Promise<PartnerUserRecord | undefined> {
    const { data, error } = await this.supabase
      .from("partner_users")
      .select("*")
      .eq("email", email.trim().toLowerCase())
      .maybeSingle();

    if (error || !data) return undefined;
    return mapUser(data as DatabasePartnerUserRow);
  }

  async saveUser(input: PartnerUserInput, id?: string): Promise<PartnerUserRecord> {
    const now = new Date().toISOString();
    const existing = id
      ? await this.getUserById(id)
      : await this.findUserByEmail(input.email);

    const payload = {
      id: existing?.id ?? id ?? randomUUID(),
      partner_id: input.partnerId,
      email: input.email.trim().toLowerCase(),
      password_hash: input.passwordHash ?? existing?.passwordHash ?? "",
      display_name: input.displayName?.trim() ?? existing?.displayName ?? "",
      active: input.active ?? existing?.active ?? true,
      created_at: existing?.createdAt ?? now,
      updated_at: now,
    };

    const { data, error } = await this.supabase
      .from("partner_users")
      .upsert(payload, { onConflict: "id" })
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(`Failed to save partner user: ${error?.message ?? "unknown"}`);
    }

    return mapUser(data as DatabasePartnerUserRow);
  }

  async touchUserLogin(email: string): Promise<void> {
    await this.supabase
      .from("partner_users")
      .update({ last_login_at: new Date().toISOString() })
      .eq("email", email.trim().toLowerCase());
  }

  private async getUserById(id: string): Promise<PartnerUserRecord | undefined> {
    const { data, error } = await this.supabase
      .from("partner_users")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) return undefined;
    return mapUser(data as DatabasePartnerUserRow);
  }

  // ── Dashboard ──

  async getDashboardSnapshot(partnerId: string): Promise<PartnerDashboardSnapshot | null> {
    const profile = await this.getProfile(partnerId);
    if (!profile) return null;

    const tenants = await this.listTenants(partnerId);
    const tenantKeys = tenants.map((t) => t.tenantKey);

    if (tenantKeys.length === 0) {
      return {
        partner: profile,
        totals: {
          tenants: 0,
          activeTenants: 0,
          totalWebhooks: 0,
          totalPayments: 0,
          failedPayments: 0,
          recoveredPayments: 0,
          recoveryRate: 0,
          recoveredRevenue: 0,
          activeLeads: 0,
        },
        tenants: [],
        recentWebhooks: [],
      };
    }

    // Build LIKE patterns for scoped webhook IDs: "tenantKey:partner:%"
    const tenantStatsMap = new Map<string, PartnerTenantStats>();

    for (const tenant of tenants) {
      tenantStatsMap.set(tenant.tenantKey, {
        tenantKey: tenant.tenantKey,
        tenantName: tenant.tenantName,
        active: tenant.active,
        totalWebhooks: 0,
        totalPayments: 0,
        failedPayments: 0,
        recoveredPayments: 0,
        recoveryRate: 0,
        recoveredRevenue: 0,
        activeLeads: 0,
      });
    }

    // Query webhook events scoped to partner tenants
    for (const tenantKey of tenantKeys) {
      const prefix = `${tenantKey}:partner:`;
      const stats = tenantStatsMap.get(tenantKey)!;

      // Webhook count
      const { count: webhookCount } = await this.supabase
        .from("webhook_events")
        .select("id", { count: "exact", head: true })
        .like("webhook_id", `${prefix}%`);

      stats.totalWebhooks = webhookCount ?? 0;

      // Last webhook
      const { data: lastWh } = await this.supabase
        .from("webhook_events")
        .select("created_at")
        .like("webhook_id", `${prefix}%`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastWh) {
        stats.lastWebhookAt = toIso((lastWh as { created_at: string }).created_at);
      }
    }

    // Query recovery_leads and payments via seller_key (== tenant_key)
    // recovery_leads has assigned_agent matching seller, and payments link through customer
    // The simplest approach: query by the seller's webhook scoped data

    // Use the follow_up_contacts view or recovery_leads directly
    for (const tenantKey of tenantKeys) {
      const stats = tenantStatsMap.get(tenantKey)!;

      // Payments where gateway_payment_id starts with partner prefix
      const { data: payments } = await this.supabase
        .from("payments")
        .select("id, status, amount")
        .or(`order_id.like.${tenantKey}:%,gateway_payment_id.like.${tenantKey}:%`);

      if (payments) {
        stats.totalPayments = payments.length;
        stats.failedPayments = payments.filter(
          (p: { status: string }) =>
            p.status === "failed" || p.status === "refused" || p.status === "expired",
        ).length;
        stats.recoveredPayments = payments.filter(
          (p: { status: string }) => p.status === "recovered" || p.status === "succeeded",
        ).length;
        stats.recoveredRevenue = payments
          .filter(
            (p: { status: string }) => p.status === "recovered" || p.status === "succeeded",
          )
          .reduce((sum: number, p: { amount: number }) => sum + (p.amount ?? 0), 0);
      }

      // Active leads
      const { count: leadCount } = await this.supabase
        .from("recovery_leads")
        .select("id", { count: "exact", head: true })
        .eq("assigned_agent", tenantKey)
        .not("lead_status", "in", '("RECOVERED","LOST")');

      stats.activeLeads = leadCount ?? 0;

      // Calculate rate
      if (stats.failedPayments > 0) {
        stats.recoveryRate = Math.round(
          (stats.recoveredPayments / stats.failedPayments) * 10000,
        ) / 100;
      }
    }

    // Aggregate totals
    const allStats = [...tenantStatsMap.values()];
    const totals = {
      tenants: tenants.length,
      activeTenants: tenants.filter((t) => t.active).length,
      totalWebhooks: allStats.reduce((s, t) => s + t.totalWebhooks, 0),
      totalPayments: allStats.reduce((s, t) => s + t.totalPayments, 0),
      failedPayments: allStats.reduce((s, t) => s + t.failedPayments, 0),
      recoveredPayments: allStats.reduce((s, t) => s + t.recoveredPayments, 0),
      recoveryRate: 0,
      recoveredRevenue: allStats.reduce((s, t) => s + t.recoveredRevenue, 0),
      activeLeads: allStats.reduce((s, t) => s + t.activeLeads, 0),
    };

    if (totals.failedPayments > 0) {
      totals.recoveryRate =
        Math.round((totals.recoveredPayments / totals.failedPayments) * 10000) / 100;
    }

    // Recent webhooks (last 20)
    const recentWebhooksData: WebhookEventRecord[] = [];
    const { data: recentWh } = await this.supabase
      .from("webhook_events")
      .select("*")
      .or(tenantKeys.map((k) => `webhook_id.like.${k}:partner:%`).join(","))
      .order("created_at", { ascending: false })
      .limit(20);

    if (recentWh) {
      for (const row of recentWh) {
        const r = row as {
          id: string;
          webhook_id: string;
          event_id: string;
          event_type: string;
          source: string;
          payload: unknown;
          processed: boolean;
          duplicate: boolean;
          error: string | null;
          created_at: string;
          updated_at: string;
        };
        recentWebhooksData.push({
          id: r.id,
          webhookId: r.webhook_id,
          eventId: r.event_id,
          eventType: r.event_type,
          source: r.source ?? "partner",
          payload: r.payload,
          processed: r.processed,
          duplicate: r.duplicate,
          error: r.error ?? undefined,
          createdAt: toIso(r.created_at),
        });
      }
    }

    return {
      partner: profile,
      totals,
      tenants: allStats,
      recentWebhooks: recentWebhooksData,
    };
  }
}

// ── Singleton ──

let _instance: PartnerStorageService | null = null;

export function getPartnerStorageService(): PartnerStorageService {
  if (!_instance) {
    _instance = new PartnerStorageService();
  }
  return _instance;
}
