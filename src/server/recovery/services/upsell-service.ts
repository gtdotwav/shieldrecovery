import { randomUUID } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { appEnv } from "@/server/recovery/config";
import { createStructuredLog } from "@/server/recovery/utils/structured-logger";

/* ── Types ── */

type UpsellTrigger = "post_payment" | "post_recovery" | "post_checkout" | "manual";

type UpsellRuleRow = {
  id: string;
  seller_key: string | null;
  trigger: string;
  source_product: string | null;
  offer_product: string;
  offer_description: string;
  discount_percent: number;
  checkout_url: string;
  active: boolean;
  priority: number;
  max_offers_per_customer: number;
  created_at: string;
  updated_at: string;
};

type UpsellOfferRow = {
  id: string;
  rule_id: string;
  customer_id: string;
  customer_phone: string | null;
  original_product: string | null;
  original_value: number | null;
  offer_product: string;
  offer_description: string;
  discount_percent: number;
  checkout_url: string;
  status: string;
  offered_at: string;
  responded_at: string | null;
  created_at: string;
};

export type UpsellRule = {
  id: string;
  sellerKey: string | null;
  trigger: UpsellTrigger;
  sourceProduct: string | null;
  offerProduct: string;
  offerDescription: string;
  discountPercent: number;
  checkoutUrl: string;
  active: boolean;
  priority: number;
  maxOffersPerCustomer: number;
  createdAt: string;
  updatedAt: string;
};

export type UpsellOffer = {
  id: string;
  ruleId: string;
  customerId: string;
  customerPhone: string | null;
  originalProduct: string | null;
  originalValue: number | null;
  offerProduct: string;
  offerDescription: string;
  discountPercent: number;
  checkoutUrl: string;
  status: "pending" | "accepted" | "declined" | "expired";
  offeredAt: string;
  respondedAt: string | null;
  createdAt: string;
};

export type CreateRuleInput = {
  sellerKey?: string;
  trigger: UpsellTrigger;
  sourceProduct?: string;
  offerProduct: string;
  offerDescription: string;
  discountPercent?: number;
  checkoutUrl: string;
  priority?: number;
  maxOffersPerCustomer?: number;
};

export type UpsellAnalytics = {
  totalOffered: number;
  totalAccepted: number;
  totalDeclined: number;
  totalExpired: number;
  conversionRate: number;
  estimatedRevenue: number;
};

/* ── Row mapping ── */

