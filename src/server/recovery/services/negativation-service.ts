import { randomUUID } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { appEnv } from "@/server/recovery/config";
import { createStructuredLog } from "@/server/recovery/utils/structured-logger";
import { getStorageService } from "@/server/recovery/services/storage";

/* ── Types ── */

export type NegativationStatus =
  | "pending_notice"
  | "notice_sent"
  | "waiting_period"
  | "ready_to_register"
  | "registered"
  | "removed"
  | "cancelled";

interface Negativation {
  id: string;
  sellerKey: string;
  customerId: string;
  customerName: string;
  customerDocument: string;
  debtAmount: number;
  debtDescription: string;
  dueDate: string;
  status: NegativationStatus;
  bureau: string;
  registeredAt: string | null;
  removedAt: string | null;
  createdAt: string;
}

interface ExtrajudicialNotice {
  id: string;
  negativationId: string;
  sentAt: string;
  deliveredAt: string | null;
  channel: string;
  content: string;
  waitingPeriodDays: number;
  expiresAt: string;
}

interface NegativationAnalytics {
  total: number;
  pendingNotice: number;
  noticeSent: number;
  waitingPeriod: number;
  registered: number;
  removed: number;
  cancelled: number;
  totalDebtAmount: number;
  recoveredAfterNegativation: number;
}

export interface CreateNegativationInput {
  sellerKey: string;
  customerId: string;
  customerName: string;
  customerDocument: string;
  debtAmount: number;
  debtDescription: string;
  dueDate: string;
  bureau?: string;
}

/* ── Constants ── */

const DEFAULT_WAITING_PERIOD_DAYS = 10;
const DEFAULT_BUREAU = "serasa";

/* ── Row mappers ── */

function mapNegativation(row: Record<string, unknown>): Negativation {
  return {
    id: row.id as string,
    sellerKey: row.seller_key as string,
    customerId: row.customer_id as string,
    customerName: row.customer_name as string,
    customerDocument: row.customer_document as string,
    debtAmount: (row.debt_amount as number) ?? 0,
    debtDescription: (row.debt_description as string) ?? "",
    dueDate: row.due_date as string,
    status: row.status as NegativationStatus,
    bureau: (row.bureau as string) ?? DEFAULT_BUREAU,
    registeredAt: (row.registered_at as string) ?? null,
    removedAt: (row.removed_at as string) ?? null,
    createdAt: row.created_at as string,
  };
}

function mapNotice(row: Record<string, unknown>): ExtrajudicialNotice {
  return {
    id: row.id as string,
    negativationId: row.negativation_id as string,
    sentAt: row.sent_at as string,
    deliveredAt: (row.delivered_at as string) ?? null,
    channel: (row.channel as string) ?? "email",
    content: (row.content as string) ?? "",
    waitingPeriodDays: (row.waiting_period_days as number) ?? DEFAULT_WAITING_PERIOD_DAYS,
    expiresAt: row.expires_at as string,
  };
}

/* ── Service ── */

