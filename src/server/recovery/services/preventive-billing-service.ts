import { randomUUID } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { appEnv } from "@/server/recovery/config";
import { MessagingService } from "@/server/recovery/services/messaging-service";
import { getStorageService } from "@/server/recovery/services/storage";
import { createStructuredLog } from "@/server/recovery/utils/structured-logger";

/* ── Types ── */

type PreventiveRuleChannel = "whatsapp" | "email" | "sms";

type PreventiveRuleRecord = {
  id: string;
  sellerKey: string;
  name: string;
  daysBefore: number;
  channel: PreventiveRuleChannel;
  messageTemplate: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreatePreventiveRuleInput = {
  sellerKey: string;
  name: string;
  daysBefore: number;
  channel: PreventiveRuleChannel;
  messageTemplate: string;
  enabled?: boolean;
};

type UpdatePreventiveRuleInput = Partial<
  Omit<CreatePreventiveRuleInput, "sellerKey">
>;

type PreventiveReminderStatus = "scheduled" | "sent" | "failed" | "paid_before_due";

type PreventiveReminderRecord = {
  id: string;
  ruleId: string;
  sellerKey: string;
  subscriptionId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  dueDate: string;
  sentAt: string | null;
  status: PreventiveReminderStatus;
  channel: PreventiveRuleChannel;
  createdAt: string;
  updatedAt: string;
};

type PreventiveAnalytics = {
  totalSent: number;
  paidBeforeDue: number;
  reductionRate: number;
  byChannel: Record<PreventiveRuleChannel, number>;
  activeRules: number;
};

/* ── DB row types ── */

type DatabaseRuleRow = {
  id: string;
  seller_key: string;
  name: string;
  days_before: number;
  channel: PreventiveRuleChannel;
  message_template: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
};

type DatabaseReminderRow = {
  id: string;
  rule_id: string;
  seller_key: string;
  subscription_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  due_date: string;
  sent_at: string | null;
  status: PreventiveReminderStatus;
  channel: PreventiveRuleChannel;
  created_at: string;
  updated_at: string;
};

/* ── Mappers ── */

function mapRule(row: DatabaseRuleRow): PreventiveRuleRecord {
  return {
    id: row.id,
    sellerKey: row.seller_key,
    name: row.name,
    daysBefore: row.days_before,
    channel: row.channel,
    messageTemplate: row.message_template,
    enabled: row.enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapReminder(row: DatabaseReminderRow): PreventiveReminderRecord {
  return {
    id: row.id,
    ruleId: row.rule_id,
    sellerKey: row.seller_key,
    subscriptionId: row.subscription_id,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    customerEmail: row.customer_email,
    dueDate: row.due_date,
    sentAt: row.sent_at,
    status: row.status,
    channel: row.channel,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/* ── Service ── */

export class PreventiveBillingService {
  private readonly supabase: SupabaseClient;
  private readonly messaging = new MessagingService();
  private readonly storage = getStorageService();

  constructor() {
    this.supabase = createClient(appEnv.supabaseUrl, appEnv.supabaseServiceRoleKey);
  }

  async createRule(input: CreatePreventiveRuleInput): Promise<PreventiveRuleRecord> {
    const now = new Date().toISOString();
    const id = randomUUID();

    const row: DatabaseRuleRow = {
      id,
      seller_key: input.sellerKey,
      name: input.name,
      days_before: input.daysBefore,
      channel: input.channel,
      message_template: input.messageTemplate,
      enabled: input.enabled ?? true,
      created_at: now,
      updated_at: now,
    };

    const { error } = await this.supabase
      .from("preventive_rules")
      .insert(row);

    if (error) {
      createStructuredLog({
        eventType: "processing_error",
        level: "error",
        message: "Failed to create preventive rule.",
        context: { id, error: error.message },
      });
      throw new Error(`Failed to create preventive rule: ${error.message}`);
    }

    createStructuredLog({
      eventType: "recovery_started",
      level: "info",
      message: "Preventive rule created.",
      context: { id, sellerKey: input.sellerKey, daysBefore: input.daysBefore },
    });

    return mapRule(row);
  }

  async updateRule(
    id: string,
    input: UpdatePreventiveRuleInput,
  ): Promise<PreventiveRuleRecord | undefined> {
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (input.name !== undefined) updates.name = input.name;
    if (input.daysBefore !== undefined) updates.days_before = input.daysBefore;
    if (input.channel !== undefined) updates.channel = input.channel;
    if (input.messageTemplate !== undefined)
      updates.message_template = input.messageTemplate;
    if (input.enabled !== undefined) updates.enabled = input.enabled;

    const { data, error } = await this.supabase
      .from("preventive_rules")
      .update(updates)
      .eq("id", id)
      .select("*")
      .maybeSingle();

    if (error || !data) return undefined;
    return mapRule(data as DatabaseRuleRow);
  }

  async listRules(sellerKey?: string): Promise<PreventiveRuleRecord[]> {
    let query = this.supabase
      .from("preventive_rules")
      .select("*")
      .order("created_at", { ascending: false });

    if (sellerKey) {
      query = query.eq("seller_key", sellerKey);
    }

    const { data, error } = await query;
    if (error || !data) return [];
    return (data as DatabaseRuleRow[]).map(mapRule);
  }

  async processPreventiveReminders(): Promise<{ processed: number; sent: number }> {
    const { data: rules, error: rulesError } = await this.supabase
      .from("preventive_rules")
      .select("*")
      .eq("enabled", true);

    if (rulesError || !rules?.length) {
      return { processed: 0, sent: 0 };
    }

    let processed = 0;
    let sent = 0;

    for (const ruleRow of rules as DatabaseRuleRow[]) {
      const rule = mapRule(ruleRow);
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + rule.daysBefore);
      const targetDateStr = targetDate.toISOString().split("T")[0];

      const { data: subscriptions } = await this.supabase
        .from("subscriptions")
        .select("id, seller_key, customer_name, customer_phone, customer_email, next_due_date")
        .eq("seller_key", rule.sellerKey)
        .eq("status", "active")
        .eq("next_due_date", targetDateStr);

      if (!subscriptions?.length) continue;

      for (const sub of subscriptions) {
        processed++;

        const { data: existing } = await this.supabase
          .from("preventive_reminders")
          .select("id")
          .eq("rule_id", rule.id)
          .eq("subscription_id", sub.id)
          .eq("due_date", sub.next_due_date)
          .maybeSingle();

        if (existing) continue;

        const reminderId = randomUUID();
        const now = new Date().toISOString();

        const reminderRow: DatabaseReminderRow = {
          id: reminderId,
          rule_id: rule.id,
          seller_key: rule.sellerKey,
          subscription_id: sub.id,
          customer_name: sub.customer_name ?? "",
          customer_phone: sub.customer_phone ?? "",
          customer_email: sub.customer_email ?? "",
          due_date: sub.next_due_date,
          sent_at: null,
          status: "scheduled",
          channel: rule.channel,
          created_at: now,
          updated_at: now,
        };

        await this.supabase.from("preventive_reminders").insert(reminderRow);

        try {
          const content = this.renderTemplate(rule.messageTemplate, {
            customerName: sub.customer_name ?? "Cliente",
            dueDate: sub.next_due_date,
            daysBefore: String(rule.daysBefore),
          });

          const contactValue =
            rule.channel === "email" ? sub.customer_email : sub.customer_phone;

          if (contactValue) {
            const conversation = await this.storage.upsertConversation({
              channel: rule.channel,
              contactValue,
              customerName: sub.customer_name ?? "Cliente",
            });
            await this.messaging.dispatchOutboundMessage({
              conversation,
              content,
            });

            await this.supabase
              .from("preventive_reminders")
              .update({
                status: "sent",
                sent_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq("id", reminderId);

            sent++;
          }
        } catch (err) {
          await this.supabase
            .from("preventive_reminders")
            .update({
              status: "failed",
              updated_at: new Date().toISOString(),
            })
            .eq("id", reminderId);

          createStructuredLog({
            eventType: "processing_error",
            level: "error",
            message: "Failed to send preventive reminder.",
            context: {
              reminderId,
              ruleId: rule.id,
              error: err instanceof Error ? err.message : String(err),
            },
          });
        }
      }
    }

    createStructuredLog({
      eventType: "recovery_started",
      level: "info",
      message: "Preventive reminders processing complete.",
      context: { processed, sent },
    });

    return { processed, sent };
  }

  async getPreventiveAnalytics(
    sellerKey?: string,
  ): Promise<PreventiveAnalytics> {
    let reminderQuery = this.supabase
      .from("preventive_reminders")
      .select("status, channel");

    let ruleQuery = this.supabase
      .from("preventive_rules")
      .select("id")
      .eq("enabled", true);

    if (sellerKey) {
      reminderQuery = reminderQuery.eq("seller_key", sellerKey);
      ruleQuery = ruleQuery.eq("seller_key", sellerKey);
    }

    const [remindersResult, rulesResult] = await Promise.all([
      reminderQuery,
      ruleQuery,
    ]);

    const reminders = (remindersResult.data ?? []) as Array<{
      status: PreventiveReminderStatus;
      channel: PreventiveRuleChannel;
    }>;
    const activeRules = rulesResult.data?.length ?? 0;

    const totalSent = reminders.filter((r) => r.status === "sent").length;
    const paidBeforeDue = reminders.filter(
      (r) => r.status === "paid_before_due",
    ).length;

    const byChannel: Record<PreventiveRuleChannel, number> = {
      whatsapp: 0,
      email: 0,
      sms: 0,
    };
    for (const r of reminders) {
      if (r.status === "sent" && byChannel[r.channel] !== undefined) {
        byChannel[r.channel]++;
      }
    }

    return {
      totalSent,
      paidBeforeDue,
      reductionRate: totalSent > 0 ? paidBeforeDue / totalSent : 0,
      byChannel,
      activeRules,
    };
  }

  /* ── Private helpers ── */

  private renderTemplate(
    template: string,
    vars: Record<string, string>,
  ): string {
    return template.replace(
      /\{\{(\w+)\}\}/g,
      (_, key: string) => vars[key] ?? `{{${key}}}`,
    );
  }
}

/* ── Singleton ── */

declare global {
  var __preventiveBillingService__: PreventiveBillingService | undefined;
}

export function getPreventiveBillingService(): PreventiveBillingService {
  if (!globalThis.__preventiveBillingService__) {
    globalThis.__preventiveBillingService__ = new PreventiveBillingService();
  }
  return globalThis.__preventiveBillingService__;
}
