import { randomUUID } from "node:crypto";

import { platformBrand } from "@/lib/platform";
import { appEnv } from "@/server/recovery/config";
import { HttpError } from "@/server/recovery/utils/http-error";

type PagouBuyer = {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  document?: string | null;
};

type PagouTransactionInput = {
  amount: number;
  currency?: string;
  method: "pix" | "credit_card";
  externalRef: string;
  notifyUrl?: string;
  description: string;
  buyer: PagouBuyer;
  token?: string;
  installments?: number;
  metadata?: Record<string, unknown>;
};

export type PagouTransactionSnapshot = {
  transactionId: string;
  status: string;
  amount: number;
  currency: string;
  method: string;
  externalRef?: string;
  paymentUrl?: string;
  pixCode?: string;
  pixQrCode?: string;
  pixExpiresAt?: string;
  buyerName?: string;
  buyerEmail?: string;
  buyerPhone?: string;
  buyerDocument?: string;
  raw: Record<string, unknown>;
};

const DEFAULT_PRODUCTION_BASE_URL = "https://api.pagou.ai";
const DEFAULT_SANDBOX_BASE_URL = "https://api.sandbox.pagou.ai";

export async function createPagouTransaction(
  input: PagouTransactionInput,
): Promise<PagouTransactionSnapshot> {
  const response = await pagouFetch("/v2/transactions", {
    method: "POST",
    body: JSON.stringify({
      external_ref: input.externalRef,
      amount: input.amount,
      currency: input.currency ?? "BRL",
      method: input.method,
      notify_url: input.notifyUrl,
      installments: input.installments,
      token: input.token,
      buyer: buildBuyerPayload(input.buyer),
      products: [
        {
          name: input.description,
          price: input.amount,
          quantity: 1,
        },
      ],
      metadata: input.metadata ? JSON.stringify(input.metadata) : undefined,
    }),
    headers: {
      "X-Request-Id": `${platformBrand.slug}_${randomUUID()}`,
    },
  });

  return parsePagouTransactionEnvelope(response);
}

export async function retrievePagouTransaction(
  transactionId: string,
): Promise<PagouTransactionSnapshot> {
  const response = await pagouFetch(`/v2/transactions/${transactionId}`, {
    method: "GET",
  });

  return parsePagouTransactionEnvelope(response);
}

function buildBuyerPayload(buyer: PagouBuyer) {
  const name = buyer.name?.trim();
  const email = buyer.email?.trim();
  const phone = normalizeDigits(buyer.phone);
  const document = normalizeDigits(buyer.document);

  return {
    ...(name ? { name } : {}),
    ...(email ? { email } : {}),
    ...(phone ? { phone } : {}),
    ...(document
      ? {
          document: {
            type: document.length > 11 ? "CNPJ" : "CPF",
            number: document,
          },
        }
      : {}),
  };
}

async function pagouFetch(path: string, init: RequestInit) {
  if (!appEnv.pagouAiSecretKey) {
    throw new HttpError(
      500,
      "Pagou.ai nao configurado. Defina PAGOUAI_SECRET_KEY no ambiente.",
    );
  }

  const response = await fetch(`${resolvePagouBaseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${appEnv.pagouAiSecretKey}`,
      "Content-Type": "application/json",
      Accept: "application/json, application/problem+json",
      ...(init.headers ?? {}),
    },
    signal: AbortSignal.timeout(20_000),
  });

  if (response.ok) {
    return response.json();
  }

  const bodyText = await response.text();

  try {
    const body = JSON.parse(bodyText) as Record<string, unknown>;
    const detail =
      typeof body.detail === "string"
        ? body.detail
        : typeof body.message === "string"
          ? body.message
          : bodyText;

    throw new HttpError(response.status, detail || "Erro ao chamar a Pagou.ai.", body);
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }

    throw new HttpError(
      response.status,
      bodyText || "Erro ao chamar a Pagou.ai.",
    );
  }
}

function parsePagouTransactionEnvelope(payload: unknown): PagouTransactionSnapshot {
  const envelope = asRecord(payload);
  const data = asRecord(envelope?.data) ?? envelope;
  const buyer =
    asRecord(data?.buyer) ??
    asRecord(data?.customer) ??
    asRecord(data?.payer) ??
    undefined;
  const document =
    asRecord(buyer?.document) ??
    asRecord(data?.document) ??
    undefined;
  const pix =
    asRecord(data?.pix) ??
    asRecord(asRecord(data?.payment)?.pix) ??
    undefined;

  const transactionId = pickString(
    data?.id,
    data?.transaction_id,
    data?.transactionId,
  );

  if (!transactionId) {
    throw new HttpError(502, "Resposta invalida da Pagou.ai: transaction id ausente.", {
      payload,
    });
  }

  return {
    transactionId,
    status: pickString(data?.status, data?.payment_status) ?? "unknown",
    amount: pickNumber(data?.amount, data?.value, data?.paid_amount) ?? 0,
    currency: pickString(data?.currency, data?.currency_code) ?? "BRL",
    method: pickString(data?.method, data?.payment_method) ?? "unknown",
    externalRef: pickString(data?.external_ref, data?.correlation_id),
    paymentUrl: pickString(
      data?.secure_url,
      data?.secureUrl,
      data?.paymentLink,
      data?.payment_link,
      data?.checkout_url,
      data?.checkoutUrl,
      pix?.url,
    ),
    pixCode: pickString(
      pix?.qr_code,
      pix?.qrcode,
      pix?.copy_paste,
      pix?.copyPaste,
      data?.pix_qr_code,
      data?.pixCode,
    ),
    pixQrCode: pickString(
      pix?.image,
      pix?.qr_code_image,
      data?.pixQrCode,
      data?.pix_qr_code_image,
    ),
    pixExpiresAt: pickString(
      pix?.expires_at,
      pix?.expirationDate,
      pix?.expiration_date,
      data?.expires_at,
      data?.expiration_date,
    ),
    buyerName: pickString(buyer?.name, data?.buyer_name, data?.name),
    buyerEmail: pickString(buyer?.email, data?.buyer_email, data?.email),
    buyerPhone: pickString(buyer?.phone, data?.buyer_phone, data?.phone),
    buyerDocument: pickString(
      document?.number,
      data?.document_number,
      data?.document,
    ),
    raw: data ?? {},
  };
}

function resolvePagouBaseUrl() {
  if (appEnv.pagouAiApiBaseUrl) {
    return appEnv.pagouAiApiBaseUrl;
  }

  return appEnv.pagouAiEnvironment === "sandbox"
    ? DEFAULT_SANDBOX_BASE_URL
    : DEFAULT_PRODUCTION_BASE_URL;
}

function normalizeDigits(value?: string | null) {
  return value?.replace(/\D+/g, "").trim() ?? "";
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, unknown>;
}

function pickString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
}

function pickNumber(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }

  return undefined;
}
