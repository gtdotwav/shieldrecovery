"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAuthenticatedSession } from "@/server/auth/session";
import { getPaymentRecoveryService } from "@/server/recovery/services/payment-recovery-service";
import { getStorageService } from "@/server/recovery/services/storage";
import type { SellerAutonomyMode } from "@/server/recovery/types";
import { hashPlatformPassword } from "@/server/auth/passwords";

function revalidateAdminRoutes() {
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath("/leads");
  revalidatePath("/inbox");
  revalidatePath("/ai");
}

export async function saveSellerUserAction(formData: FormData) {
  await requireAuthenticatedSession(["admin"]);

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const displayName = String(formData.get("displayName") ?? "").trim();
  const agentName = String(formData.get("agentName") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();
  const active = formData.get("active") === "on";

  if (!email || !agentName) {
    redirect("/admin?status=error&message=Seller%20invalido");
  }

  const existingSeller = await getStorageService().findSellerUserByEmail(email);

  if (!existingSeller && !password) {
    redirect("/admin?status=error&message=Senha%20inicial%20obrigatoria");
  }

  const input = {
    email,
    displayName: displayName || agentName,
    agentName,
    active,
    passwordHash: password ? hashPlatformPassword(password) : undefined,
  };

  await getPaymentRecoveryService().saveSellerUser(input);
  await getPaymentRecoveryService().saveSellerAdminControl({
    sellerKey: agentName,
    sellerName: agentName,
    sellerEmail: email,
    active,
  });

  revalidateAdminRoutes();
  redirect(`/admin?status=ok&saved=${encodeURIComponent(email)}`);
}

export async function createSellerInviteAction(formData: FormData) {
  const session = await requireAuthenticatedSession(["admin"]);

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const suggestedDisplayName = String(formData.get("suggestedDisplayName") ?? "").trim();
  const agentName = String(formData.get("agentName") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const expiresInDays = Number(String(formData.get("expiresInDays") ?? "7"));

  if (!email) {
    redirect("/admin?status=error&message=Email%20do%20seller%20obrigatorio");
  }

  try {
    await getPaymentRecoveryService().createSellerInvite({
      email,
      suggestedDisplayName: suggestedDisplayName || undefined,
      agentName: agentName || undefined,
      note: note || undefined,
      createdByEmail: session.email,
      expiresInDays: Number.isFinite(expiresInDays) ? expiresInDays : 7,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Nao foi possivel gerar o convite";
    redirect(`/admin?status=error&message=${encodeURIComponent(message)}`);
  }

  revalidateAdminRoutes();
  redirect(`/admin?status=ok&saved=${encodeURIComponent(email)}&mode=invite`);
}

export async function saveSellerControlAction(formData: FormData) {
  await requireAuthenticatedSession(["admin"]);

  const sellerKey = String(formData.get("sellerKey") ?? "").trim();
  const sellerName = String(formData.get("sellerName") ?? "").trim();
  const sellerEmail = String(formData.get("sellerEmail") ?? "").trim();
  const recoveryTargetPercent = Number(
    String(formData.get("recoveryTargetPercent") ?? "18"),
  );
  const reportedRecoveryRateRaw = String(
    formData.get("reportedRecoveryRatePercent") ?? "",
  ).trim();
  const maxAssignedLeads = Number(String(formData.get("maxAssignedLeads") ?? "30"));
  const autonomyMode = String(formData.get("autonomyMode") ?? "autonomous") as SellerAutonomyMode;
  const notes = String(formData.get("notes") ?? "").trim();

  if (!sellerKey) {
    redirect("/admin?status=error&message=Seller%20invalido");
  }

  await getPaymentRecoveryService().saveSellerAdminControl({
    sellerKey,
    sellerName,
    sellerEmail: sellerEmail || undefined,
    recoveryTargetPercent,
    reportedRecoveryRatePercent: reportedRecoveryRateRaw
      ? Number(reportedRecoveryRateRaw)
      : undefined,
    maxAssignedLeads,
    active: formData.get("active") === "on",
    inboxEnabled: formData.get("inboxEnabled") === "on",
    automationsEnabled: formData.get("automationsEnabled") === "on",
    autonomyMode:
      autonomyMode === "assisted" ||
      autonomyMode === "supervised" ||
      autonomyMode === "autonomous"
        ? autonomyMode
        : "autonomous",
    notes: notes || undefined,
  });

  revalidateAdminRoutes();
  redirect(`/admin?status=ok&saved=${encodeURIComponent(sellerKey)}`);
}
