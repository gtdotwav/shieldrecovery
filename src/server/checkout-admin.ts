import { appEnv } from "@/server/recovery/config";

// ── Admin API Client for PagRecovery Checkout Split System ───────
// Calls the checkout platform's admin endpoints using a shared secret.

const ADMIN_SECRET = process.env.ADMIN_API_SECRET ?? "";

async function adminFetch(path: string, init?: RequestInit) {
  const baseUrl = appEnv.checkoutPlatformUrl;
  if (!baseUrl) throw new Error("CHECKOUT_PLATFORM_URL not configured");

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ADMIN_SECRET}`,
      ...init?.headers,
    },
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Admin API ${path} failed (${response.status}): ${errorBody}`);
  }

  return response.json();
}

// ── Split Config ─────────────────────────────────────────────────

export type SplitConfig = {
  defaultFeePercent: number;
  holdPeriodDays: number;
  minPayoutAmount: number;
  payoutAutoApprove: boolean;
  updatedAt: string;
  updatedBy?: string;
};

export async function getSplitConfig(): Promise<SplitConfig> {
  return adminFetch("/api/admin/split-config");
}

export async function updateSplitConfig(data: {
  defaultFeePercent?: number;
  holdPeriodDays?: number;
  minPayoutAmount?: number;
  payoutAutoApprove?: boolean;
  updatedBy?: string;
}): Promise<SplitConfig> {
  return adminFetch("/api/admin/split-config", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

// ── Merchant Overrides ───────────────────────────────────────────

export type MerchantOverride = {
  merchantId: string;
  feePercent: number;
  notes?: string;
  updatedAt: string;
  merchantName?: string;
};

export async function listMerchantOverrides(): Promise<{ overrides: MerchantOverride[] }> {
  return adminFetch("/api/admin/merchant-overrides");
}

export async function upsertMerchantOverride(
  merchantId: string,
  feePercent: number,
  notes?: string,
  updatedBy?: string,
): Promise<void> {
  await adminFetch("/api/admin/merchant-overrides", {
    method: "POST",
    body: JSON.stringify({ merchantId, feePercent, notes, updatedBy }),
  });
}

export async function deleteMerchantOverride(merchantId: string): Promise<void> {
  await adminFetch("/api/admin/merchant-overrides", {
    method: "DELETE",
    body: JSON.stringify({ merchantId }),
  });
}

// ── Payouts ──────────────────────────────────────────────────────

export type PayoutRecord = {
  id: string;
  merchantId: string;
  amount: number;
  feeAmount: number;
  netAmount: number;
  status: string;
  pixKey?: string;
  pixKeyType?: string;
  holderName?: string;
  requestedAt: string;
  approvedAt?: string;
  approvedBy?: string;
  completedAt?: string;
  failedAt?: string;
  failureReason?: string;
  pixTransferId?: string;
  notes?: string;
};

export async function listPayouts(
  status?: string,
): Promise<{ payouts: PayoutRecord[] }> {
  const qs = status ? `?status=${status}` : "";
  return adminFetch(`/api/admin/payouts${qs}`);
}

export async function approvePayout(payoutId: string, adminEmail: string): Promise<void> {
  await adminFetch("/api/admin/payouts", {
    method: "PUT",
    body: JSON.stringify({ payoutId, action: "approve", adminEmail }),
  });
}

export async function rejectPayout(payoutId: string, reason: string): Promise<void> {
  await adminFetch("/api/admin/payouts", {
    method: "PUT",
    body: JSON.stringify({ payoutId, action: "reject", reason }),
  });
}

export async function completePayout(
  payoutId: string,
  pixTransferId?: string,
  notes?: string,
): Promise<void> {
  await adminFetch("/api/admin/payouts", {
    method: "PUT",
    body: JSON.stringify({ payoutId, action: "complete", pixTransferId, notes }),
  });
}

// ── Platform Financials ──────────────────────────────────────────

export type PlatformFinancials = {
  totalGross: number;
  totalFees: number;
  totalMerchantNet: number;
  totalPendingBalance: number;
  totalAvailableBalance: number;
  totalPaidOut: number;
  splitCount: number;
  merchantCount: number;
};

export async function getPlatformFinancials(): Promise<PlatformFinancials> {
  return adminFetch("/api/admin/financials");
}
