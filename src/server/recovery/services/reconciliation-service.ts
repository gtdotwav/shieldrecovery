import { randomUUID } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { appEnv } from "@/server/recovery/config";
import { createStructuredLog } from "@/server/recovery/utils/structured-logger";
import { getStorageService } from "@/server/recovery/services/storage";

/* ── Types ── */

type ReportStatus = "pending" | "processing" | "completed" | "failed";

interface ReconciliationReport {
  id: string;
  sellerKey: string;
  periodStart: string;
  periodEnd: string;
  status: ReportStatus;
  totalCharges: number;
  totalPayments: number;
  matchedCount: number;
  unmatchedCharges: number;
  unmatchedPayments: number;
  totalGatewayFees: number;
  totalPlatformFees: number;
  netRevenue: number;
  discrepancyCount: number;
  discrepancyDetails: DiscrepancyItem[];
  generatedAt: string | null;
  createdAt: string;
}

interface DiscrepancyItem {
  type: "amount_mismatch" | "missing_payment" | "missing_charge" | "status_mismatch";
  chargeId: string | null;
  paymentId: string | null;
  expectedAmount: number;
  actualAmount: number;
  description: string;
}

interface ReconciliationSummary {
  sellerKey: string;
  periodLabel: string;
  totalCharges: number;
  totalPayments: number;
  matchRate: number;
  netRevenue: number;
  pendingDiscrepancies: number;
}

/* ── Row mapper ── */

function mapReport(row: Record<string, unknown>): ReconciliationReport {
  return {
    id: row.id as string,
    sellerKey: row.seller_key as string,
    periodStart: row.period_start as string,
    periodEnd: row.period_end as string,
    status: row.status as ReportStatus,
    totalCharges: (row.total_charges as number) ?? 0,
    totalPayments: (row.total_payments as number) ?? 0,
    matchedCount: (row.matched_count as number) ?? 0,
    unmatchedCharges: (row.unmatched_charges as number) ?? 0,
    unmatchedPayments: (row.unmatched_payments as number) ?? 0,
    totalGatewayFees: (row.total_gateway_fees as number) ?? 0,
    totalPlatformFees: (row.total_platform_fees as number) ?? 0,
    netRevenue: (row.net_revenue as number) ?? 0,
    discrepancyCount: (row.discrepancy_count as number) ?? 0,
    discrepancyDetails: (row.discrepancy_details as DiscrepancyItem[]) ?? [],
    generatedAt: (row.generated_at as string) ?? null,
    createdAt: row.created_at as string,
  };
}

/* ── Constants ── */

const DEFAULT_GATEWAY_FEE_RATE = 0.0349;
const DEFAULT_PLATFORM_FEE_RATE = 0.05;

/* ── Service ── */

