import { randomUUID } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { appEnv } from "@/server/recovery/config";
import { createStructuredLog } from "@/server/recovery/utils/structured-logger";
import { getStorageService } from "@/server/recovery/services/storage";

/* ── Types ── */

export type RequestStatus = "pending" | "approved" | "disbursed" | "rejected" | "cancelled";

interface AnticipationRequest {
  id: string;
  sellerKey: string;
  requestedAmount: number;
  approvedAmount: number;
  spreadRate: number;
  spreadAmount: number;
  netAmount: number;
  avgDaysToSettlement: number;
  status: RequestStatus;
  approvedAt: string | null;
  disbursedAt: string | null;
  createdAt: string;
}

interface AvailableReceivables {
  sellerKey: string;
  totalReceivable: number;
  settledCount: number;
  pendingCount: number;
  avgDaysToSettlement: number;
  maxAnticipationAmount: number;
  estimatedSpreadRate: number;
}

interface AnticipationAnalytics {
  totalRequests: number;
  totalDisbursed: number;
  totalSpreadCollected: number;
  avgSpreadRate: number;
  pendingRequests: number;
  approvedNotDisbursed: number;
  avgDaysToSettlement: number;
}

/* ── Spread calculation ── */

const BASE_SPREAD_RATE = 0.018;    // 1.8% base monthly rate
const PER_DAY_SPREAD = 0.0006;     // 0.06% per day
const MAX_ANTICIPATION_RATIO = 0.85; // max 85% of receivables

function calculateSpread(amount: number, avgDaysToSettlement: number): {
  spreadRate: number;
  spreadAmount: number;
  netAmount: number;
} {
  const spreadRate = Math.round((BASE_SPREAD_RATE + PER_DAY_SPREAD * avgDaysToSettlement) * 10000) / 10000;
  const spreadAmount = Math.round(amount * spreadRate * 100) / 100;
  const netAmount = Math.round((amount - spreadAmount) * 100) / 100;
  return { spreadRate, spreadAmount, netAmount };
}

/* ── Row mapper ── */

function mapRequest(row: Record<string, unknown>): AnticipationRequest {
  return {
    id: row.id as string,
    sellerKey: row.seller_key as string,
    requestedAmount: (row.requested_amount as number) ?? 0,
    approvedAmount: (row.approved_amount as number) ?? 0,
    spreadRate: (row.spread_rate as number) ?? 0,
    spreadAmount: (row.spread_amount as number) ?? 0,
    netAmount: (row.net_amount as number) ?? 0,
    avgDaysToSettlement: (row.avg_days_to_settlement as number) ?? 0,
    status: row.status as RequestStatus,
    approvedAt: (row.approved_at as string) ?? null,
    disbursedAt: (row.disbursed_at as string) ?? null,
    createdAt: row.created_at as string,
  };
}

/* ── Service ── */

