import { appEnv } from "@/server/recovery/config";

// ── Checkout Platform API Client ──────────────────────────────────
// Calls the standalone checkout platform (Next.js app) via its public
// API to create payment sessions. Replaces the old embedded module.

export type CreateCheckoutSessionInput = {
  amount: number;
  currency?: string;
  description: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerDocument?: string;
  source?: "recovery" | "direct" | "api";
  sourceReferenceId?: string;
  metadata?: Record<string, unknown>;
};

export type CreateCheckoutSessionResult = {
  sessionId: string;
  shortId: string;
  checkoutUrl: string;
  expiresAt: string;
};

/**
 * Create a checkout session via the standalone checkout platform API.
 *
 * Uses `POST /api/v1/sessions` with the merchant's secret API key.
 * The checkout platform handles PagNet/Stripe integration, session
 * management, and the hosted checkout page.
 */
export async function createCheckoutSession(
  input: CreateCheckoutSessionInput,
): Promise<CreateCheckoutSessionResult> {
  const baseUrl = appEnv.checkoutPlatformUrl;
  const apiKey = appEnv.checkoutPlatformApiKey;

  if (!baseUrl || !apiKey) {
    throw new Error(
      "Checkout platform not configured. Set CHECKOUT_PLATFORM_URL and CHECKOUT_PLATFORM_API_KEY.",
    );
  }

  const response = await fetch(`${baseUrl}/api/v1/sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    },
    body: JSON.stringify({
      amount: input.amount,
      currency: input.currency ?? "BRL",
      description: input.description,
      customerName: input.customerName,
      customerEmail: input.customerEmail,
      customerPhone: input.customerPhone,
      customerDocument: input.customerDocument,
      source: input.source ?? "recovery",
      sourceReferenceId: input.sourceReferenceId,
      metadata: input.metadata,
    }),
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Checkout platform createSession failed (${response.status}): ${errorBody}`,
    );
  }

  return response.json();
}