export class NegativationService {
  private readonly supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(appEnv.supabaseUrl, appEnv.supabaseServiceRoleKey);
  }

  async createNegativation(input: CreateNegativationInput): Promise<Negativation> {
    const id = randomUUID();
    const now = new Date().toISOString();

    const { data, error } = await this.supabase
      .from("negativations")
      .insert({
        id,
        seller_key: input.sellerKey,
        customer_id: input.customerId,
        customer_name: input.customerName,
        customer_document: input.customerDocument,
        debt_amount: input.debtAmount,
        debt_description: input.debtDescription,
        due_date: input.dueDate,
        status: "pending_notice",
        bureau: input.bureau ?? DEFAULT_BUREAU,
        created_at: now,
      })
      .select("*")
      .single();

    if (error) throw new Error(`Failed to create negativation: ${error.message}`);
    return mapNegativation(data);
  }

  async sendExtrajudicialNotice(negativationId: string): Promise<ExtrajudicialNotice> {
    const { data: neg, error: fetchErr } = await this.supabase
      .from("negativations")
      .select("*")
      .eq("id", negativationId)
      .single();

    if (fetchErr || !neg) throw new Error("Negativation not found.");
    if (neg.status !== "pending_notice") throw new Error(`Invalid status for notice: ${neg.status}`);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + DEFAULT_WAITING_PERIOD_DAYS * 86_400_000).toISOString();

    const noticeContent =
      `Prezado(a) ${neg.customer_name},\n\n` +
      `Informamos que existe um débito em seu nome no valor de R$ ${Number(neg.debt_amount).toFixed(2)}, ` +
      `referente a: ${neg.debt_description}.\n\n` +
      `Caso o pagamento não seja efetuado em até ${DEFAULT_WAITING_PERIOD_DAYS} dias, ` +
      `seu nome poderá ser inscrito nos órgãos de proteção ao crédito (${neg.bureau ?? DEFAULT_BUREAU}).`;

    const noticeId = randomUUID();
    const { data: notice, error: noticeErr } = await this.supabase
      .from("extrajudicial_notices")
      .insert({
        id: noticeId,
        negativation_id: negativationId,
        sent_at: now.toISOString(),
        channel: "email",
        content: noticeContent,
        waiting_period_days: DEFAULT_WAITING_PERIOD_DAYS,
        expires_at: expiresAt,
      })
      .select("*")
      .single();

    if (noticeErr) throw new Error(`Failed to create notice: ${noticeErr.message}`);

    await this.supabase
      .from("negativations")
      .update({ status: "notice_sent" })
      .eq("id", negativationId);

    const storage = getStorageService();
    await storage.addLog(
      createStructuredLog({
        eventType: "extrajudicial_notice_sent",
        level: "info",
        message: `Notice sent for negativation ${negativationId}.`,
        context: { negativationId, expiresAt },
      }),
    );

    return mapNotice(notice);
  }

  async registerWithBureau(negativationId: string): Promise<Negativation> {
    const { data: neg } = await this.supabase
      .from("negativations")
      .select("*")
      .eq("id", negativationId)
      .single();

    if (!neg) throw new Error("Negativation not found.");

    const validStatuses: NegativationStatus[] = ["ready_to_register", "waiting_period"];
    if (!validStatuses.includes(neg.status as NegativationStatus)) {
      throw new Error(`Cannot register: current status is ${neg.status}.`);
    }

    const now = new Date().toISOString();
    const { data, error } = await this.supabase
      .from("negativations")
      .update({ status: "registered", registered_at: now })
      .eq("id", negativationId)
      .select("*")
      .single();

    if (error) throw new Error(`Failed to register: ${error.message}`);

    const storage = getStorageService();
    await storage.addLog(
      createStructuredLog({
        eventType: "negativation_registered",
        level: "info",
        message: `Negativation ${negativationId} registered with ${neg.bureau}.`,
        context: { negativationId, bureau: neg.bureau },
      }),
    );

    return mapNegativation(data);
  }

  async removeFromBureau(negativationId: string): Promise<Negativation> {
    const now = new Date().toISOString();

    const { data, error } = await this.supabase
      .from("negativations")
      .update({ status: "removed", removed_at: now })
      .eq("id", negativationId)
      .eq("status", "registered")
      .select("*")
      .single();

    if (error || !data) throw new Error("Negativation not found or not in registered status.");
    return mapNegativation(data);
  }

  async processNegativationQueue(): Promise<{ processed: number }> {
    const now = new Date().toISOString();

    // Transition notice_sent → waiting_period (after notice is delivered)
    await this.supabase
      .from("negativations")
      .update({ status: "waiting_period" })
      .eq("status", "notice_sent");

    // Find negativations whose waiting period has expired
    const { data: expiredNotices } = await this.supabase
      .from("extrajudicial_notices")
      .select("negativation_id")
      .lt("expires_at", now);

    const expiredIds = (expiredNotices ?? []).map((n) => n.negativation_id as string);

    if (expiredIds.length > 0) {
      await this.supabase
        .from("negativations")
        .update({ status: "ready_to_register" })
        .in("id", expiredIds)
        .eq("status", "waiting_period");
    }

    const storage = getStorageService();
    await storage.addLog(
      createStructuredLog({
        eventType: "negativation_queue_processed",
        level: "info",
        message: `Queue processed: ${expiredIds.length} moved to ready_to_register.`,
        context: { transitioned: expiredIds.length },
      }),
    );

    return { processed: expiredIds.length };
  }

  async getNegativationAnalytics(sellerKey?: string): Promise<NegativationAnalytics> {
    let query = this.supabase.from("negativations").select("*");
    if (sellerKey) query = query.eq("seller_key", sellerKey);

    const { data } = await query;
    const all = (data ?? []).map(mapNegativation);

    const byStatus = (s: NegativationStatus) => all.filter((n) => n.status === s).length;

    return {
      total: all.length,
      pendingNotice: byStatus("pending_notice"),
      noticeSent: byStatus("notice_sent"),
      waitingPeriod: byStatus("waiting_period"),
      registered: byStatus("registered"),
      removed: byStatus("removed"),
      cancelled: byStatus("cancelled"),
      totalDebtAmount: all.reduce((sum, n) => sum + n.debtAmount, 0),
      recoveredAfterNegativation: all.filter((n) => n.status === "removed").length,
    };
  }

  async listNegativations(
    sellerKey?: string,
    status?: NegativationStatus,
  ): Promise<Negativation[]> {
    let query = this.supabase
      .from("negativations")
      .select("*")
      .order("created_at", { ascending: false });

    if (sellerKey) query = query.eq("seller_key", sellerKey);
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw new Error(`Failed to list negativations: ${error.message}`);
    return (data ?? []).map(mapNegativation);
  }
}

/* ── Singleton ── */

declare global {
  var __negativationService__: NegativationService | undefined;
}

export function getNegativationService(): NegativationService {
  if (!globalThis.__negativationService__) {
    globalThis.__negativationService__ = new NegativationService();
  }
  return globalThis.__negativationService__;
}
