import { randomUUID } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { appEnv } from "@/server/recovery/config";
import { getVapiService } from "@/server/recovery/services/vapi-service";
import { createStructuredLog } from "@/server/recovery/utils/structured-logger";

/* ── Types ── */

type CampaignStatus = "draft" | "active" | "paused" | "completed";
type ContactChannel = "voice" | "whatsapp";
type ContactOutcome = "answered" | "no_answer" | "voicemail" | "interested" | "not_interested" | "callback" | "converted" | "failed";

type CampaignRow = {
  id: string;
  seller_key: string;
  name: string;
  product: string;
  description: string | null;
  script: string;
  channel: string;
  status: string;
  batch_size: number;
  batch_interval_minutes: number;
  total_contacts: number;
  contacts_reached: number;
  contacts_converted: number;
  created_at: string;
  updated_at: string;
};

type ContactRow = {
  id: string;
  campaign_id: string;
  customer_name: string;
  phone: string;
  email: string | null;
  status: string;
  outcome: string | null;
  outcome_notes: string | null;
  provider_call_id: string | null;
  attempted_at: string | null;
  responded_at: string | null;
  created_at: string;
};

export type SalesCampaign = {
  id: string;
  sellerKey: string;
  name: string;
  product: string;
  description: string | null;
  script: string;
  channel: ContactChannel;
  status: CampaignStatus;
  batchSize: number;
  batchIntervalMinutes: number;
  totalContacts: number;
  contactsReached: number;
  contactsConverted: number;
  createdAt: string;
  updatedAt: string;
};

export type SalesContact = {
  id: string;
  campaignId: string;
  customerName: string;
  phone: string;
  email: string | null;
  status: "pending" | "in_progress" | "completed" | "failed";
  outcome: ContactOutcome | null;
  outcomeNotes: string | null;
  providerCallId: string | null;
  attemptedAt: string | null;
  respondedAt: string | null;
  createdAt: string;
};

export type CreateCampaignInput = {
  sellerKey: string;
  name: string;
  product: string;
  description?: string;
  script: string;
  channel?: ContactChannel;
  batchSize?: number;
  batchIntervalMinutes?: number;
  contacts: Array<{ customerName: string; phone: string; email?: string }>;
};

export type CampaignAnalytics = {
  totalContacts: number;
  contacted: number;
  pending: number;
  answered: number;
  interested: number;
  converted: number;
  conversionRate: number;
  reachRate: number;
};

/* ── Row mapping ── */

