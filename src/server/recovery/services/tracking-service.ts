import { randomUUID } from "node:crypto";
import { createHash } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { appEnv } from "@/server/recovery/config";
import { createStructuredLog } from "@/server/recovery/utils/structured-logger";

/* ── Types ── */

export type TrackingEventType =
  | "page_view"
  | "link_click"
  | "checkout_start"
  | "payment_completed"
  | "recovery_completed"
  | "cart_recovered"
  | "upsell_accepted"
  | "reactivation_completed"
  | "subscription_renewed";

export type InternalSource =
  | "recovery_whatsapp"
  | "recovery_email"
  | "recovery_voice"
  | "recovery_sms"
  | "upsell"
  | "reactivation"
  | "cart_recovery"
  | "outbound_sales"
  | "preventive"
  | "commerce"
  | "direct"
  | "affiliate"
  | "organic";

export type UtmParams = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
};

export type TrackingEvent = {
  id: string;
  sellerKey: string;
  eventType: TrackingEventType;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  sessionId?: string;
  visitorId?: string;
  customerId?: string;
  paymentId?: string;
  leadId?: string;
  linkId?: string;
  campaignId?: string;
  referrerUrl?: string;
  landingPage?: string;
  ipHash?: string;
  userAgent?: string;
  deviceType?: "mobile" | "desktop" | "tablet";
  revenueCents: number;
  internalSource?: InternalSource;
  internalSourceId?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type TrackingCampaign = {
  id: string;
  sellerKey: string;
  name: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent?: string;
  utmTerm?: string;
  costCents: number;
  totalClicks: number;
  totalUniqueVisitors: number;
  totalConversions: number;
  totalRevenueCents: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TrackingLink = {
  id: string;
  sellerKey: string;
  campaignId?: string;
  shortCode: string;
  destinationUrl: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  label?: string;
  totalClicks: number;
  totalUniqueClicks: number;
  totalConversions: number;
  active: boolean;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type TrackingDailyStat = {
  statDate: string;
  sellerKey: string;
  campaignId?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  pageViews: number;
  linkClicks: number;
  uniqueVisitors: number;
  checkoutStarts: number;
  conversions: number;
  revenueCents: number;
  costCents: number;
  clickThroughRate: number;
  conversionRate: number;
  cpaCents: number;
  roas: number;
};

export type CreateCampaignInput = {
  sellerKey: string;
  name: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent?: string;
  utmTerm?: string;
  costCents?: number;
};

export type CreateLinkInput = {
  sellerKey: string;
  campaignId?: string;
  destinationUrl: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  label?: string;
  expiresAt?: string;
};

export type RecordEventInput = {
  sellerKey: string;
  eventType: TrackingEventType;
  utm?: UtmParams;
  sessionId?: string;
  visitorId?: string;
  customerId?: string;
  paymentId?: string;
  leadId?: string;
  linkId?: string;
  campaignId?: string;
  referrerUrl?: string;
  landingPage?: string;
  ipAddress?: string;
  userAgent?: string;
  revenueCents?: number;
  internalSource?: InternalSource;
  internalSourceId?: string;
  metadata?: Record<string, unknown>;
};

export type TrackingAnalytics = {
  totalEvents: number;
  totalClicks: number;
  totalConversions: number;
  totalRevenueCents: number;
  conversionRate: number;
  topSources: Array<{ source: string; clicks: number; conversions: number; revenue: number }>;
  topCampaigns: Array<{ id: string; name: string; clicks: number; conversions: number; revenue: number; roas: number }>;
  dailyStats: TrackingDailyStat[];
  channelBreakdown: Array<{ channel: string; events: number; conversions: number; revenue: number }>;
};

/* ── Row types ── */

type CampaignRow = {
  id: string;
  seller_key: string;
  name: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string | null;
  utm_term: string | null;
  cost_cents: number;
  total_clicks: number;
  total_unique_visitors: number;
  total_conversions: number;
  total_revenue_cents: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

type LinkRow = {
  id: string;
  seller_key: string;
  campaign_id: string | null;
  short_code: string;
  destination_url: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  label: string | null;
  total_clicks: number;
  total_unique_clicks: number;
  total_conversions: number;
  active: boolean;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

type DailyStatRow = {
  stat_date: string;
  seller_key: string;
  campaign_id: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  page_views: number;
  link_clicks: number;
  unique_visitors: number;
  checkout_starts: number;
  conversions: number;
  revenue_cents: number;
  cost_cents: number;
  click_through_rate: number;
  conversion_rate: number;
  cpa_cents: number;
  roas: number;
};

/* ── Helpers ── */

function generateShortCode(): string {
  return randomUUID().replace(/-/g, "").slice(0, 8);
}

function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex").slice(0, 16);
}

function detectDevice(ua?: string): "mobile" | "desktop" | "tablet" | undefined {
  if (!ua) return undefined;
  const lower = ua.toLowerCase();
  if (/ipad|tablet|kindle|silk/i.test(lower)) return "tablet";
  if (/mobile|iphone|android|phone/i.test(lower)) return "mobile";
  return "desktop";
}

function mapCampaignRow(r: CampaignRow): TrackingCampaign {
  return {
    id: r.id,
    sellerKey: r.seller_key,
    name: r.name,
    utmSource: r.utm_source,
    utmMedium: r.utm_medium,
    utmCampaign: r.utm_campaign,
    utmContent: r.utm_content ?? undefined,
    utmTerm: r.utm_term ?? undefined,
    costCents: r.cost_cents,
    totalClicks: r.total_clicks,
    totalUniqueVisitors: r.total_unique_visitors,
    totalConversions: r.total_conversions,
    totalRevenueCents: r.total_revenue_cents,
    active: r.active,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapLinkRow(r: LinkRow): TrackingLink {
  return {
    id: r.id,
    sellerKey: r.seller_key,
    campaignId: r.campaign_id ?? undefined,
    shortCode: r.short_code,
    destinationUrl: r.destination_url,
    utmSource: r.utm_source ?? undefined,
    utmMedium: r.utm_medium ?? undefined,
    utmCampaign: r.utm_campaign ?? undefined,
    utmContent: r.utm_content ?? undefined,
    utmTerm: r.utm_term ?? undefined,
    label: r.label ?? undefined,
    totalClicks: r.total_clicks,
    totalUniqueClicks: r.total_unique_clicks,
    totalConversions: r.total_conversions,
    active: r.active,
    expiresAt: r.expires_at ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapDailyStatRow(r: DailyStatRow): TrackingDailyStat {
  return {
    statDate: r.stat_date,
    sellerKey: r.seller_key,
    campaignId: r.campaign_id ?? undefined,
    utmSource: r.utm_source ?? undefined,
    utmMedium: r.utm_medium ?? undefined,
    utmCampaign: r.utm_campaign ?? undefined,
    pageViews: r.page_views,
    linkClicks: r.link_clicks,
    uniqueVisitors: r.unique_visitors,
    checkoutStarts: r.checkout_starts,
    conversions: r.conversions,
    revenueCents: r.revenue_cents,
    costCents: r.cost_cents,
    clickThroughRate: r.click_through_rate,
    conversionRate: r.conversion_rate,
    cpaCents: r.cpa_cents,
    roas: r.roas,
  };
}

/* ── Service ── */

export class TrackingService {
  private readonly supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(appEnv.supabaseUrl, appEnv.supabaseServiceRoleKey);
  }

  /* ── Events ── */

  async recordEvent(input: RecordEventInput): Promise<string> {
    const id = randomUUID();
    const ipHash = input.ipAddress ? hashIp(input.ipAddress) : undefined;
    const deviceType = detectDevice(input.userAgent);

    const { error } = await this.supabase.from("tracking_events").insert({
      id,
      seller_key: input.sellerKey,
      event_type: input.eventType,
      utm_source: input.utm?.utm_source ?? null,
      utm_medium: input.utm?.utm_medium ?? null,
      utm_campaign: input.utm?.utm_campaign ?? null,
      utm_content: input.utm?.utm_content ?? null,
      utm_term: input.utm?.utm_term ?? null,
      session_id: input.sessionId ?? null,
      visitor_id: input.visitorId ?? null,
      customer_id: input.customerId ?? null,
      payment_id: input.paymentId ?? null,
      lead_id: input.leadId ?? null,
      link_id: input.linkId ?? null,
      campaign_id: input.campaignId ?? null,
      referrer_url: input.referrerUrl ?? null,
      landing_page: input.landingPage ?? null,
      ip_hash: ipHash ?? null,
      user_agent: input.userAgent?.slice(0, 500) ?? null,
      device_type: deviceType ?? null,
      revenue_cents: input.revenueCents ?? 0,
      internal_source: input.internalSource ?? null,
      internal_source_id: input.internalSourceId ?? null,
      metadata: input.metadata ?? {},
    });

    if (error) {
      console.error("[TrackingService] recordEvent error:", error.message);
    }

    // Increment link click counter if link_id present
    if (input.linkId && (input.eventType === "link_click" || input.eventType === "page_view")) {
      await this.supabase.rpc("increment_counter", {
        table_name: "tracking_links",
        row_id: input.linkId,
        column_name: "total_clicks",
      }).then(() => {}, () => {
        // Fallback: manual increment
        this.supabase
          .from("tracking_links")
          .select("total_clicks")
          .eq("id", input.linkId!)
          .single()
          .then(({ data }) => {
            if (data) {
              this.supabase
                .from("tracking_links")
                .update({ total_clicks: (data.total_clicks ?? 0) + 1, updated_at: new Date().toISOString() })
                .eq("id", input.linkId!)
                .then(() => {}, () => {});
            }
          });
      });
    }

    return id;
  }

  /**
   * Record a conversion event and attribute revenue.
   * Called when a payment is recovered, upsell accepted, etc.
   */
  async attributeConversion(input: {
    sellerKey: string;
    eventType: TrackingEventType;
    customerId?: string;
    paymentId?: string;
    leadId?: string;
    revenueCents: number;
    internalSource?: InternalSource;
    internalSourceId?: string;
  }): Promise<void> {
    // Find the most recent tracking event for this customer/lead to get UTM attribution
    let utm: UtmParams = {};
    let campaignId: string | undefined;
    let linkId: string | undefined;
    let sessionId: string | undefined;
    let visitorId: string | undefined;

    if (input.customerId || input.leadId) {
      const query = this.supabase
        .from("tracking_events")
        .select("utm_source, utm_medium, utm_campaign, utm_content, utm_term, campaign_id, link_id, session_id, visitor_id")
        .eq("seller_key", input.sellerKey)
        .in("event_type", ["link_click", "page_view", "checkout_start"])
        .order("created_at", { ascending: false })
        .limit(1);

      if (input.customerId) {
        query.eq("customer_id", input.customerId);
      } else if (input.leadId) {
        query.eq("lead_id", input.leadId);
      }

      const { data } = await query.maybeSingle();

      if (data) {
        utm = {
          utm_source: data.utm_source ?? undefined,
          utm_medium: data.utm_medium ?? undefined,
          utm_campaign: data.utm_campaign ?? undefined,
          utm_content: data.utm_content ?? undefined,
          utm_term: data.utm_term ?? undefined,
        };
        campaignId = data.campaign_id ?? undefined;
        linkId = data.link_id ?? undefined;
        sessionId = data.session_id ?? undefined;
        visitorId = data.visitor_id ?? undefined;
      }
    }

    await this.recordEvent({
      sellerKey: input.sellerKey,
      eventType: input.eventType,
      utm,
      customerId: input.customerId,
      paymentId: input.paymentId,
      leadId: input.leadId,
      campaignId,
      linkId,
      sessionId,
      visitorId,
      revenueCents: input.revenueCents,
      internalSource: input.internalSource,
      internalSourceId: input.internalSourceId,
    });

    // Update campaign totals
    if (campaignId) {
      const { data: campaign } = await this.supabase
        .from("tracking_campaigns")
        .select("total_conversions, total_revenue_cents")
        .eq("id", campaignId)
        .single();

      if (campaign) {
        await this.supabase
          .from("tracking_campaigns")
          .update({
            total_conversions: (campaign.total_conversions ?? 0) + 1,
            total_revenue_cents: (campaign.total_revenue_cents ?? 0) + input.revenueCents,
            updated_at: new Date().toISOString(),
          })
          .eq("id", campaignId);
      }
    }

    // Update link conversions
    if (linkId) {
      const { data: link } = await this.supabase
        .from("tracking_links")
        .select("total_conversions")
        .eq("id", linkId)
        .single();

      if (link) {
        await this.supabase
          .from("tracking_links")
          .update({
            total_conversions: (link.total_conversions ?? 0) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq("id", linkId);
      }
    }
  }

  /* ── Campaigns ── */

  async createCampaign(input: CreateCampaignInput): Promise<TrackingCampaign> {
    const id = randomUUID();

    const { data, error } = await this.supabase
      .from("tracking_campaigns")
      .insert({
        id,
        seller_key: input.sellerKey,
        name: input.name,
        utm_source: input.utmSource,
        utm_medium: input.utmMedium,
        utm_campaign: input.utmCampaign,
        utm_content: input.utmContent ?? null,
        utm_term: input.utmTerm ?? null,
        cost_cents: input.costCents ?? 0,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create campaign: ${error.message}`);
    return mapCampaignRow(data as CampaignRow);
  }

  async listCampaigns(sellerKey?: string): Promise<TrackingCampaign[]> {
    let query = this.supabase
      .from("tracking_campaigns")
      .select("*")
      .order("created_at", { ascending: false });

    if (sellerKey) query = query.eq("seller_key", sellerKey);

    const { data, error } = await query;
    if (error) return [];
    return (data as CampaignRow[]).map(mapCampaignRow);
  }

  async getCampaign(id: string): Promise<TrackingCampaign | null> {
    const { data } = await this.supabase
      .from("tracking_campaigns")
      .select("*")
      .eq("id", id)
      .single();

    return data ? mapCampaignRow(data as CampaignRow) : null;
  }

  async updateCampaign(id: string, updates: Partial<{
    name: string;
    costCents: number;
    active: boolean;
  }>): Promise<void> {
    const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (updates.name !== undefined) row.name = updates.name;
    if (updates.costCents !== undefined) row.cost_cents = updates.costCents;
    if (updates.active !== undefined) row.active = updates.active;

    await this.supabase.from("tracking_campaigns").update(row).eq("id", id);
  }

  /* ── Links ── */

  async createLink(input: CreateLinkInput): Promise<TrackingLink> {
    const id = randomUUID();
    const shortCode = generateShortCode();

    const { data, error } = await this.supabase
      .from("tracking_links")
      .insert({
        id,
        seller_key: input.sellerKey,
        campaign_id: input.campaignId ?? null,
        short_code: shortCode,
        destination_url: input.destinationUrl,
        utm_source: input.utmSource ?? null,
        utm_medium: input.utmMedium ?? null,
        utm_campaign: input.utmCampaign ?? null,
        utm_content: input.utmContent ?? null,
        utm_term: input.utmTerm ?? null,
        label: input.label ?? null,
        expires_at: input.expiresAt ?? null,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create link: ${error.message}`);
    return mapLinkRow(data as LinkRow);
  }

  async resolveShortLink(shortCode: string): Promise<TrackingLink | null> {
    const { data } = await this.supabase
      .from("tracking_links")
      .select("*")
      .eq("short_code", shortCode)
      .eq("active", true)
      .single();

    if (!data) return null;

    const link = mapLinkRow(data as LinkRow);

    // Check expiry
    if (link.expiresAt && new Date(link.expiresAt) < new Date()) return null;

    return link;
  }

  async listLinks(sellerKey?: string, campaignId?: string): Promise<TrackingLink[]> {
    let query = this.supabase
      .from("tracking_links")
      .select("*")
      .order("created_at", { ascending: false });

    if (sellerKey) query = query.eq("seller_key", sellerKey);
    if (campaignId) query = query.eq("campaign_id", campaignId);

    const { data } = await query;
    return (data as LinkRow[] | null)?.map(mapLinkRow) ?? [];
  }

  /* ── Analytics ── */

  async getAnalytics(sellerKey?: string, days: number = 30): Promise<TrackingAnalytics> {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceIso = since.toISOString();

    // Total events by type
    let eventsQuery = this.supabase
      .from("tracking_events")
      .select("event_type, revenue_cents, utm_source, utm_medium, internal_source, campaign_id")
      .gte("created_at", sinceIso);

    if (sellerKey) eventsQuery = eventsQuery.eq("seller_key", sellerKey);

    const { data: events } = await eventsQuery;
    const allEvents = events ?? [];

    const totalEvents = allEvents.length;
    const clicks = allEvents.filter(e => e.event_type === "link_click" || e.event_type === "page_view");
    const conversions = allEvents.filter(e =>
      ["payment_completed", "recovery_completed", "cart_recovered", "upsell_accepted", "reactivation_completed", "subscription_renewed"].includes(e.event_type)
    );
    const totalClicks = clicks.length;
    const totalConversions = conversions.length;
    const totalRevenueCents = conversions.reduce((sum, e) => sum + (e.revenue_cents ?? 0), 0);
    const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

    // Top sources
    const sourceMap = new Map<string, { clicks: number; conversions: number; revenue: number }>();
    for (const e of allEvents) {
      const source = e.utm_source || e.internal_source || "direct";
      const entry = sourceMap.get(source) ?? { clicks: 0, conversions: 0, revenue: 0 };
      if (e.event_type === "link_click" || e.event_type === "page_view") entry.clicks++;
      if (["payment_completed", "recovery_completed", "cart_recovered", "upsell_accepted", "reactivation_completed", "subscription_renewed"].includes(e.event_type)) {
        entry.conversions++;
        entry.revenue += e.revenue_cents ?? 0;
      }
      sourceMap.set(source, entry);
    }
    const topSources = [...sourceMap.entries()]
      .map(([source, data]) => ({ source, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Top campaigns
    const campaignMap = new Map<string, { clicks: number; conversions: number; revenue: number }>();
    for (const e of allEvents) {
      if (!e.campaign_id) continue;
      const entry = campaignMap.get(e.campaign_id) ?? { clicks: 0, conversions: 0, revenue: 0 };
      if (e.event_type === "link_click" || e.event_type === "page_view") entry.clicks++;
      if (["payment_completed", "recovery_completed", "cart_recovered", "upsell_accepted", "reactivation_completed", "subscription_renewed"].includes(e.event_type)) {
        entry.conversions++;
        entry.revenue += e.revenue_cents ?? 0;
      }
      campaignMap.set(e.campaign_id, entry);
    }

    // Fetch campaign names
    const campaignIds = [...campaignMap.keys()];
    let campaignNames = new Map<string, string>();
    if (campaignIds.length > 0) {
      const { data: campaigns } = await this.supabase
        .from("tracking_campaigns")
        .select("id, name, cost_cents")
        .in("id", campaignIds);

      if (campaigns) {
        for (const c of campaigns) {
          campaignNames.set(c.id, c.name);
        }
      }
    }

    const topCampaigns = [...campaignMap.entries()]
      .map(([id, data]) => ({
        id,
        name: campaignNames.get(id) ?? id.slice(0, 8),
        ...data,
        roas: 0, // Will be calculated with cost data
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Channel breakdown (internal_source)
    const channelMap = new Map<string, { events: number; conversions: number; revenue: number }>();
    for (const e of allEvents) {
      const channel = e.utm_medium || e.internal_source || "direct";
      const entry = channelMap.get(channel) ?? { events: 0, conversions: 0, revenue: 0 };
      entry.events++;
      if (["payment_completed", "recovery_completed", "cart_recovered", "upsell_accepted", "reactivation_completed", "subscription_renewed"].includes(e.event_type)) {
        entry.conversions++;
        entry.revenue += e.revenue_cents ?? 0;
      }
      channelMap.set(channel, entry);
    }
    const channelBreakdown = [...channelMap.entries()]
      .map(([channel, data]) => ({ channel, ...data }))
      .sort((a, b) => b.revenue - a.revenue);

    // Daily stats (pre-aggregated)
    let dailyQuery = this.supabase
      .from("tracking_daily_stats")
      .select("*")
      .gte("stat_date", since.toISOString().split("T")[0])
      .order("stat_date", { ascending: true });

    if (sellerKey) dailyQuery = dailyQuery.eq("seller_key", sellerKey);

    const { data: dailyData } = await dailyQuery;
    const dailyStats = (dailyData as DailyStatRow[] | null)?.map(mapDailyStatRow) ?? [];

    return {
      totalEvents,
      totalClicks,
      totalConversions,
      totalRevenueCents,
      conversionRate,
      topSources,
      topCampaigns,
      dailyStats,
      channelBreakdown,
    };
  }

  /**
   * Aggregate daily stats from raw events.
   * Called by cron job or manually.
   */
  async aggregateDailyStats(date?: string): Promise<void> {
    const targetDate = date ?? new Date().toISOString().split("T")[0];
    const startOfDay = `${targetDate}T00:00:00.000Z`;
    const endOfDay = `${targetDate}T23:59:59.999Z`;

    const { data: events } = await this.supabase
      .from("tracking_events")
      .select("seller_key, campaign_id, utm_source, utm_medium, utm_campaign, event_type, visitor_id, revenue_cents")
      .gte("created_at", startOfDay)
      .lte("created_at", endOfDay);

    if (!events || events.length === 0) return;

    // Group by seller + campaign + utm
    const groups = new Map<string, {
      seller_key: string;
      campaign_id: string | null;
      utm_source: string | null;
      utm_medium: string | null;
      utm_campaign: string | null;
      page_views: number;
      link_clicks: number;
      visitors: Set<string>;
      checkout_starts: number;
      conversions: number;
      revenue_cents: number;
    }>();

    for (const e of events) {
      const key = `${e.seller_key}|${e.campaign_id ?? ""}|${e.utm_source ?? ""}|${e.utm_medium ?? ""}|${e.utm_campaign ?? ""}`;
      const group = groups.get(key) ?? {
        seller_key: e.seller_key,
        campaign_id: e.campaign_id,
        utm_source: e.utm_source,
        utm_medium: e.utm_medium,
        utm_campaign: e.utm_campaign,
        page_views: 0,
        link_clicks: 0,
        visitors: new Set<string>(),
        checkout_starts: 0,
        conversions: 0,
        revenue_cents: 0,
      };

      if (e.event_type === "page_view") group.page_views++;
      if (e.event_type === "link_click") group.link_clicks++;
      if (e.event_type === "checkout_start") group.checkout_starts++;
      if (["payment_completed", "recovery_completed", "cart_recovered", "upsell_accepted", "reactivation_completed", "subscription_renewed"].includes(e.event_type)) {
        group.conversions++;
        group.revenue_cents += e.revenue_cents ?? 0;
      }
      if (e.visitor_id) group.visitors.add(e.visitor_id);

      groups.set(key, group);
    }

    // Upsert daily stats
    for (const group of groups.values()) {
      const totalImpressions = group.page_views + group.link_clicks;
      const uniqueVisitors = group.visitors.size;
      const conversionRate = totalImpressions > 0 ? (group.conversions / totalImpressions) * 100 : 0;

      // Get campaign cost for ROAS/CPA
      let costCents = 0;
      if (group.campaign_id) {
        const { data: campaign } = await this.supabase
          .from("tracking_campaigns")
          .select("cost_cents")
          .eq("id", group.campaign_id)
          .single();
        costCents = campaign?.cost_cents ?? 0;
      }

      const cpaCents = group.conversions > 0 && costCents > 0 ? Math.round(costCents / group.conversions) : 0;
      const roas = costCents > 0 ? group.revenue_cents / costCents : 0;
      const ctr = totalImpressions > 0 ? (group.link_clicks / totalImpressions) * 100 : 0;

      await this.supabase.from("tracking_daily_stats").upsert({
        stat_date: targetDate,
        seller_key: group.seller_key,
        campaign_id: group.campaign_id,
        utm_source: group.utm_source,
        utm_medium: group.utm_medium,
        utm_campaign: group.utm_campaign,
        page_views: group.page_views,
        link_clicks: group.link_clicks,
        unique_visitors: uniqueVisitors,
        checkout_starts: group.checkout_starts,
        conversions: group.conversions,
        revenue_cents: group.revenue_cents,
        cost_cents: costCents,
        click_through_rate: ctr,
        conversion_rate: conversionRate,
        cpa_cents: cpaCents,
        roas,
      }, {
        onConflict: "stat_date,seller_key,campaign_id,utm_source,utm_medium,utm_campaign",
      });
    }
  }

  /* ── UTM URL builder ── */

  /**
   * Append UTM parameters to a URL.
   * Used by messaging service when generating recovery links.
   */
  buildTrackedUrl(baseUrl: string, utm: UtmParams): string {
    const url = new URL(baseUrl);
    if (utm.utm_source) url.searchParams.set("utm_source", utm.utm_source);
    if (utm.utm_medium) url.searchParams.set("utm_medium", utm.utm_medium);
    if (utm.utm_campaign) url.searchParams.set("utm_campaign", utm.utm_campaign);
    if (utm.utm_content) url.searchParams.set("utm_content", utm.utm_content);
    if (utm.utm_term) url.searchParams.set("utm_term", utm.utm_term);
    return url.toString();
  }

  /**
   * Extract UTM parameters from a URL's query string.
   */
  extractUtmFromUrl(url: string): UtmParams {
    try {
      const parsed = new URL(url);
      return {
        utm_source: parsed.searchParams.get("utm_source") ?? undefined,
        utm_medium: parsed.searchParams.get("utm_medium") ?? undefined,
        utm_campaign: parsed.searchParams.get("utm_campaign") ?? undefined,
        utm_content: parsed.searchParams.get("utm_content") ?? undefined,
        utm_term: parsed.searchParams.get("utm_term") ?? undefined,
      };
    } catch {
      return {};
    }
  }

  /**
   * Extract UTM params from a flat Record (e.g. Next.js searchParams).
   */
  extractUtmFromParams(params: Record<string, string | string[] | undefined>): UtmParams {
    const get = (key: string) => {
      const v = params[key];
      return typeof v === "string" ? v : Array.isArray(v) ? v[0] : undefined;
    };
    return {
      utm_source: get("utm_source"),
      utm_medium: get("utm_medium"),
      utm_campaign: get("utm_campaign"),
      utm_content: get("utm_content"),
      utm_term: get("utm_term"),
    };
  }
}

/* ── Singleton ── */

declare global {
  var __trackingService__: TrackingService | undefined;
}

export function getTrackingService(): TrackingService {
  if (!globalThis.__trackingService__) {
    globalThis.__trackingService__ = new TrackingService();
  }
  return globalThis.__trackingService__;
}