export class AnticipationService {
  private readonly supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(appEnv.supabaseUrl, appEnv.supabaseServiceRoleKey);
  }

  async requestAnticipation(
    sellerKey: string,
    amount: number,
  ): Promise<AnticipationRequest> {
    const receivables = await this.getAvailableReceivables(sellerKey);

    if (amount > receivables.maxAnticipationAmount) {
      throw new Error(
        `Requested amount (${amount}) exceeds maximum anticipation (${receivables.maxAnticipationAmount}).`,
      );
    }

    if (amount <= 0) throw new Error("Amount must be positive.");

    const id = randomUUID();
    const now = new Date().toISOString();

    const { data, error } = await this.supabase
      .from("anticipation_requests")
      .insert({
        id,
        seller_key: sellerKey,
        requested_amount: amount,
        approved_amount: 0,
        spread_rate: 0,
        spread_amount: 0,
        net_amount: 0,
        avg_days_to_settlement: receivables.avgDaysToSettlement,
        status: "pending",
        created_at: now,
      })
      .select("*")
      .single();

    if (error) throw new Error(`Failed to create request: ${error.message}`);

    const storage = getStorageService();
    await storage.addLog(
      createStructuredLog({
        eventType: "anticipation_requested",
        level: "info",
        message: `Anticipation request created: R$ ${amount.toFixed(2)} for ${sellerKey}.`,
        context: { requestId: id, sellerKey, amount },
      }),
    );

    return mapRequest(data);
  }

  async approveAnticipation(requestId: string): Promise<AnticipationRequest> {
    const { data: req } = await this.supabase
      .from("anticipation_requests")
      .select("*")
      .eq("id", requestId)
      .single();

    if (!req) throw new Error("Request not found.");
    if (req.status !== "pending") throw new Error(`Cannot approve: status is ${req.status}.`);

    const amount = req.requested_amount as number;
    const avgDays = (req.avg_days_to_settlement as number) || 15;
    const { spreadRate, spreadAmount, netAmount } = calculateSpread(amount, avgDays);

    const now = new Date().toISOString();
    const { data, error } = await this.supabase
      .from("anticipation_requests")
      .update({
        status: "approved",
        approved_amount: amount,
        spread_rate: spreadRate,
        spread_amount: spreadAmount,
        net_amount: netAmount,
        approved_at: now,
      })
      .eq("id", requestId)
      .select("*")
      .single();

    if (error) throw new Error(`Failed to approve: ${error.message}`);

    const storage = getStorageService();
    await storage.addLog(
      createStructuredLog({
        eventType: "anticipation_approved",
        level: "info",
        message: `Anticipation ${requestId} approved. Net: R$ ${netAmount.toFixed(2)}, spread: ${(spreadRate * 100).toFixed(2)}%.`,
        context: { requestId, spreadRate, spreadAmount, netAmount },
      }),
    );

    return mapRequest(data);
  }

  async disburseAnticipation(requestId: string): Promise<AnticipationRequest> {
    const now = new Date().toISOString();

    const { data, error } = await this.supabase
      .from("anticipation_requests")
      .update({ status: "disbursed", disbursed_at: now })
      .eq("id", requestId)
      .eq("status", "approved")
      .select("*")
      .single();

    if (error || !data) throw new Error("Request not found or not in approved status.");

    const storage = getStorageService();
    await storage.addLog(
      createStructuredLog({
        eventType: "anticipation_disbursed",
        level: "info",
        message: `Anticipation ${requestId} disbursed: R$ ${(data.net_amount as number).toFixed(2)}.`,
        context: { requestId, netAmount: data.net_amount },
      }),
    );

    return mapRequest(data);
  }

  async getAvailableReceivables(sellerKey: string): Promise<AvailableReceivables> {
    const now = new Date();

    // Fetch pending/future payments for this seller
    const { data: pendingPayments } = await this.supabase
      .from("payments")
      .select("amount, status, created_at")
      .eq("seller_key", sellerKey)
      .in("status", ["paid", "approved"]);

    const all = pendingPayments ?? [];
    const totalReceivable = all.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    // Estimate days to settlement (avg 15 days from payment date)
    const avgDays =
      all.length > 0
        ? all.reduce((sum, p) => {
            const created = new Date(p.created_at as string);
            const settlementDate = new Date(created.getTime() + 30 * 86_400_000);
            const daysLeft = Math.max(0, (settlementDate.getTime() - now.getTime()) / 86_400_000);
            return sum + daysLeft;
          }, 0) / all.length
        : 15;

    const maxAnticipation = Math.round(totalReceivable * MAX_ANTICIPATION_RATIO * 100) / 100;
    const estimatedSpread = BASE_SPREAD_RATE + PER_DAY_SPREAD * Math.round(avgDays);

    return {
      sellerKey,
      totalReceivable: Math.round(totalReceivable * 100) / 100,
      settledCount: 0,
      pendingCount: all.length,
      avgDaysToSettlement: Math.round(avgDays),
      maxAnticipationAmount: maxAnticipation,
      estimatedSpreadRate: Math.round(estimatedSpread * 10000) / 10000,
    };
  }

  async listRequests(
    sellerKey?: string,
    status?: RequestStatus,
  ): Promise<AnticipationRequest[]> {
    let query = this.supabase
      .from("anticipation_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (sellerKey) query = query.eq("seller_key", sellerKey);
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw new Error(`Failed to list requests: ${error.message}`);
    return (data ?? []).map(mapRequest);
  }

  async getAnticipationAnalytics(sellerKey?: string): Promise<AnticipationAnalytics> {
    let query = this.supabase.from("anticipation_requests").select("*");
    if (sellerKey) query = query.eq("seller_key", sellerKey);

    const { data } = await query;
    const all = (data ?? []).map(mapRequest);

    const disbursed = all.filter((r) => r.status === "disbursed");
    const pending = all.filter((r) => r.status === "pending");
    const approved = all.filter((r) => r.status === "approved");

    const totalDisbursed = disbursed.reduce((sum, r) => sum + r.netAmount, 0);
    const totalSpread = disbursed.reduce((sum, r) => sum + r.spreadAmount, 0);
    const avgSpread =
      disbursed.length > 0
        ? disbursed.reduce((sum, r) => sum + r.spreadRate, 0) / disbursed.length
        : 0;
    const avgDays =
      all.length > 0
        ? all.reduce((sum, r) => sum + r.avgDaysToSettlement, 0) / all.length
        : 0;

    return {
      totalRequests: all.length,
      totalDisbursed: Math.round(totalDisbursed * 100) / 100,
      totalSpreadCollected: Math.round(totalSpread * 100) / 100,
      avgSpreadRate: Math.round(avgSpread * 10000) / 10000,
      pendingRequests: pending.length,
      approvedNotDisbursed: approved.length,
      avgDaysToSettlement: Math.round(avgDays),
    };
  }
}

/* ── Singleton ── */

declare global {
  var __anticipationService__: AnticipationService | undefined;
}

export function getAnticipationService(): AnticipationService {
  if (!globalThis.__anticipationService__) {
    globalThis.__anticipationService__ = new AnticipationService();
  }
  return globalThis.__anticipationService__;
}