function rowToCampaign(row: CampaignRow): SalesCampaign {
  return {
    id: row.id,
    sellerKey: row.seller_key,
    name: row.name,
    product: row.product,
    description: row.description,
    script: row.script,
    channel: row.channel as ContactChannel,
    status: row.status as CampaignStatus,
    batchSize: row.batch_size,
    batchIntervalMinutes: row.batch_interval_minutes,
    totalContacts: row.total_contacts,
    contactsReached: row.contacts_reached,
    contactsConverted: row.contacts_converted,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToContact(row: ContactRow): SalesContact {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    customerName: row.customer_name,
    phone: row.phone,
    email: row.email,
    status: row.status as SalesContact["status"],
    outcome: row.outcome as ContactOutcome | null,
    outcomeNotes: row.outcome_notes,
    providerCallId: row.provider_call_id,
    attemptedAt: row.attempted_at,
    respondedAt: row.responded_at,
    createdAt: row.created_at,
  };
}

/* ── Service ── */

export class OutboundSalesService {
  private readonly supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(appEnv.supabaseUrl, appEnv.supabaseServiceRoleKey);
  }

  async createCampaign(input: CreateCampaignInput | unknown): Promise<SalesCampaign> {
    return this._createCampaign(input as CreateCampaignInput);
  }

  private async _createCampaign(input: CreateCampaignInput): Promise<SalesCampaign> {
    const now = new Date().toISOString();
    const campaignId = randomUUID();

    const campaignRow: CampaignRow = {
      id: campaignId,
      seller_key: input.sellerKey,
      name: input.name,
      product: input.product,
      description: input.description ?? null,
      script: input.script,
      channel: input.channel ?? "whatsapp",
      status: "draft",
      batch_size: input.batchSize ?? 10,
      batch_interval_minutes: input.batchIntervalMinutes ?? 30,
      total_contacts: input.contacts.length,
      contacts_reached: 0,
      contacts_converted: 0,
      created_at: now,
      updated_at: now,
    };

    const { error: campaignError } = await this.supabase
      .from("outbound_sales_campaigns")
      .insert(campaignRow);

    if (campaignError) throw new Error(`Failed to create campaign: ${campaignError.message}`);

    // Insert contacts in batches of 500
    const contactRows: ContactRow[] = input.contacts.map((c) => ({
      id: randomUUID(),
      campaign_id: campaignId,
      customer_name: c.customerName,
      phone: c.phone,
      email: c.email ?? null,
      status: "pending",
      outcome: null,
      outcome_notes: null,
      provider_call_id: null,
      attempted_at: null,
      responded_at: null,
      created_at: now,
    }));

    for (let i = 0; i < contactRows.length; i += 500) {
      const batch = contactRows.slice(i, i + 500);
      const { error } = await this.supabase.from("outbound_sales_contacts").insert(batch);
      if (error) console.error(`[OutboundSales] Failed to insert contact batch: ${error.message}`);
    }

    await this.supabase.from("system_logs").insert(
      createStructuredLog({
        eventType: "outbound_sales",
        level: "info",
        message: `Campaign created: ${input.name} with ${input.contacts.length} contacts`,
        context: { campaignId, sellerKey: input.sellerKey },
      }),
    );

    return rowToCampaign(campaignRow);
  }

  async updateCampaign(
    id: string,
    rawInput: Partial<Pick<CreateCampaignInput, "name" | "product" | "description" | "script" | "batchSize" | "batchIntervalMinutes">> | unknown,
  ): Promise<SalesCampaign> {
    const input = rawInput as Partial<Pick<CreateCampaignInput, "name" | "product" | "description" | "script" | "batchSize" | "batchIntervalMinutes">>;
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (input.name !== undefined) updates.name = input.name;
    if (input.product !== undefined) updates.product = input.product;
    if (input.description !== undefined) updates.description = input.description;
    if (input.script !== undefined) updates.script = input.script;
    if (input.batchSize !== undefined) updates.batch_size = input.batchSize;
    if (input.batchIntervalMinutes !== undefined) updates.batch_interval_minutes = input.batchIntervalMinutes;

    const { data, error } = await this.supabase
      .from("outbound_sales_campaigns")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error || !data) throw new Error(`Failed to update campaign: ${error?.message ?? "not found"}`);

    return rowToCampaign(data as CampaignRow);
  }

  async startCampaign(id: string): Promise<SalesCampaign> {
    return this.setCampaignStatus(id, "active");
  }

  async pauseCampaign(id: string): Promise<SalesCampaign> {
    return this.setCampaignStatus(id, "paused");
  }

  async resumeCampaign(id: string): Promise<SalesCampaign> {
    return this.setCampaignStatus(id, "active");
  }

  async processOutboundBatch(): Promise<{ processed: number; errors: number }> {
    // Fetch active campaigns
    const { data: campaigns } = await this.supabase
      .from("outbound_sales_campaigns")
      .select("*")
      .eq("status", "active");

    if (!campaigns?.length) return { processed: 0, errors: 0 };

    let totalProcessed = 0;
    let totalErrors = 0;

    for (const rawCampaign of campaigns) {
      const campaign = rowToCampaign(rawCampaign as CampaignRow);

      // Fetch pending contacts for this campaign
      const { data: contacts } = await this.supabase
        .from("outbound_sales_contacts")
        .select("*")
        .eq("campaign_id", campaign.id)
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .limit(campaign.batchSize);

      if (!contacts?.length) {
        // No more pending contacts — mark campaign completed
        await this.setCampaignStatus(campaign.id, "completed");
        continue;
      }

      for (const rawContact of contacts) {
        const contact = rowToContact(rawContact as ContactRow);

        try {
          await this.supabase
            .from("outbound_sales_contacts")
            .update({ status: "in_progress", attempted_at: new Date().toISOString() })
            .eq("id", contact.id);

          if (campaign.channel === "voice") {
            await this.initiateVoiceContact(campaign, contact);
          } else {
            await this.initiateWhatsAppContact(campaign, contact);
          }

          totalProcessed++;
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error";
          console.error(`[OutboundSales] Contact ${contact.id} failed: ${message}`);

          await this.supabase
            .from("outbound_sales_contacts")
            .update({ status: "failed", outcome: "failed", outcome_notes: message })
            .eq("id", contact.id);

          totalErrors++;
        }
      }

      // Update campaign counters
      const { count: reached } = await this.supabase
        .from("outbound_sales_contacts")
        .select("id", { count: "exact", head: true })
        .eq("campaign_id", campaign.id)
        .neq("status", "pending");

      await this.supabase
        .from("outbound_sales_campaigns")
        .update({ contacts_reached: reached ?? 0, updated_at: new Date().toISOString() })
        .eq("id", campaign.id);
    }

    return { processed: totalProcessed, errors: totalErrors };
  }

  async handleCallResult(
    contactId: string,
    outcome: ContactOutcome,
    notes?: string,
  ): Promise<SalesContact> {
    const { data, error } = await this.supabase
      .from("outbound_sales_contacts")
      .update({
        status: "completed",
        outcome,
        outcome_notes: notes ?? null,
        responded_at: new Date().toISOString(),
      })
      .eq("id", contactId)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to update contact result: ${error?.message ?? "not found"}`);
    }

    const contact = rowToContact(data as ContactRow);

    // Update campaign conversion counter if converted
    if (outcome === "converted") {
      try {
        const { data: c } = await this.supabase
          .from("outbound_sales_campaigns")
          .select("contacts_converted")
          .eq("id", contact.campaignId)
          .single();

        if (c) {
          await this.supabase
            .from("outbound_sales_campaigns")
            .update({
              contacts_converted: (c.contacts_converted ?? 0) + 1,
              updated_at: new Date().toISOString(),
            })
            .eq("id", contact.campaignId);
        }
      } catch (err) {
        console.error(`[OutboundSales] Failed to increment conversion counter: ${err}`);
      }
    }

    await this.supabase.from("system_logs").insert(
      createStructuredLog({
        eventType: "outbound_sales",
        level: "info",
        message: `Contact ${contactId} result: ${outcome}`,
        context: { contactId, campaignId: contact.campaignId, outcome },
      }),
    );

    return contact;
  }

  async getCampaignAnalytics(campaignId: string): Promise<CampaignAnalytics> {
    const { data } = await this.supabase
      .from("outbound_sales_contacts")
      .select("status, outcome")
      .eq("campaign_id", campaignId);

    const contacts = data ?? [];
    const total = contacts.length;
    const contacted = contacts.filter((c) => c.status !== "pending").length;
    const pending = contacts.filter((c) => c.status === "pending").length;
    const answered = contacts.filter((c) =>
      c.outcome && ["answered", "interested", "converted", "not_interested", "callback"].includes(c.outcome),
    ).length;
    const interested = contacts.filter((c) => c.outcome === "interested" || c.outcome === "converted").length;
    const converted = contacts.filter((c) => c.outcome === "converted").length;

    return {
      totalContacts: total,
      contacted,
      pending,
      answered,
      interested,
      converted,
      conversionRate: contacted > 0 ? converted / contacted : 0,
      reachRate: total > 0 ? contacted / total : 0,
    };
  }

  async getCampaign(id: string): Promise<SalesCampaign | null> {
    const { data, error } = await this.supabase
      .from("outbound_sales_campaigns")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) return null;
    return rowToCampaign(data as CampaignRow);
  }

  async listCampaigns(
    opts?: string | { sellerKey?: string; status?: string; limit?: number },
  ): Promise<SalesCampaign[]> {
    const sellerKey = typeof opts === "string" ? opts : opts?.sellerKey;
    const status = typeof opts === "object" ? opts?.status : undefined;
    const limit = typeof opts === "object" ? opts?.limit : undefined;

    let query = this.supabase
      .from("outbound_sales_campaigns")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit ?? 100);

    if (sellerKey) query = query.eq("seller_key", sellerKey);
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw new Error(`Failed to list campaigns: ${error.message}`);

    return (data as CampaignRow[]).map(rowToCampaign);
  }

  /* ── Private helpers ── */

  private async setCampaignStatus(id: string, status: CampaignStatus): Promise<SalesCampaign> {
    const { data, error } = await this.supabase
      .from("outbound_sales_campaigns")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error || !data) throw new Error(`Failed to set campaign status: ${error?.message ?? "not found"}`);

    return rowToCampaign(data as CampaignRow);
  }

  private async initiateVoiceContact(campaign: SalesCampaign, contact: SalesContact): Promise<void> {
    const vapi = getVapiService();

    if (!vapi.configured) {
      throw new Error("VAPI service not configured for voice calls");
    }

    const callRecord = {
      id: randomUUID(),
      leadId: contact.id,
      toNumber: contact.phone,
      fromNumber: "",
      direction: "outbound" as const,
      status: "queued" as const,
      createdAt: new Date().toISOString(),
    };

    const result = await vapi.initiateCall({
      callRecord: callRecord as any,
      customerName: contact.customerName,
      script: campaign.script,
      product: campaign.product,
      voiceTone: "professional",
      voiceGender: "female",
    });

    if (result.ok && result.vapiCallId) {
      await this.supabase
        .from("outbound_sales_contacts")
        .update({ provider_call_id: result.vapiCallId })
        .eq("id", contact.id);
    } else {
      throw new Error(result.error ?? "Voice call initiation failed");
    }
  }

  private async initiateWhatsAppContact(campaign: SalesCampaign, contact: SalesContact): Promise<void> {
    if (!appEnv.whatsappConfigured) {
      throw new Error("WhatsApp not configured for outbound messages");
    }

    const message = this.buildWhatsAppMessage(campaign, contact);

    const response = await fetch(
      `https://graph.facebook.com/v22.0/${appEnv.whatsappPhoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${appEnv.whatsappAccessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: contact.phone,
          type: "text",
          text: { body: message },
        }),
        signal: AbortSignal.timeout(10_000),
      },
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(`WhatsApp API error ${response.status}: ${errorText.slice(0, 300)}`);
    }

    await this.supabase
      .from("outbound_sales_contacts")
      .update({ status: "completed", outcome: "answered" })
      .eq("id", contact.id);
  }

  private buildWhatsAppMessage(campaign: SalesCampaign, contact: SalesContact): string {
    const firstName = contact.customerName.split(/\s+/)[0] || "cliente";

    return [
      `Oi ${firstName}, tudo bem? 👋`,
      ``,
      `Estou entrando em contato sobre o *${campaign.product}*.`,
      ``,
      campaign.script,
    ].join("\n");
  }
}

/* ── Singleton ── */

declare global {
  var __outboundSalesService__: OutboundSalesService | undefined;
}

export function getOutboundSalesService(): OutboundSalesService {
  if (!globalThis.__outboundSalesService__) {
    globalThis.__outboundSalesService__ = new OutboundSalesService();
  }
  return globalThis.__outboundSalesService__;
}
