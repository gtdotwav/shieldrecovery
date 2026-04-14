import { randomUUID } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { appEnv } from "@/server/recovery/config";
import { createStructuredLog } from "@/server/recovery/utils/structured-logger";
import { getStorageService } from "@/server/recovery/services/storage";

/* ── Types ── */

type CampaignStatus = "draft" | "active" | "paused" | "completed";
type ContactStatus = "pending" | "contacted" | "reactivated" | "failed" | "opted_out";

interface ReactivationCampaign {
  id: string;
  sellerKey: string;
  name: string;
  description: string;
  status: CampaignStatus;
  inactiveDaysThreshold: number;
  batchSize: number;
  totalContacts: number;
  contactedCount: number;
  reactivatedCount: number;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

interface ReactivationContact {
  id: string;
  campaignId: string;
  customerId: string;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  lastPaymentAt: string;
  status: ContactStatus;
  reactivatedValue: number;
  contactedAt: string | null;
  reactivatedAt: string | null;
  createdAt: string;
}

interface CampaignAnalytics {
  totalContacts: number;
  contacted: number;
  reactivated: number;
  reactivatedValue: number;
  conversionRate: number;
  avgDaysSinceLastPayment: number;
}

export interface CreateCampaignInput {
  sellerKey: string;
  name: string;
  description?: string;
  inactiveDaysThreshold?: number;
  batchSize?: number;
}

/* ── Row mappers ── */

function mapCampaign(row: Record<string, unknown>): ReactivationCampaign {
  return {
    id: row.id as string,
    sellerKey: row.seller_key as string,
    name: row.name as string,
    description: (row.description as string) ?? "",
    status: row.status as CampaignStatus,
    inactiveDaysThreshold: row.inactive_days_threshold as number,
    batchSize: row.batch_size as number,
    totalContacts: (row.total_contacts as number) ?? 0,
    contactedCount: (row.contacted_count as number) ?? 0,
    reactivatedCount: (row.reactivated_count as number) ?? 0,
    createdAt: row.created_at as string,
    startedAt: (row.started_at as string) ?? null,
    completedAt: (row.completed_at as string) ?? null,
  };
}

function mapContact(row: Record<string, unknown>): ReactivationContact {
  return {
    id: row.id as string,
    campaignId: row.campaign_id as string,
    customerId: row.customer_id as string,
    customerName: (row.customer_name as string) ?? "",
    customerPhone: (row.customer_phone as string) ?? null,
    customerEmail: (row.customer_email as string) ?? null,
    lastPaymentAt: row.last_payment_at as string,
    status: row.status as ContactStatus,
    reactivatedValue: (row.reactivated_value as number) ?? 0,
    contactedAt: (row.contacted_at as string) ?? null,
    reactivatedAt: (row.reactivated_at as string) ?? null,
    createdAt: row.created_at as string,
  };
}

/* ── Service ── */

export class ReactivationService {
  private readonly supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(appEnv.supabaseUrl, appEnv.supabaseServiceRoleKey);
  }

  async createCampaign(input: CreateCampaignInput): Promise<ReactivationCampaign> {
    const id = randomUUID();
    const now = new Date().toISOString();

    const { data, error } = await this.supabase
      .from("reactivation_campaigns")
      .insert({
        id,
        seller_key: input.sellerKey,
        name: input.name,
        description: input.description ?? "",
        status: "draft",
        inactive_days_threshold: input.inactiveDaysThreshold ?? 90,
        batch_size: input.batchSize ?? 50,
        total_contacts: 0,
        contacted_count: 0,
        reactivated_count: 0,
        created_at: now,
      })
      .select("*")
      .single();

    if (error) throw new Error(`Failed to create campaign: ${error.message}`);
    return mapCampaign(data);
  }

  async startCampaign(campaignId: string): Promise<ReactivationCampaign> {
    const { data: campaign, error: fetchErr } = await this.supabase
      .from("reactivation_campaigns")
      .select("*")
      .eq("id", campaignId)
      .single();

    if (fetchErr || !campaign) throw new Error("Campaign not found.");

    const threshold = campaign.inactive_days_threshold as number;
    const cutoffDate = new Date(Date.now() - threshold * 86_400_000).toISOString();

    const { data: inactiveCustomers, error: custErr } = await this.supabase
      .from("customers")
      .select("id, name, phone, email")
      .lt("updated_at", cutoffDate)
      .limit(5000);

    if (custErr) throw new Error(`Failed to fetch inactive customers: ${custErr.message}`);

    const contacts = (inactiveCustomers ?? []).map((c) => ({
      id: randomUUID(),
      campaign_id: campaignId,
      customer_id: c.id,
      customer_name: c.name ?? "",
      customer_phone: c.phone ?? null,
      customer_email: c.email ?? null,
      last_payment_at: cutoffDate,
      status: "pending",
      reactivated_value: 0,
      created_at: new Date().toISOString(),
    }));

    if (contacts.length > 0) {
      const { error: insertErr } = await this.supabase
        .from("reactivation_contacts")
        .insert(contacts);
      if (insertErr) throw new Error(`Failed to insert contacts: ${insertErr.message}`);
    }

    const now = new Date().toISOString();
    const { data: updated, error: updateErr } = await this.supabase
      .from("reactivation_campaigns")
      .update({
        status: "active",
        total_contacts: contacts.length,
        started_at: now,
      })
      .eq("id", campaignId)
      .select("*")
      .single();

    if (updateErr) throw new Error(`Failed to start campaign: ${updateErr.message}`);

    const storage = getStorageService();
    await storage.addLog(
      createStructuredLog({
        eventType: "reactivation_campaign_started",
        level: "info",
        message: `Campaign ${campaignId} started with ${contacts.length} contacts.`,
        context: { campaignId, contactCount: contacts.length },
      }),
    );

    return mapCampaign(updated);
  }

