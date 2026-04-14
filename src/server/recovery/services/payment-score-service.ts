import { randomUUID } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { appEnv } from "@/server/recovery/config";
import { createStructuredLog } from "@/server/recovery/utils/structured-logger";
import { getStorageService } from "@/server/recovery/services/storage";

/* ── Types ── */

type RiskLevel = "very_low" | "low" | "medium" | "high" | "very_high";

interface PaymentScore {
  id: string;
  customerId: string;
  email: string | null;
  document: string | null;
  score: number;
  riskLevel: RiskLevel;
  successRate: number;
  avgPaymentTimeDays: number;
  chargebackCount: number;
  refundCount: number;
  totalSpent: number;
  recencyDays: number;
  transactionCount: number;
  calculatedAt: string;
  createdAt: string;
}

interface ScoreDistribution {
  veryLow: number;
  low: number;
  medium: number;
  high: number;
  veryHigh: number;
  averageScore: number;
  totalScored: number;
}

/* ── Risk level mapping ── */

function riskLevelFromScore(score: number): RiskLevel {
  if (score >= 800) return "very_low";
  if (score >= 600) return "low";
  if (score >= 400) return "medium";
  if (score >= 200) return "high";
  return "very_high";
}

/* ── Row mapper ── */

function mapScore(row: Record<string, unknown>): PaymentScore {
  return {
    id: row.id as string,
    customerId: row.customer_id as string,
    email: (row.email as string) ?? null,
    document: (row.document as string) ?? null,
    score: row.score as number,
    riskLevel: row.risk_level as RiskLevel,
    successRate: (row.success_rate as number) ?? 0,
    avgPaymentTimeDays: (row.avg_payment_time_days as number) ?? 0,
    chargebackCount: (row.chargeback_count as number) ?? 0,
    refundCount: (row.refund_count as number) ?? 0,
    totalSpent: (row.total_spent as number) ?? 0,
    recencyDays: (row.recency_days as number) ?? 0,
    transactionCount: (row.transaction_count as number) ?? 0,
    calculatedAt: row.calculated_at as string,
    createdAt: row.created_at as string,
  };
}

/* ── Score calculation weights ── */

const WEIGHTS = {
  successRate: 300,    // 0-300 pts
  avgPaymentTime: 150, // 0-150 pts
  chargebacks: 200,    // 0-200 pts (penalty)
  refunds: 100,        // 0-100 pts (penalty)
  totalSpent: 150,     // 0-150 pts
  recency: 100,        // 0-100 pts
} as const;

/* ── Service ── */

