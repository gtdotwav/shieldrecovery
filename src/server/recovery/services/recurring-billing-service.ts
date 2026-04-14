import { randomUUID } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { appEnv } from "@/server/recovery/config";
import { MessagingService } from "@/server/recovery/services/messaging-service";
import { getStorageService } from "@/server/recovery/services/storage";
import { createStructuredLog } from "@/server/recovery/utils/structured-logger";

/* ── Types ── */

type SubscriptionStatus = "active" | "paused" | "canceled" | "past_due";
type InvoiceStatus = "pending" | "paid" | "failed" | "void";
type DunningChannel = "whatsapp" | "email" | "sms" | "voice";

type SubscriptionRecord = {
  id: string;
  sellerKey: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  planName: string;
  amount: number;
  currency: string;
  intervalDays: number;
  nextDueDate: string;
  status: SubscriptionStatus;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
  canceledAt: string | null;
  pausedAt: string | null;
};

type InvoiceRecord = {
  id: string;
  subscriptionId: string;
  sellerKey: string;
  amount: number;
  currency: string;
  dueDate: string;
  status: InvoiceStatus;
  dunningStep: number;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type DunningRuleRecord = {
  id: string;
  sellerKey: string;
  step: number;
  delayDays: number;
  channel: DunningChannel;
  messageTemplate: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateSubscriptionInput = {
  sellerKey: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  planName: string;
  amount: number;
  currency?: string;
  intervalDays: number;
  nextDueDate: string;
};

export type CreateDunningRuleInput = {
  sellerKey: string;
  step: number;
  delayDays: number;
  channel: DunningChannel;
  messageTemplate: string;
};

type SubscriptionAnalytics = {
  totalActive: number;
  totalPaused: number;
  totalCanceled: number;
  mrr: number;
  churnRate: number;
  dunningSuccessRate: number;
  openInvoices: number;
  failedInvoices: number;
};

/* ── DB row types ── */

type DatabaseSubscriptionRow = {
  id: string;
  seller_key: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  plan_name: string;
  amount: number;
  currency: string;
  interval_days: number;
  next_due_date: string;
  status: SubscriptionStatus;
  cancel_reason: string | null;
  created_at: string;
  updated_at: string;
  canceled_at: string | null;
  paused_at: string | null;
};

type DatabaseInvoiceRow = {
  id: string;
  subscription_id: string;
  seller_key: string;
  amount: number;
  currency: string;
  due_date: string;
  status: InvoiceStatus;
  dunning_step: number;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
};

type DatabaseDunningRuleRow = {
  id: string;
  seller_key: string;
  step: number;
  delay_days: number;
  channel: DunningChannel;
  message_template: string;
  created_at: string;
  updated_at: string;
};

/* ── Mappers ── */

function mapSubscription(row: DatabaseSubscriptionRow): SubscriptionRecord {
  return {
    id: row.id,
    sellerKey: row.seller_key,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    customerEmail: row.customer_email,
    planName: row.plan_name,
    amount: row.amount,
    currency: row.currency,
    intervalDays: row.interval_days,
    nextDueDate: row.next_due_date,
    status: row.status,
    cancelReason: row.cancel_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    canceledAt: row.canceled_at,
    pausedAt: row.paused_at,
  };
}

function mapInvoice(row: DatabaseInvoiceRow): InvoiceRecord {
  return {
    id: row.id,
    subscriptionId: row.subscription_id,
    sellerKey: row.seller_key,
    amount: row.amount,
    currency: row.currency,
    dueDate: row.due_date,
    status: row.status,
    dunningStep: row.dunning_step,
    paidAt: row.paid_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDunningRule(row: DatabaseDunningRuleRow): DunningRuleRecord {
  return {
    id: row.id,
    sellerKey: row.seller_key,
    step: row.step,
    delayDays: row.delay_days,
    channel: row.channel,
    messageTemplate: row.message_template,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/* ── Service ── */

export class RecurringBillingService {
  private readonly supabase: SupabaseClient;
  private readonly messaging = new MessagingService();
  private readonly storage = getStorageService();

  constructor() {
    this.supabase = createClient(appEnv.supabaseUrl, appEnv.supabaseServiceRoleKey);
  }

  async createSubscription(
    input: CreateSubscriptionInput,
  ): Promise<SubscriptionRecord> {
    const now = new Date().toISOString();
    const id = randomUUID();

    const row: DatabaseSubscriptionRow = {
      id,
      seller_key: input.sellerKey,
      customer_name: input.customerName,
      customer_phone: input.customerPhone,
      customer_email: input.customerEmail,
      plan_name: input.planName,
      amount: input.amount,
      currency: input.currency ?? "BRL",
      interval_days: input.intervalDays,
      next_due_date: input.nextDueDate,
      status: "active",
      cancel_reason: null,
      created_at: now,
      updated_at: now,
      canceled_at: null,
      paused_at: null,
    };

    const { error } = await this.supabase
      .from("subscriptions")
      .insert(row);

    if (error) {
      createStructuredLog({
        eventType: "processing_error",
        level: "error",
        message: "Failed to create subscription.",
        context: { id, error: error.message },
      });
      throw new Error(`Failed to create subscription: ${error.message}`);
    }

    createStructuredLog({
      eventType: "recovery_started",
      level: "info",
      message: "Subscription created.",
      context: { id, sellerKey: input.sellerKey, planName: input.planName },
    });

    return mapSubscription(row);
  }

  async cancelSubscription(
    id: string,
    reason?: string,
  ): Promise<SubscriptionRecord | undefined> {
    const now = new Date().toISOString();

    const { data, error } = await this.supabase
      .from("subscriptions")
      .update({
        status: "canceled",
        cancel_reason: reason ?? null,
        canceled_at: now,
        updated_at: now,
      })
      .eq("id", id)
      .select("*")
      .maybeSingle();

    if (error || !data) return undefined;

    createStructuredLog({
      eventType: "recovery_started",
      level: "info",
      message: "Subscription canceled.",
      context: { id, reason: reason ?? null },
    });

    return mapSubscription(data as DatabaseSubscriptionRow);
  }

  async pauseSubscription(id: string): Promise<SubscriptionRecord | undefined> {
    const now = new Date().toISOString();

    const { data, error } = await this.supabase
      .from("subscriptions")
      .update({ status: "paused", paused_at: now, updated_at: now })
      .eq("id", id)
      .in("status", ["active", "past_due"])
      .select("*")
      .maybeSingle();

    if (error || !data) return undefined;
    return mapSubscription(data as DatabaseSubscriptionRow);
  }

  async resumeSubscription(id: string): Promise<SubscriptionRecord | undefined> {
    const now = new Date().toISOString();

    const { data, error } = await this.supabase
      .from("subscriptions")
      .update({ status: "active", paused_at: null, updated_at: now })
      .eq("id", id)
      .eq("status", "paused")
      .select("*")
      .maybeSingle();

    if (error || !data) return undefined;
    return mapSubscription(data as DatabaseSubscriptionRow);
  }

  async processInvoices(): Promise<{ generated: number }> {
    const today = new Date().toISOString().split("T")[0];

    const { data: dueSubs, error } = await this.supabase
      .from("subscriptions")
      .select("*")
      .eq("status", "active")
      .lte("next_due_date", today);

    if (error || !dueSubs?.length) return { generated: 0 };

    let generated = 0;

    for (const subRow of dueSubs as DatabaseSubscriptionRow[]) {
      const { data: existing } = await this.supabase
        .from("subscription_invoices")
        .select("id")
        .eq("subscription_id", subRow.id)
        .eq("due_date", subRow.next_due_date)
        .maybeSingle();

      if (existing) continue;

      const now = new Date().toISOString();
      const invoiceId = randomUUID();

      const invoiceRow: DatabaseInvoiceRow = {
        id: invoiceId,
        subscription_id: subRow.id,
        seller_key: subRow.seller_key,
        amount: subRow.amount,
        currency: subRow.currency,
        due_date: subRow.next_due_date,
        status: "pending",
        dunning_step: 0,
        paid_at: null,
        created_at: now,
        updated_at: now,
      };

      await this.supabase.from("subscription_invoices").insert(invoiceRow);

      const nextDue = new Date(subRow.next_due_date);
      nextDue.setDate(nextDue.getDate() + subRow.interval_days);

      await this.supabase
        .from("subscriptions")
        .update({
          next_due_date: nextDue.toISOString().split("T")[0],
          updated_at: now,
        })
        .eq("id", subRow.id);

      generated++;
    }

    createStructuredLog({
      eventType: "recovery_started",
      level: "info",
      message: "Invoice generation complete.",
      context: { generated, date: today },
    });

    return { generated };
  }

  async processDunning(): Promise<{ processed: number; contacted: number }> {
    const { data: failedInvoices, error } = await this.supabase
      .from("subscription_invoices")
      .select("*, subscriptions!inner(customer_name, customer_phone, customer_email)")
      .in("status", ["pending", "failed"])
      .lte("due_date", new Date().toISOString().split("T")[0]);

    if (error || !failedInvoices?.length) return { processed: 0, contacted: 0 };

    let processed = 0;
    let contacted = 0;

    for (const invoiceData of failedInvoices) {
      processed++;

      const invoice = invoiceData as DatabaseInvoiceRow & {
        subscriptions: {
          customer_name: string;
          customer_phone: string;
          customer_email: string;
        };
      };
      const customer = invoice.subscriptions;
      const nextStep = invoice.dunning_step + 1;

      const { data: ruleRow } = await this.supabase
        .from("dunning_rules")
        .select("*")
        .eq("seller_key", invoice.seller_key)
        .eq("step", nextStep)
        .maybeSingle();

      if (!ruleRow) {
        const defaultSequence: DunningChannel[] = ["whatsapp", "email", "sms", "voice"];
        const channelIndex = Math.min(nextStep - 1, defaultSequence.length - 1);
        const channel = defaultSequence[channelIndex];

        await this.executeDunningContact({
          invoiceId: invoice.id,
          step: nextStep,
          channel,
          customer,
          invoice,
          template: null,
        });
        contacted++;
        continue;
      }

      const rule = mapDunningRule(ruleRow as DatabaseDunningRuleRow);
      const daysSinceDue = Math.floor(
        (Date.now() - new Date(invoice.due_date).getTime()) / (1000 * 60 * 60 * 24),
      );

      if (daysSinceDue >= rule.delayDays) {
        await this.executeDunningContact({
          invoiceId: invoice.id,
          step: nextStep,
          channel: rule.channel,
          customer,
          invoice,
          template: rule.messageTemplate,
        });
        contacted++;
      }
    }

    createStructuredLog({
      eventType: "recovery_started",
      level: "info",
      message: "Dunning processing complete.",
      context: { processed, contacted },
    });

    return { processed, contacted };
  }

  async getSubscriptionAnalytics(
    sellerKey?: string,
  ): Promise<SubscriptionAnalytics> {
    let subQuery = this.supabase
      .from("subscriptions")
      .select("status, amount");

    let invoiceQuery = this.supabase
      .from("subscription_invoices")
      .select("status, dunning_step");

    if (sellerKey) {
      subQuery = subQuery.eq("seller_key", sellerKey);
      invoiceQuery = invoiceQuery.eq("seller_key", sellerKey);
    }

    const [subsResult, invoicesResult] = await Promise.all([
      subQuery,
      invoiceQuery,
    ]);

    const subs = (subsResult.data ?? []) as Array<{
      status: SubscriptionStatus;
      amount: number;
    }>;
    const invoices = (invoicesResult.data ?? []) as Array<{
      status: InvoiceStatus;
      dunning_step: number;
    }>;

    const totalActive = subs.filter((s) => s.status === "active").length;
    const totalPaused = subs.filter((s) => s.status === "paused").length;
    const totalCanceled = subs.filter((s) => s.status === "canceled").length;
    const mrr = subs
      .filter((s) => s.status === "active")
      .reduce((sum, s) => sum + s.amount, 0);

    const total = subs.length;
    const churnRate = total > 0 ? totalCanceled / total : 0;

    const dunned = invoices.filter((i) => i.dunning_step > 0);
    const dunningPaid = dunned.filter((i) => i.status === "paid");
    const dunningSuccessRate =
      dunned.length > 0 ? dunningPaid.length / dunned.length : 0;

    const openInvoices = invoices.filter((i) => i.status === "pending").length;
    const failedInvoices = invoices.filter((i) => i.status === "failed").length;

    return {
      totalActive,
      totalPaused,
      totalCanceled,
      mrr,
      churnRate,
      dunningSuccessRate,
      openInvoices,
      failedInvoices,
    };
  }

  async listSubscriptions(
    sellerKey?: string,
    status?: SubscriptionStatus,
    limit = 50,
  ): Promise<SubscriptionRecord[]> {
    let query = this.supabase
      .from("subscriptions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (sellerKey) query = query.eq("seller_key", sellerKey);
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error || !data) return [];
    return (data as DatabaseSubscriptionRow[]).map(mapSubscription);
  }

  async listDunningRules(sellerKey?: string): Promise<DunningRuleRecord[]> {
    let query = this.supabase
      .from("dunning_rules")
      .select("*")
      .order("step", { ascending: true });

    if (sellerKey) query = query.eq("seller_key", sellerKey);

    const { data, error } = await query;
    if (error || !data) return [];
    return (data as DatabaseDunningRuleRow[]).map(mapDunningRule);
  }

  async listInvoices(
    subscriptionId?: string,
    status?: InvoiceStatus,
  ): Promise<InvoiceRecord[]> {
    let query = this.supabase
      .from("subscription_invoices")
      .select("*")
      .order("created_at", { ascending: false });

    if (subscriptionId) query = query.eq("subscription_id", subscriptionId);
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error || !data) return [];
    return (data as DatabaseInvoiceRow[]).map(mapInvoice);
  }

  async createDunningRule(
    input: CreateDunningRuleInput,
  ): Promise<DunningRuleRecord> {
    const now = new Date().toISOString();
    const id = randomUUID();

    const row: DatabaseDunningRuleRow = {
      id,
      seller_key: input.sellerKey,
      step: input.step,
      delay_days: input.delayDays,
      channel: input.channel,
      message_template: input.messageTemplate,
      created_at: now,
      updated_at: now,
    };

    const { error } = await this.supabase.from("dunning_rules").insert(row);

    if (error) {
      createStructuredLog({
        eventType: "processing_error",
        level: "error",
        message: "Failed to create dunning rule.",
        context: { id, error: error.message },
      });
      throw new Error(`Failed to create dunning rule: ${error.message}`);
    }

    return mapDunningRule(row);
  }

  /* ── Private helpers ── */

  private async executeDunningContact(input: {
    invoiceId: string;
    step: number;
    channel: DunningChannel;
    customer: { customer_name: string; customer_phone: string; customer_email: string };
    invoice: DatabaseInvoiceRow;
    template: string | null;
  }): Promise<void> {
    const formattedAmount = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: input.invoice.currency,
    }).format(input.invoice.amount);

    const defaultContent = [
      `Olá ${input.customer.customer_name},`,
      ``,
      `Identificamos uma pendência de ${formattedAmount} com vencimento em ${input.invoice.due_date}.`,
      `Por favor, regularize para evitar a interrupção do serviço.`,
    ].join("\n");

    const content = input.template
      ? input.template
          .replace(/\{\{customerName\}\}/g, input.customer.customer_name)
          .replace(/\{\{amount\}\}/g, formattedAmount)
          .replace(/\{\{dueDate\}\}/g, input.invoice.due_date)
      : defaultContent;

    const contactMap: Record<DunningChannel, string> = {
      whatsapp: input.customer.customer_phone,
      sms: input.customer.customer_phone,
      voice: input.customer.customer_phone,
      email: input.customer.customer_email,
    };

    const to = contactMap[input.channel];

    try {
      if (to) {
        const conversation = await this.storage.upsertConversation({
          channel: input.channel,
          contactValue: to,
          customerName: input.customer.customer_name,
        });
        await this.messaging.dispatchOutboundMessage({
          conversation,
          content,
        });
      }

      await this.supabase
        .from("subscription_invoices")
        .update({
          status: "failed",
          dunning_step: input.step,
          updated_at: new Date().toISOString(),
        })
        .eq("id", input.invoiceId);
    } catch (err) {
      createStructuredLog({
        eventType: "processing_error",
        level: "error",
        message: "Dunning contact dispatch failed.",
        context: {
          invoiceId: input.invoiceId,
          step: input.step,
          channel: input.channel,
          error: err instanceof Error ? err.message : String(err),
        },
      });
    }
  }
}

/* ── Singleton ── */

declare global {
  var __recurringBillingService__: RecurringBillingService | undefined;
}

export function getRecurringBillingService(): RecurringBillingService {
  if (!globalThis.__recurringBillingService__) {
    globalThis.__recurringBillingService__ = new RecurringBillingService();
  }
  return globalThis.__recurringBillingService__;
}
