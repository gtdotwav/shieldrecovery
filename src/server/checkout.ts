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
  source?: "recovery" | "direct" | "api" | "callcenter";
  sourceReferenceId?: string;
  couponCode?: string;
  discountPercent?: number;
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
  overrides?: { baseUrl?: string; apiKey?: string },
): Promise<CreateCheckoutSessionResult> {
  const baseUrl = overrides?.baseUrl?.trim() || appEnv.checkoutPlatformUrl;
  const apiKey = overrides?.apiKey?.trim() || appEnv.checkoutPlatformApiKey;

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
      couponCode: input.couponCode,
      discountPercent: input.discountPercent,
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

// ── Merchant-facing financial endpoints ──────────────────────────

async function checkoutFetch(
  path: string,
  overrides?: { baseUrl?: string; apiKey?: string },
  init?: RequestInit,
) {
  const baseUrl = overrides?.baseUrl?.trim() || appEnv.checkoutPlatformUrl;
  const apiKey = overrides?.apiKey?.trim() || appEnv.checkoutPlatformApiKey;

  if (!baseUrl || !apiKey) {
    throw new Error("Checkout platform not configured.");
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
      ...init?.headers,
    },
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Checkout API ${path} failed (${response.status}): ${errorBody}`);
  }

  return response.json();
}

export async function getSellerWallet(overrides?: { baseUrl?: string; apiKey?: string }) {
  return checkoutFetch("/api/v1/merchants/wallet", overrides);
}

export async function getSellerSplits(
  page: number = 1,
  overrides?: { baseUrl?: string; apiKey?: string },
) {
  return checkoutFetch(`/api/v1/merchants/splits?page=${page}&limit=20`, overrides);
}

export async function getSellerPayouts(overrides?: { baseUrl?: string; apiKey?: string }) {
  return checkoutFetch("/api/v1/merchants/payouts", overrides);
}

export async function requestSellerPayout(
  amount: number,
  pixAccountId: string,
  overrides?: { baseUrl?: string; apiKey?: string },
) {
  return checkoutFetch("/api/v1/merchants/payouts", overrides, {
    method: "POST",
    body: JSON.stringify({ amount, pixAccountId }),
  });
}

export async function getSellerPixAccounts(overrides?: { baseUrl?: string; apiKey?: string }) {
  return checkoutFetch("/api/v1/merchants/pix-accounts", overrides);
}

export async function createSellerPixAccount(
  data: {
    pixKeyType: string;
    pixKey: string;
    holderName: string;
    holderDocument: string;
    bankName?: string;
  },
  overrides?: { baseUrl?: string; apiKey?: string },
) {
  return checkoutFetch("/api/v1/merchants/pix-accounts", overrides, {
    method: "POST",
    body: JSON.stringify(data),
  });
}