export class PaymentScoreService {
  private readonly supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(appEnv.supabaseUrl, appEnv.supabaseServiceRoleKey);
  }

  async calculateScore(customerId: string): Promise<PaymentScore> {
    const { data: customer } = await this.supabase
      .from("customers")
      .select("id, email, document")
      .eq("id", customerId)
      .single();

    if (!customer) throw new Error("Customer not found.");

    const { data: payments } = await this.supabase
      .from("payments")
      .select("*")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });

    const all = payments ?? [];
    const total = all.length || 1;

    // Factor: success rate
    const successful = all.filter((p) => p.status === "paid" || p.status === "approved");
    const successRate = successful.length / total;
    const successPts = Math.round(successRate * WEIGHTS.successRate);

    // Factor: average payment time (days from creation to payment)
    const paidPayments = successful.filter((p) => p.paid_at);
    const avgTimeDays =
      paidPayments.length > 0
        ? paidPayments.reduce((sum, p) => {
            const diff = new Date(p.paid_at as string).getTime() - new Date(p.created_at as string).getTime();
            return sum + diff / 86_400_000;
          }, 0) / paidPayments.length
        : 30;
    const timePts = Math.round(Math.max(0, 1 - avgTimeDays / 30) * WEIGHTS.avgPaymentTime);

    // Factor: chargebacks (penalty)
    const chargebacks = all.filter((p) => p.status === "chargeback" || p.status === "disputed");
    const chargebackPenalty = Math.min(chargebacks.length * 50, WEIGHTS.chargebacks);
    const chargebackPts = WEIGHTS.chargebacks - chargebackPenalty;

    // Factor: refunds (penalty)
    const refunds = all.filter((p) => p.status === "refunded");
    const refundPenalty = Math.min(refunds.length * 25, WEIGHTS.refunds);
    const refundPts = WEIGHTS.refunds - refundPenalty;

    // Factor: total spent (normalized against 10k baseline)
    const totalSpent = successful.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const spentPts = Math.round(Math.min(totalSpent / 10_000, 1) * WEIGHTS.totalSpent);

    // Factor: recency
    const mostRecent = all[0];
    const recencyDays = mostRecent
      ? (Date.now() - new Date(mostRecent.created_at as string).getTime()) / 86_400_000
      : 365;
    const recencyPts = Math.round(Math.max(0, 1 - recencyDays / 365) * WEIGHTS.recency);

    const score = Math.max(0, Math.min(1000, successPts + timePts + chargebackPts + refundPts + spentPts + recencyPts));
    const riskLevel = riskLevelFromScore(score);
    const now = new Date().toISOString();

    const { data, error } = await this.supabase
      .from("payment_scores")
      .upsert(
        {
          id: randomUUID(),
          customer_id: customerId,
          email: customer.email ?? null,
          document: customer.document ?? null,
          score,
          risk_level: riskLevel,
          success_rate: Math.round(successRate * 100) / 100,
          avg_payment_time_days: Math.round(avgTimeDays * 10) / 10,
          chargeback_count: chargebacks.length,
          refund_count: refunds.length,
          total_spent: Math.round(totalSpent * 100) / 100,
          recency_days: Math.round(recencyDays),
          transaction_count: total,
          calculated_at: now,
          created_at: now,
        },
        { onConflict: "customer_id" },
      )
      .select("*")
      .single();

    if (error) throw new Error(`Failed to save score: ${error.message}`);
    return mapScore(data);
  }

  async getScore(query: {
    customerId?: string;
    email?: string;
    document?: string;
  }): Promise<PaymentScore | null> {
    let q = this.supabase.from("payment_scores").select("*");

    if (query.customerId) q = q.eq("customer_id", query.customerId);
    else if (query.email) q = q.eq("email", query.email);
    else if (query.document) q = q.eq("document", query.document);
    else throw new Error("At least one query parameter is required.");

    const { data, error } = await q.maybeSingle();
    if (error) throw new Error(`Failed to fetch score: ${error.message}`);
    return data ? mapScore(data) : null;
  }

  async batchRefreshScores(): Promise<{ refreshed: number }> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();

    const { data: staleScores } = await this.supabase
      .from("payment_scores")
      .select("customer_id")
      .lt("calculated_at", thirtyDaysAgo)
      .limit(200);

    let refreshed = 0;

    for (const row of staleScores ?? []) {
      try {
        await this.calculateScore(row.customer_id as string);
        refreshed++;
      } catch {
        // Skip customers that fail (e.g., deleted)
      }
    }

    const storage = getStorageService();
    await storage.addLog(
      createStructuredLog({
        eventType: "payment_scores_refreshed",
        level: "info",
        message: `Batch refresh completed: ${refreshed} scores updated.`,
        context: { refreshed, attempted: staleScores?.length ?? 0 },
      }),
    );

    return { refreshed };
  }

  async getScoreDistribution(sellerKey?: string): Promise<ScoreDistribution> {
    let query = this.supabase.from("payment_scores").select("score");

    if (sellerKey) {
      const { data: customerIds } = await this.supabase
        .from("payments")
        .select("customer_id")
        .eq("seller_key", sellerKey);
      const ids = [...new Set((customerIds ?? []).map((c) => c.customer_id as string))];
      if (ids.length === 0) {
        return { veryLow: 0, low: 0, medium: 0, high: 0, veryHigh: 0, averageScore: 0, totalScored: 0 };
      }
      query = query.in("customer_id", ids);
    }

    const { data } = await query;
    const scores = (data ?? []).map((r) => r.score as number);

    if (scores.length === 0) {
      return { veryLow: 0, low: 0, medium: 0, high: 0, veryHigh: 0, averageScore: 0, totalScored: 0 };
    }

    return {
      veryLow: scores.filter((s) => s >= 800).length,
      low: scores.filter((s) => s >= 600 && s < 800).length,
      medium: scores.filter((s) => s >= 400 && s < 600).length,
      high: scores.filter((s) => s >= 200 && s < 400).length,
      veryHigh: scores.filter((s) => s < 200).length,
      averageScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      totalScored: scores.length,
    };
  }
}

/* ── Singleton ── */

declare global {
  var __paymentScoreService__: PaymentScoreService | undefined;
}

export function getPaymentScoreService(): PaymentScoreService {
  if (!globalThis.__paymentScoreService__) {
    globalThis.__paymentScoreService__ = new PaymentScoreService();
  }
  return globalThis.__paymentScoreService__;
}
