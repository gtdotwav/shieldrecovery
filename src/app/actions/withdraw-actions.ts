"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";

import { requireAuthenticatedSession } from "@/server/auth/session";
import { appEnv } from "@/server/recovery/config";
import {
  createWithdraw,
  cancelWithdraw,
  getBalance,
  listWithdraws,
  type PixKeyType,
} from "@/server/pagnet/withdraw-client";

function db() {
  return createClient(appEnv.supabaseUrl, appEnv.supabaseServiceRoleKey);
}

/* ── Get balance ── */

export async function getBalanceAction() {
  await requireAuthenticatedSession(["admin"]);

  try {
    const balance = await getBalance();
    return { ok: true as const, data: balance };
  } catch (err) {
    return { ok: false as const, error: String(err) };
  }
}

/* ── Create withdraw ── */

export async function createWithdrawAction(formData: FormData) {
  await requireAuthenticatedSession(["admin"]);

  const amountStr = formData.get("amount") as string;
  const pixKey = (formData.get("pixKey") as string)?.trim();
  const pixKeyType = formData.get("pixKeyType") as PixKeyType;
  const description = (formData.get("description") as string)?.trim() || undefined;
  const contactId = (formData.get("contactId") as string)?.trim() || null;

  if (!amountStr || !pixKey || !pixKeyType) {
    return { ok: false as const, error: "Campos obrigatórios: valor, chave PIX, tipo de chave" };
  }

  const amount = Math.round(parseFloat(amountStr.replace(",", ".")) * 100);
  if (!amount || amount <= 0) {
    return { ok: false as const, error: "Valor inválido" };
  }

  try {
    const result = await createWithdraw({ amount, pixKey, pixKeyType, description });

    // Log locally
    const supabase = db();
    await supabase.from("withdraw_history").insert({
      pagnet_withdraw_id: String(result.id),
      contact_id: contactId,
      amount,
      pix_key: pixKey,
      pix_key_type: pixKeyType,
      status: result.status ?? "pending",
      description,
      pagnet_response: result,
    });

    // Log CRM activity
    if (contactId) {
      await supabase.from("crm_activities").insert({
        contact_id: contactId,
        type: "withdraw",
        description: `Saque de R$ ${(amount / 100).toFixed(2)} via PIX (${pixKeyType}: ${pixKey})`,
        metadata: { withdrawId: result.id, amount, pixKey },
      });
    }

    revalidatePath("/admin/withdraw");
    return { ok: true as const, data: result };
  } catch (err) {
    // Log failed attempt
    const supabase = db();
    await supabase.from("withdraw_history").insert({
      contact_id: contactId,
      amount,
      pix_key: pixKey,
      pix_key_type: pixKeyType,
      status: "failed",
      description,
      error_reason: String(err),
    });

    return { ok: false as const, error: String(err) };
  }
}

/* ── Cancel withdraw ── */

export async function cancelWithdrawAction(withdrawId: string, localId: string) {
  await requireAuthenticatedSession(["admin"]);

  try {
    const result = await cancelWithdraw(withdrawId);

    const supabase = db();
    await supabase
      .from("withdraw_history")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", localId);

    revalidatePath("/admin/withdraw");
    return { ok: true as const, data: result };
  } catch (err) {
    return { ok: false as const, error: String(err) };
  }
}

/* ── List withdraw history (local) ── */

export async function listWithdrawHistoryAction(page = 1, limit = 50) {
  await requireAuthenticatedSession(["admin"]);

  const supabase = db();
  const from = (page - 1) * limit;

  const { data, error, count } = await supabase
    .from("withdraw_history")
    .select("*, pix_contacts(name)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + limit - 1);

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, data: data ?? [], total: count ?? 0 };
}

/* ── List from PagNet (remote) ── */

export async function listWithdrawsRemoteAction(page = 1) {
  await requireAuthenticatedSession(["admin"]);

  try {
    const result = await listWithdraws({ page, limit: 50 });
    return { ok: true as const, data: result };
  } catch (err) {
    return { ok: false as const, error: String(err) };
  }
}
