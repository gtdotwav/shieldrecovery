"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAuthenticatedSession } from "@/server/auth/session";
import {
  getSplitConfig,
  updateSplitConfig,
  upsertMerchantOverride,
  deleteMerchantOverride,
  approvePayout,
  rejectPayout,
  completePayout,
} from "@/server/checkout-admin";

function revalidateAdminRoutes() {
  revalidatePath("/admin");
  revalidatePath("/financeiro");
}

// ── Split Config ─────────────────────────────────────────────────

const splitConfigSchema = z.object({
  defaultFeePercent: z.coerce.number().min(0).max(100),
  holdPeriodDays: z.coerce.number().int().min(0).max(365),
  minPayoutAmount: z.coerce.number().min(0),
  payoutAutoApprove: z.coerce.boolean().optional(),
});

export async function saveSplitConfigAction(formData: FormData) {
  const session = await requireAuthenticatedSession(["admin"]);

  const parsed = splitConfigSchema.safeParse({
    defaultFeePercent: formData.get("defaultFeePercent"),
    holdPeriodDays: formData.get("holdPeriodDays"),
    minPayoutAmount: formData.get("minPayoutAmount"),
    payoutAutoApprove: formData.get("payoutAutoApprove") === "on",
  });

  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => i.message).join(", ");
    redirect(`/admin?tab=financeiro&status=error&message=${encodeURIComponent(message)}`);
  }

  try {
    await updateSplitConfig({ ...parsed.data, updatedBy: session.email });
    revalidateAdminRoutes();
    redirect("/admin?tab=financeiro&status=ok&saved=split-config");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao salvar config";
    redirect(`/admin?tab=financeiro&status=error&message=${encodeURIComponent(message)}`);
  }
}

// ── Merchant Override ────────────────────────────────────────────

const overrideSchema = z.object({
  merchantId: z.string().uuid(),
  feePercent: z.coerce.number().min(0).max(100),
  notes: z.string().optional(),
});

export async function saveMerchantOverrideAction(formData: FormData) {
  const session = await requireAuthenticatedSession(["admin"]);

  const parsed = overrideSchema.safeParse({
    merchantId: formData.get("merchantId"),
    feePercent: formData.get("feePercent"),
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => i.message).join(", ");
    redirect(`/admin?tab=financeiro&status=error&message=${encodeURIComponent(message)}`);
  }

  try {
    await upsertMerchantOverride(
      parsed.data.merchantId,
      parsed.data.feePercent,
      parsed.data.notes,
      session.email,
    );
    revalidateAdminRoutes();
    redirect("/admin?tab=financeiro&status=ok&saved=override");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao salvar override";
    redirect(`/admin?tab=financeiro&status=error&message=${encodeURIComponent(message)}`);
  }
}

export async function deleteMerchantOverrideAction(formData: FormData) {
  await requireAuthenticatedSession(["admin"]);

  const merchantId = String(formData.get("merchantId") ?? "");
  if (!merchantId) {
    redirect("/admin?tab=financeiro&status=error&message=merchantId+required");
  }

  try {
    await deleteMerchantOverride(merchantId);
    revalidateAdminRoutes();
    redirect("/admin?tab=financeiro&status=ok&saved=override-deleted");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao remover override";
    redirect(`/admin?tab=financeiro&status=error&message=${encodeURIComponent(message)}`);
  }
}

// ── Payout Actions ───────────────────────────────────────────────

export async function approvePayoutAction(formData: FormData) {
  const session = await requireAuthenticatedSession(["admin"]);

  const payoutId = String(formData.get("payoutId") ?? "");
  if (!payoutId) {
    redirect("/admin?tab=saques&status=error&message=payoutId+required");
  }

  try {
    await approvePayout(payoutId, session.email);
    revalidateAdminRoutes();
    redirect("/admin?tab=saques&status=ok&saved=payout-approved");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao aprovar saque";
    redirect(`/admin?tab=saques&status=error&message=${encodeURIComponent(message)}`);
  }
}

export async function rejectPayoutAction(formData: FormData) {
  await requireAuthenticatedSession(["admin"]);

  const payoutId = String(formData.get("payoutId") ?? "");
  const reason = String(formData.get("reason") ?? "Rejeitado pelo admin");

  if (!payoutId) {
    redirect("/admin?tab=saques&status=error&message=payoutId+required");
  }

  try {
    await rejectPayout(payoutId, reason);
    revalidateAdminRoutes();
    redirect("/admin?tab=saques&status=ok&saved=payout-rejected");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao rejeitar saque";
    redirect(`/admin?tab=saques&status=error&message=${encodeURIComponent(message)}`);
  }
}

export async function completePayoutAction(formData: FormData) {
  await requireAuthenticatedSession(["admin"]);

  const payoutId = String(formData.get("payoutId") ?? "");
  const pixTransferId = String(formData.get("pixTransferId") ?? "") || undefined;
  const notes = String(formData.get("notes") ?? "") || undefined;

  if (!payoutId) {
    redirect("/admin?tab=saques&status=error&message=payoutId+required");
  }

  try {
    await completePayout(payoutId, pixTransferId, notes);
    revalidateAdminRoutes();
    redirect("/admin?tab=saques&status=ok&saved=payout-completed");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao completar saque";
    redirect(`/admin?tab=saques&status=error&message=${encodeURIComponent(message)}`);
  }
}
