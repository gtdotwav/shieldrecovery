import { z } from "zod";

import type { CheckoutService } from "../services/checkout-service";
import {
  CHECKOUT_METHOD_TYPES,
  CHECKOUT_SESSION_SOURCES,
  CHECKOUT_TRACKING_EVENTS,
} from "../types";

type JsonResponse = {
  status: number;
  body: unknown;
};

// ─── Zod schemas ──────────────────────────────────────────────────

const createSessionSchema = z.object({
  amount: z.number().positive("amount deve ser positivo"),
  currency: z.string().min(3).max(3).optional(),
  description: z.string().min(1, "description é obrigatório"),
  customerName: z.string().min(1, "customerName é obrigatório"),
  customerEmail: z.string().email("customerEmail inválido"),
  customerPhone: z.string().min(8, "customerPhone inválido"),
  customerDocument: z.string().optional(),
  source: z.enum(CHECKOUT_SESSION_SOURCES),
  sourceReferenceId: z.string().optional(),
  expiresInMinutes: z.number().positive().optional(),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const processPaymentSchema = z.object({
  sessionId: z.string().uuid("sessionId inválido"),
  providerId: z.string().uuid("providerId inválido"),
  methodType: z.enum(CHECKOUT_METHOD_TYPES),
  installments: z.number().int().min(1).max(24).optional(),
  cardToken: z.string().optional(),
  customerDocument: z.string().optional(),
});

const trackEventSchema = z.object({
  sessionId: z.string().uuid("sessionId inválido"),
  eventType: z.enum(CHECKOUT_TRACKING_EVENTS),
  methodType: z.enum(CHECKOUT_METHOD_TYPES).optional(),
  providerId: z.string().uuid().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// ─── Handlers ─────────────────────────────────────────────────────

/**
 * POST /api/v1/sessions
 * Creates a new checkout session. Requires authentication.
 * The route handler must resolve `merchantId` from the authenticated API key
 * and pass it here — the client does NOT send merchantId in the body.
 */
export async function handleCreateSession(
  service: CheckoutService,
  body: unknown,
  merchantId: string,
): Promise<JsonResponse> {
  if (!merchantId) {
    return {
      status: 401,
      body: { error: "Merchant não autenticado" },
    };
  }

  let input: z.infer<typeof createSessionSchema>;
  try {
    input = createSessionSchema.parse(body);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return {
        status: 400,
        body: {
          error: "Dados inválidos",
          details: err.issues.map((i) => ({
            field: i.path.join("."),
            message: i.message,
          })),
        },
      };
    }
    return { status: 400, body: { error: "Corpo da requisição inválido" } };
  }

  try {
    const result = await service.createSession({ ...input, merchantId });
    return { status: 201, body: result };
  } catch (err) {
    return {
      status: 500,
      body: {
        error: err instanceof Error ? err.message : "Erro ao criar sessão",
      },
    };
  }
}

/**
 * GET /api/checkout/session/[shortId]
 * Returns session details including providers and installment options.
 */
export async function handleGetSession(
  service: CheckoutService,
  shortId: string,
): Promise<JsonResponse> {
  if (!shortId) {
    return { status: 400, body: { error: "shortId é obrigatório" } };
  }

  try {
    const result = await service.getSession(shortId);
    if (!result) {
      return { status: 404, body: { error: "Sessão não encontrada" } };
    }
    return { status: 200, body: result };
  } catch (err) {
    return {
      status: 500,
      body: {
        error: err instanceof Error ? err.message : "Erro ao buscar sessão",
      },
    };
  }
}

/**
 * POST /api/checkout/process
 * Processes a payment for a session.
 */
export async function handleProcessPayment(
  service: CheckoutService,
  body: unknown,
): Promise<JsonResponse> {
  let input: z.infer<typeof processPaymentSchema>;
  try {
    input = processPaymentSchema.parse(body);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return {
        status: 400,
        body: {
          error: "Dados inválidos",
          details: err.issues.map((i) => ({
            field: i.path.join("."),
            message: i.message,
          })),
        },
      };
    }
    return { status: 400, body: { error: "Corpo da requisição inválido" } };
  }

  try {
    const result = await service.processPayment(input);
    return { status: 200, body: result };
  } catch (err) {
    return {
      status: 500,
      body: {
        error:
          err instanceof Error ? err.message : "Erro ao processar pagamento",
      },
    };
  }
}

/**
 * POST /api/checkout/track
 * Records a tracking event.
 */
export async function handleTrackEvent(
  service: CheckoutService,
  body: unknown,
): Promise<JsonResponse> {
  let input: z.infer<typeof trackEventSchema>;
  try {
    input = trackEventSchema.parse(body);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return {
        status: 400,
        body: {
          error: "Dados inválidos",
          details: err.issues.map((i) => ({
            field: i.path.join("."),
            message: i.message,
          })),
        },
      };
    }
    return { status: 400, body: { error: "Corpo da requisição inválido" } };
  }

  try {
    await service.trackEvent(input);
    return { status: 204, body: null };
  } catch (err) {
    return {
      status: 500,
      body: {
        error: err instanceof Error ? err.message : "Erro ao registrar evento",
      },
    };
  }
}

/**
 * POST /api/checkout/webhook/[providerSlug]
 * Handles payment gateway webhooks.
 */
export async function handleWebhook(
  service: CheckoutService,
  providerSlug: string,
  payload: unknown,
  headers: Record<string, string>,
): Promise<JsonResponse> {
  if (!providerSlug) {
    return { status: 400, body: { error: "providerSlug é obrigatório" } };
  }

  try {
    const result = await service.handleProviderWebhook(
      providerSlug,
      payload,
      headers,
    );

    if (!result.handled) {
      return { status: 400, body: { error: "Webhook não processado" } };
    }

    return { status: 200, body: { ok: true, sessionId: result.sessionId } };
  } catch (err) {
    return {
      status: 500,
      body: {
        error: err instanceof Error ? err.message : "Erro no webhook",
      },
    };
  }
}

/**
 * GET /api/checkout/analytics
 * Returns checkout conversion analytics.
 */
export async function handleGetAnalytics(
  service: CheckoutService,
  fromDate?: string,
  toDate?: string,
): Promise<JsonResponse> {
  try {
    const analytics = await service.getAnalytics(fromDate, toDate);
    return { status: 200, body: analytics };
  } catch (err) {
    return {
      status: 500,
      body: {
        error:
          err instanceof Error ? err.message : "Erro ao buscar analytics",
      },
    };
  }
}