  async processReactivationBatch(): Promise<{ processed: number }> {
    const { data: campaigns } = await this.supabase
      .from("reactivation_campaigns")
      .select("*")
      .eq("status", "active");

    let totalProcessed = 0;

    for (const campaign of campaigns ?? []) {
      const batchSize = (campaign.batch_size as number) ?? 50;

      const { data: pending, error } = await this.supabase
        .from("reactivation_contacts")
        .select("*")
        .eq("campaign_id", campaign.id)
        .eq("status", "pending")
        .limit(batchSize);

      if (error || !pending?.length) continue;

      const now = new Date().toISOString();
      const ids = pending.map((c) => c.id as string);

      await this.supabase
        .from("reactivation_contacts")
        .update({ status: "contacted", contacted_at: now })
        .in("id", ids);

      await this.supabase
        .from("reactivation_campaigns")
        .update({ contacted_count: (campaign.contacted_count as number) + ids.length })
        .eq("id", campaign.id);

      totalProcessed += ids.length;

      // Check if campaign is complete
      const { count } = await this.supabase
        .from("reactivation_contacts")
        .select("id", { count: "exact", head: true })
        .eq("campaign_id", campaign.id)
        .eq("status", "pending");

      if ((count ?? 0) === 0) {
        await this.supabase
          .from("reactivation_campaigns")
          .update({ status: "completed", completed_at: now })
          .eq("id", campaign.id);
      }
    }

    return { processed: totalProcessed };
  }

  async markReactivated(contactId: string, value: number): Promise<ReactivationContact> {
    const now = new Date().toISOString();

    const { data, error } = await this.supabase
      .from("reactivation_contacts")
      .update({ status: "reactivated", reactivated_value: value, reactivated_at: now })
      .eq("id", contactId)
      .select("*")
      .single();

    if (error || !data) throw new Error("Contact not found.");

    // Increment campaign reactivated count
    const { data: campaign } = await this.supabase
      .from("reactivation_campaigns")
      .select("reactivated_count")
      .eq("id", data.campaign_id)
      .single();

    if (campaign) {
      await this.supabase
        .from("reactivation_campaigns")
        .update({ reactivated_count: (campaign.reactivated_count as number) + 1 })
        .eq("id", data.campaign_id);
    }

    return mapContact(data);
  }

  async getCampaignAnalytics(campaignId: string): Promise<CampaignAnalytics> {
    const { data: contacts } = await this.supabase
      .from("reactivation_contacts")
      .select("*")
      .eq("campaign_id", campaignId);

    const all = (contacts ?? []).map(mapContact);
    const contacted = all.filter((c) => c.status !== "pending");
    const reactivated = all.filter((c) => c.status === "reactivated");
    const reactivatedValue = reactivated.reduce((sum, c) => sum + c.reactivatedValue, 0);

    const now = Date.now();
    const avgDays =
      all.length > 0
        ? all.reduce((sum, c) => sum + (now - new Date(c.lastPaymentAt).getTime()) / 86_400_000, 0) / all.length
        : 0;

    return {
      totalContacts: all.length,
      contacted: contacted.length,
      reactivated: reactivated.length,
      reactivatedValue,
      conversionRate: contacted.length > 0 ? reactivated.length / contacted.length : 0,
      avgDaysSinceLastPayment: Math.round(avgDays),
    };
  }

  async listCampaigns(sellerKey?: string): Promise<ReactivationCampaign[]> {
    let query = this.supabase
      .from("reactivation_campaigns")
      .select("*")
      .order("created_at", { ascending: false });

    if (sellerKey) query = query.eq("seller_key", sellerKey);

    const { data, error } = await query;
    if (error) throw new Error(`Failed to list campaigns: ${error.message}`);
    return (data ?? []).map(mapCampaign);
  }
}

/* ── Singleton ── */

declare global {
  var __reactivationService__: ReactivationService | undefined;
}

export function getReactivationService(): ReactivationService {
  if (!globalThis.__reactivationService__) {
    globalThis.__reactivationService__ = new ReactivationService();
  }
  return globalThis.__reactivationService__;
}
