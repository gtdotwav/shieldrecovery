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
  createCheckoutSession,
} from "@/server/checkout";

async function getSellerCheckoutOverrides(email: string) {
  const identity = await getSellerIdentityByEmail(email);
  if (!identity) throw new Error("Seller não encontrado");

  const storage = getStorageService();
  const allControls = await storage.getSellerAdminControls();
  const controls = allControls.find((c) => c.sellerKey === identity.agentName);
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
    console.error("[requestPayoutAction]", err instanceof Error ? err.message : err);
    redirect("/financeiro?status=error&message=Erro%20ao%20solicitar%20saque");
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

// ── Create Checkout Link ─────────────────────────────────────────

const createCheckoutLinkSchema = z.object({
  amount: z.coerce.number().positive(),
  description: z.string().min(1),
  customerName: z.string().optional(),
  customerEmail: z.string().optional(),
  customerPhone: z.string().optional(),
});

export async function createCheckoutLinkAction(formData: FormData) {
  const session = await requireAuthenticatedSession(["admin", "seller"]);

  const parsed = createCheckoutLinkSchema.safeParse({
    amount: formData.get("amount"),
    description: formData.get("description"),
    customerName: formData.get("customerName") || undefined,
    customerEmail: formData.get("customerEmail") || undefined,
    customerPhone: formData.get("customerPhone") || undefined,
  });

  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => i.message).join(", ");
    redirect(`/financeiro?status=error&message=${encodeURIComponent(message)}`);
  }

  try {
    const overrides = await getSellerCheckoutOverrides(session.email);
    const result = await createCheckoutSession(
      {
        amount: parsed.data.amount,
        description: parsed.data.description,
        customerName: parsed.data.customerName ?? "",
        customerEmail: parsed.data.customerEmail ?? "",
        customerPhone: parsed.data.customerPhone ?? "",
        source: "direct",
      },
      overrides,
    );
    revalidatePath("/financeiro");
    redirect(`/financeiro?status=ok&saved=link-created&checkoutUrl=${encodeURIComponent(result.checkoutUrl)}`);
  } catch (err) {
    console.error("[createCheckoutLinkAction]", err instanceof Error ? err.message : err);
    redirect("/financeiro?status=error&message=Erro%20ao%20criar%20link%20de%20pagamento");
  }
}

// ── Create PIX Account ───────────────────────────────────────────

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
    console.error("[createPixAccountAction]", err instanceof Error ? err.message : err);
    redirect("/financeiro?status=error&message=Erro%20ao%20cadastrar%20conta%20PIX");
  }
}
