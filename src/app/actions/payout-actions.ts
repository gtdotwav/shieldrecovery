"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAuthenticatedSession } from "@/server/auth/session";
import { getSellerIdentityByEmail } from "@/server/auth/identities";
import { getStorageService } from "@/server/recovery/services/storage";
import {
  requestSellerPayout,
  createSellerPixAccount,
} from "@/server/checkout";

async function getSellerCheckoutOverrides(email: string) {
  const identity = await getSellerIdentityByEmail(email);
  if (!identity) throw new Error("Seller não encontrado");

  const storage = getStorageService();
  const controls = await storage.getSellerAdminControls(identity.agentName);
  if (!controls?.checkoutApiKey) throw new Error("Checkout não configurado para este seller");

  return {
    baseUrl: controls.checkoutUrl || undefined,
    apiKey: controls.checkoutApiKey,
  };
}

// ── Request Payout ───────────────────────────────────────────────

const requestPayoutSchema = z.object({
  amount: z.coerce.number().positive(),
  pixAccountId: z.string().uuid(),
});

export async function requestPayoutAction(formData: FormData) {
  const session = await requireAuthenticatedSession(["admin", "seller"]);

  const parsed = requestPayoutSchema.safeParse({
    amount: formData.get("amount"),
    pixAccountId: formData.get("pixAccountId"),
  });

  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => i.message).join(", ");
    redirect(`/financeiro?status=error&message=${encodeURIComponent(message)}`);
  }

  try {
    const overrides = await getSellerCheckoutOverrides(session.email);
    await requestSellerPayout(parsed.data.amount, parsed.data.pixAccountId, overrides);
    revalidatePath("/financeiro");
    redirect("/financeiro?status=ok&saved=payout-requested");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao solicitar saque";
    redirect(`/financeiro?status=error&message=${encodeURIComponent(message)}`);
  }
}

// ── Create PIX Account ───────────────────────────────────────────

const createPixSchema = z.object({
  pixKeyType: z.enum(["cpf", "cnpj", "email", "phone", "random"]),
  pixKey: z.string().min(1),
  holderName: z.string().min(1),
  holderDocument: z.string().min(1),
  bankName: z.string().optional(),
});

export async function createPixAccountAction(formData: FormData) {
  const session = await requireAuthenticatedSession(["admin", "seller"]);

  const parsed = createPixSchema.safeParse({
    pixKeyType: formData.get("pixKeyType"),
    pixKey: formData.get("pixKey"),
    holderName: formData.get("holderName"),
    holderDocument: formData.get("holderDocument"),
    bankName: formData.get("bankName") || undefined,
  });

  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => i.message).join(", ");
    redirect(`/financeiro?status=error&message=${encodeURIComponent(message)}`);
  }

  try {
    const overrides = await getSellerCheckoutOverrides(session.email);
    await createSellerPixAccount(parsed.data, overrides);
    revalidatePath("/financeiro");
    redirect("/financeiro?status=ok&saved=pix-account-created");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao cadastrar conta PIX";
    redirect(`/financeiro?status=error&message=${encodeURIComponent(message)}`);
  }
}