function rowToRule(row: UpsellRuleRow): UpsellRule {
  return {
    id: row.id,
    sellerKey: row.seller_key,
    trigger: row.trigger as UpsellTrigger,
    sourceProduct: row.source_product,
    offerProduct: row.offer_product,
    offerDescription: row.offer_description,
    discountPercent: row.discount_percent,
    checkoutUrl: row.checkout_url,
    active: row.active,
    priority: row.priority,
    maxOffersPerCustomer: row.max_offers_per_customer,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToOffer(row: UpsellOfferRow): UpsellOffer {
  return {
    id: row.id,
    ruleId: row.rule_id,
    customerId: row.customer_id,
    customerPhone: row.customer_phone,
    originalProduct: row.original_product,
    originalValue: row.original_value,
    offerProduct: row.offer_product,
    offerDescription: row.offer_description,
    discountPercent: row.discount_percent,
    checkoutUrl: row.checkout_url,
    status: row.status as UpsellOffer["status"],
    offeredAt: row.offered_at,
    respondedAt: row.responded_at,
    createdAt: row.created_at,
  };
}

/* ── Service ── */

export class UpsellService {
  private readonly supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(appEnv.supabaseUrl, appEnv.supabaseServiceRoleKey);
  }

  async createRule(rawInput: CreateRuleInput | unknown): Promise<UpsellRule> {
    const input = rawInput as CreateRuleInput;
    const now = new Date().toISOString();
    const row: UpsellRuleRow = {
      id: randomUUID(),
      seller_key: input.sellerKey ?? null,
      trigger: input.trigger,
      source_product: input.sourceProduct ?? null,
      offer_product: input.offerProduct,
      offer_description: input.offerDescription,
      discount_percent: input.discountPercent ?? 0,
      checkout_url: input.checkoutUrl,
      active: true,
      priority: input.priority ?? 0,
      max_offers_per_customer: input.maxOffersPerCustomer ?? 1,
      created_at: now,
      updated_at: now,
    };

    const { error } = await this.supabase.from("upsell_rules").insert(row);
    if (error) throw new Error(`Failed to create upsell rule: ${error.message}`);

    return rowToRule(row);
  }

  async updateRule(
    id: string,
    input: Partial<Omit<CreateRuleInput, "sellerKey">>,
  ): Promise<UpsellRule> {
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (input.trigger !== undefined) updates.trigger = input.trigger;
    if (input.sourceProduct !== undefined) updates.source_product = input.sourceProduct;
    if (input.offerProduct !== undefined) updates.offer_product = input.offerProduct;
    if (input.offerDescription !== undefined) updates.offer_description = input.offerDescription;
    if (input.discountPercent !== undefined) updates.discount_percent = input.discountPercent;
    if (input.checkoutUrl !== undefined) updates.checkout_url = input.checkoutUrl;
    if (input.priority !== undefined) updates.priority = input.priority;
    if (input.maxOffersPerCustomer !== undefined) updates.max_offers_per_customer = input.maxOffersPerCustomer;

    const { data, error } = await this.supabase
      .from("upsell_rules")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error || !data) throw new Error(`Failed to update upsell rule: ${error?.message ?? "not found"}`);

    return rowToRule(data as UpsellRuleRow);
  }

  async listRules(
    opts?: string | { sellerKey?: string; active?: boolean },
  ): Promise<UpsellRule[]> {
    const sellerKey = typeof opts === "string" ? opts : opts?.sellerKey;
    const active = typeof opts === "object" ? opts?.active : undefined;

    let query = this.supabase.from("upsell_rules").select("*").order("priority", { ascending: false });

    if (sellerKey) {
      query = query.or(`seller_key.eq.${sellerKey},seller_key.is.null`);
    }
    if (active !== undefined) {
      query = query.eq("active", active);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Failed to list upsell rules: ${error.message}`);

    return (data as UpsellRuleRow[]).map(rowToRule);
  }

  async evaluateUpsell(input: {
    trigger: UpsellTrigger;
    customerId: string;
    customerPhone?: string;
    productName?: string;
    value?: number;
    sellerKey?: string;
  }): Promise<UpsellOffer | null> {
    try {
      const rules = await this.listRules(input.sellerKey);
      const matching = rules.filter(
        (r) =>
          r.active &&
          r.trigger === input.trigger &&
          (!r.sourceProduct || r.sourceProduct === input.productName),
      );

      if (matching.length === 0) return null;

      // Batch: get offer counts for all matching rule IDs in one query
      const ruleIds = matching.map((r) => r.id);
      const { data: offerCounts } = await this.supabase
        .from("upsell_offers")
        .select("rule_id")
        .in("rule_id", ruleIds)
        .eq("customer_id", input.customerId);

      const countMap = new Map<string, number>();
      for (const row of offerCounts || []) {
        countMap.set(row.rule_id, (countMap.get(row.rule_id) || 0) + 1);
      }

      // Find first eligible rule and create offer
      for (const rule of matching) {
        if ((countMap.get(rule.id) || 0) >= rule.maxOffersPerCustomer) continue;

        // Create offer
        const offerRow: UpsellOfferRow = {
          id: randomUUID(),
          rule_id: rule.id,
          customer_id: input.customerId,
          customer_phone: input.customerPhone ?? null,
          original_product: input.productName ?? null,
          original_value: input.value ?? null,
          offer_product: rule.offerProduct,
          offer_description: rule.offerDescription,
          discount_percent: rule.discountPercent,
          checkout_url: rule.checkoutUrl,
          status: "pending",
          offered_at: new Date().toISOString(),
          responded_at: null,
          created_at: new Date().toISOString(),
        };

        const { error } = await this.supabase.from("upsell_offers").insert(offerRow);
        if (error) {
          console.error(`[UpsellService] Failed to create offer: ${error.message}`);
          continue;
        }

        return rowToOffer(offerRow);
      }

      return null;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error(`[UpsellService] evaluateUpsell failed: ${message}`);
      return null;
    }
  }

  async processOffer(
    offerId: string,
    action: "accept" | "decline",
  ): Promise<UpsellOffer> {
    const status = action === "accept" ? "accepted" : "declined";

    const { data, error } = await this.supabase
      .from("upsell_offers")
      .update({ status, responded_at: new Date().toISOString() })
      .eq("id", offerId)
      .eq("status", "pending")
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to process offer: ${error?.message ?? "offer not found or already processed"}`);
    }

    await this.supabase.from("system_logs").insert(
      createStructuredLog({
        eventType: "upsell",
        level: "info",
        message: `Upsell offer ${status}: ${offerId}`,
        context: { offerId, action, product: data.offer_product },
      }),
    );

    return rowToOffer(data as UpsellOfferRow);
  }

  async triggerPostPaymentUpsell(paymentEvent: {
    customerId: string;
    customerPhone?: string;
    productName?: string;
    value?: number;
    sellerKey?: string;
  }): Promise<UpsellOffer | null> {
    const offer = await this.evaluateUpsell({
      trigger: "post_payment",
      ...paymentEvent,
    });

    if (!offer || !offer.customerPhone) return offer;

    // Send offer via WhatsApp Cloud API
    try {
      const message = this.buildOfferMessage(offer);

      await fetch(`https://graph.facebook.com/v22.0/${appEnv.whatsappPhoneNumberId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${appEnv.whatsappAccessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: offer.customerPhone,
          type: "text",
          text: { body: message },
        }),
        signal: AbortSignal.timeout(10_000),
      });
    } catch (err) {
      console.error(`[UpsellService] Failed to send WhatsApp offer: ${err}`);
    }

    return offer;
  }

  async getAnalytics(opts?: { sellerKey?: string }): Promise<UpsellAnalytics> {
    return this.getUpsellAnalytics(opts?.sellerKey);
  }

  async listRecentOffers(opts?: { sellerKey?: string; limit?: number }): Promise<UpsellOffer[]> {
    let query = this.supabase
      .from("upsell_offers")
      .select("*")
      .order("offered_at", { ascending: false })
      .limit(opts?.limit ?? 50);

    if (opts?.sellerKey) {
      const ruleIds = await this.supabase
        .from("upsell_rules")
        .select("id")
        .or(`seller_key.eq.${opts.sellerKey},seller_key.is.null`);

      if (ruleIds.data?.length) {
        query = query.in("rule_id", ruleIds.data.map((r) => r.id));
      }
    }

    const { data } = await query;
    return (data as UpsellOfferRow[] | null)?.map(rowToOffer) ?? [];
  }

  async getUpsellAnalytics(sellerKey?: string): Promise<UpsellAnalytics> {
    let query = this.supabase.from("upsell_offers").select("status, original_value");

    if (sellerKey) {
      const ruleIds = await this.supabase
        .from("upsell_rules")
        .select("id")
        .or(`seller_key.eq.${sellerKey},seller_key.is.null`);

      if (ruleIds.data?.length) {
        const ids = ruleIds.data.map((r) => r.id);
        query = query.in("rule_id", ids);
      }
    }

    const { data } = await query;
    const offers = data ?? [];

    const totalOffered = offers.length;
    const totalAccepted = offers.filter((o) => o.status === "accepted").length;
    const totalDeclined = offers.filter((o) => o.status === "declined").length;
    const totalExpired = offers.filter((o) => o.status === "expired").length;
    const estimatedRevenue = offers
      .filter((o) => o.status === "accepted")
      .reduce((sum, o) => sum + (o.original_value ?? 0), 0);

    return {
      totalOffered,
      totalAccepted,
      totalDeclined,
      totalExpired,
      conversionRate: totalOffered > 0 ? totalAccepted / totalOffered : 0,
      estimatedRevenue,
    };
  }

  private buildOfferMessage(offer: UpsellOffer): string {
    const discount = offer.discountPercent > 0 ? ` com ${offer.discountPercent}% de desconto` : "";
    return [
      `Opa! Vimos que voce acabou de finalizar uma compra. 🎉`,
      ``,
      `Temos uma oferta especial pra voce: *${offer.offerProduct}*${discount}!`,
      ``,
      offer.offerDescription,
      ``,
      `Aproveite agora: ${offer.checkoutUrl}`,
    ].join("\n");
  }
}

/* ── Singleton ── */

declare global {
  var __upsellService__: UpsellService | undefined;
}

export function getUpsellService(): UpsellService {
  if (!globalThis.__upsellService__) {
    globalThis.__upsellService__ = new UpsellService();
  }
  return globalThis.__upsellService__;
}
