"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAuthenticatedSession } from "@/server/auth/session";
import { getPaymentRecoveryService } from "@/server/recovery/services/payment-recovery-service";
import { getStorageService } from "@/server/recovery/services/storage";
import type { SellerAutonomyMode } from "@/server/recovery/types";
import { hashPlatformPassword } from "@/server/auth/passwords";

const saveSellerUserSchema = z.object({
  email: z.string().email("Email invalido"),
  displayName: z.string().optional(),
  agentName: z.string().min(1, "Nome do agente obrigatorio"),
  password: z.string().optional(),
  active: z.boolean(),
});

const createSellerInviteSchema = z.object({
  email: z.string().email("Email do seller obrigatorio"),
});

function revalidateAdminRoutes() {
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath("/leads");
  revalidatePath("/inbox");
  revalidatePath("/ai");
}

export async function saveSellerUserAction(formData: FormData) {
  await requireAuthenticatedSession(["admin"]);

  const parsed = saveSellerUserSchema.safeParse({
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    displayName: String(formData.get("displayName") ?? "").trim() || undefined,
    agentName: String(formData.get("agentName") ?? "").trim(),
    password: String(formData.get("password") ?? "").trim() || undefined,
    active: formData.get("active") === "on",
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Seller invalido";
    redirect(`/admin?status=error&message=${encodeURIComponent(message)}`);
  }

  const { email, displayName, agentName, password, active } = parsed.data;

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

  const emailParsed = createSellerInviteSchema.safeParse({
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
  });

  if (!emailParsed.success) {
    const message = emailParsed.error.issues[0]?.message ?? "Email do seller obrigatorio";
    redirect(`/admin?status=error&message=${encodeURIComponent(message)}`);
  }

  const email = emailParsed.data.email;
  const suggestedDisplayName = String(formData.get("suggestedDisplayName") ?? "").trim();
  const agentName = String(formData.get("agentName") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const expiresInDays = Number(String(formData.get("expiresInDays") ?? "7"));

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