export class ReconciliationService {
  private readonly supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(appEnv.supabaseUrl, appEnv.supabaseServiceRoleKey);
  }

  async generateReport(
    sellerKey: string,
    periodStart: string,
    periodEnd: string,
  ): Promise<ReconciliationReport> {
    const id = randomUUID();
    const now = new Date().toISOString();

    const { data: inserted, error: insertErr } = await this.supabase
      .from("reconciliation_reports")
      .insert({
        id,
        seller_key: sellerKey,
        period_start: periodStart,
        period_end: periodEnd,
        status: "processing",
        created_at: now,
      })
      .select("*")
      .single();

    if (insertErr) throw new Error(`Failed to create report: ${insertErr.message}`);

    try {
      const result = await this.reconcile(id, sellerKey, periodStart, periodEnd);

      const storage = getStorageService();
      await storage.addLog(
        createStructuredLog({
          eventType: "reconciliation_completed",
          level: "info",
          message: `Reconciliation report ${id} completed for ${sellerKey}.`,
          context: {
            reportId: id,
            sellerKey,
            matched: result.matchedCount,
            discrepancies: result.discrepancyCount,
          },
        }),
      );

      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      await this.supabase
        .from("reconciliation_reports")
        .update({ status: "failed" })
        .eq("id", id);
      throw new Error(`Reconciliation failed: ${msg}`);
    }
  }

  private async reconcile(
    reportId: string,
    sellerKey: string,
    periodStart: string,
    periodEnd: string,
  ): Promise<ReconciliationReport> {
    // Fetch charges (recovery_leads) for the period
    const { data: charges } = await this.supabase
      .from("recovery_leads")
      .select("id, payment_id, amount, status, gateway_payment_id, created_at")
      .eq("seller_key", sellerKey)
      .gte("created_at", periodStart)
      .lte("created_at", periodEnd);

    // Fetch payments for the period
    const { data: payments } = await this.supabase
      .from("payments")
      .select("id, gateway_payment_id, amount, status, created_at")
      .eq("seller_key", sellerKey)
      .gte("created_at", periodStart)
      .lte("created_at", periodEnd);

    const chargeList = charges ?? [];
    const paymentList = payments ?? [];

    // Build lookup by gateway_payment_id
    const paymentByGatewayId = new Map<string, (typeof paymentList)[number]>();
    for (const p of paymentList) {
      if (p.gateway_payment_id) paymentByGatewayId.set(p.gateway_payment_id as string, p);
    }

    const chargeByGatewayId = new Map<string, (typeof chargeList)[number]>();
    for (const c of chargeList) {
      if (c.gateway_payment_id) chargeByGatewayId.set(c.gateway_payment_id as string, c);
    }

    let matchedCount = 0;
    const discrepancies: DiscrepancyItem[] = [];
    let totalGrossRevenue = 0;

    // Match charges to payments
    for (const charge of chargeList) {
      const gwId = charge.gateway_payment_id as string | null;
      if (!gwId) continue;

      const payment = paymentByGatewayId.get(gwId);
      if (!payment) {
        discrepancies.push({
          type: "missing_payment",
          chargeId: charge.id as string,
          paymentId: null,
          expectedAmount: Number(charge.amount) || 0,
          actualAmount: 0,
          description: `Charge ${charge.id} has no matching payment (gateway: ${gwId}).`,
        });
        continue;
      }

      const chargeAmount = Number(charge.amount) || 0;
      const paymentAmount = Number(payment.amount) || 0;

      if (Math.abs(chargeAmount - paymentAmount) > 0.01) {
        discrepancies.push({
          type: "amount_mismatch",
          chargeId: charge.id as string,
          paymentId: payment.id as string,
          expectedAmount: chargeAmount,
          actualAmount: paymentAmount,
          description: `Amount mismatch: charge=${chargeAmount}, payment=${paymentAmount}.`,
        });
      }

      matchedCount++;
      totalGrossRevenue += paymentAmount;
    }

    // Find unmatched payments (payments with no charge)
    for (const payment of paymentList) {
      const gwId = payment.gateway_payment_id as string | null;
      if (!gwId || chargeByGatewayId.has(gwId)) continue;

      discrepancies.push({
        type: "missing_charge",
        chargeId: null,
        paymentId: payment.id as string,
        expectedAmount: 0,
        actualAmount: Number(payment.amount) || 0,
        description: `Payment ${payment.id} has no matching charge (gateway: ${gwId}).`,
      });
    }

    const unmatchedCharges = chargeList.length - matchedCount;
    const unmatchedPayments = paymentList.filter(
      (p) => p.gateway_payment_id && !chargeByGatewayId.has(p.gateway_payment_id as string),
    ).length;

    const totalGatewayFees = Math.round(totalGrossRevenue * DEFAULT_GATEWAY_FEE_RATE * 100) / 100;
    const totalPlatformFees = Math.round(totalGrossRevenue * DEFAULT_PLATFORM_FEE_RATE * 100) / 100;
    const netRevenue = Math.round((totalGrossRevenue - totalGatewayFees - totalPlatformFees) * 100) / 100;

    const now = new Date().toISOString();
    const { data, error } = await this.supabase
      .from("reconciliation_reports")
      .update({
        status: "completed",
        total_charges: chargeList.length,
        total_payments: paymentList.length,
        matched_count: matchedCount,
        unmatched_charges: unmatchedCharges,
        unmatched_payments: unmatchedPayments,
        total_gateway_fees: totalGatewayFees,
        total_platform_fees: totalPlatformFees,
        net_revenue: netRevenue,
        discrepancy_count: discrepancies.length,
        discrepancy_details: discrepancies,
        generated_at: now,
      })
      .eq("id", reportId)
      .select("*")
      .single();

    if (error) throw new Error(`Failed to update report: ${error.message}`);
    return mapReport(data);
  }

  async getReport(reportId: string): Promise<ReconciliationReport | null> {
    const { data, error } = await this.supabase
      .from("reconciliation_reports")
      .select("*")
      .eq("id", reportId)
      .maybeSingle();

    if (error) throw new Error(`Failed to fetch report: ${error.message}`);
    return data ? mapReport(data) : null;
  }

  async listReports(sellerKey?: string): Promise<ReconciliationReport[]> {
    let query = this.supabase
      .from("reconciliation_reports")
      .select("*")
      .order("created_at", { ascending: false });

    if (sellerKey) query = query.eq("seller_key", sellerKey);

    const { data, error } = await query;
    if (error) throw new Error(`Failed to list reports: ${error.message}`);
    return (data ?? []).map(mapReport);
  }

  async getReconciliationSummary(sellerKey: string): Promise<ReconciliationSummary> {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const periodEnd = now.toISOString();

    const { count: chargeCount } = await this.supabase
      .from("recovery_leads")
      .select("id", { count: "exact", head: true })
      .eq("seller_key", sellerKey)
      .gte("created_at", periodStart);

    const { count: paymentCount } = await this.supabase
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("seller_key", sellerKey)
      .gte("created_at", periodStart);

    const { data: paidPayments } = await this.supabase
      .from("payments")
      .select("amount")
      .eq("seller_key", sellerKey)
      .eq("status", "paid")
      .gte("created_at", periodStart);

    const totalPaid = (paidPayments ?? []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const charges = chargeCount ?? 0;
    const payments = paymentCount ?? 0;
    const matchRate = charges > 0 ? Math.round((payments / charges) * 100) / 100 : 0;

    const netRevenue = Math.round(
      totalPaid * (1 - DEFAULT_GATEWAY_FEE_RATE - DEFAULT_PLATFORM_FEE_RATE) * 100,
    ) / 100;

    return {
      sellerKey,
      periodLabel: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
      totalCharges: charges,
      totalPayments: payments,
      matchRate,
      netRevenue,
      pendingDiscrepancies: Math.abs(charges - payments),
    };
  }
}

/* ── Singleton ── */

declare global {
  var __reconciliationService__: ReconciliationService | undefined;
}

export function getReconciliationService(): ReconciliationService {
  if (!globalThis.__reconciliationService__) {
    globalThis.__reconciliationService__ = new ReconciliationService();
  }
  return globalThis.__reconciliationService__;
}
