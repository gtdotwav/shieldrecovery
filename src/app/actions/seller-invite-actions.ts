"use server";

import { redirect } from "next/navigation";

import { registerSellerLogin } from "@/server/auth/identities";
import { hashPlatformPassword } from "@/server/auth/passwords";
import { setAuthenticatedSession } from "@/server/auth/session";
import { getPaymentRecoveryService } from "@/server/recovery/services/payment-recovery-service";

export async function completeSellerInviteAction(formData: FormData) {
  const token = String(formData.get("token") ?? "").trim();
  const displayName = String(formData.get("displayName") ?? "").trim();
  const agentName = String(formData.get("agentName") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();
  const confirmPassword = String(formData.get("confirmPassword") ?? "").trim();

  if (!token) {
    redirect("/login?error=invalid");
  }

  if (password.length < 8) {
    redirect(`/invite/${encodeURIComponent(token)}?error=password`);
  }

  if (password !== confirmPassword) {
    redirect(`/invite/${encodeURIComponent(token)}?error=confirm`);
  }

  let seller;
  try {
    seller = await getPaymentRecoveryService().completeSellerInvite({
      token,
      displayName,
      agentName,
      passwordHash: hashPlatformPassword(password),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "invalid";
    const reason =
      message.toLowerCase().includes("expired")
        ? "expired"
        : message.toLowerCase().includes("no longer active")
          ? "inactive"
          : "invalid";
    redirect(`/invite/${encodeURIComponent(token)}?error=${reason}`);
  }

  await setAuthenticatedSession(seller.email, "seller");
  await registerSellerLogin(seller.email);
  redirect("/onboarding?invited=1");
}
