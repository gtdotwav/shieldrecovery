import type { CheckoutService } from "../services/checkout-service";
import type {
  CreateSessionInput,
  ProcessPaymentInput,
  TrackEventInput,
} from "../types";

type JsonResponse = {
  status: number;
  body: unknown;
};

/**
 * POST /api/checkout/session
 * Creates a new checkout session. Requires authentication.
 */
export async function handleCreateSession(
  service: CheckoutService,
  body: unknown,
): Promise<JsonResponse> {
  const input = body as CreateSessionInput;

  if (!input.amount || !input.customerName || !input.customerPhone) {
    return {
      status: 400,
      body: { error: "amount, customerName, customerPhone são obrigatórios" },
    };
  }

  try {
    const result = await service.createSession(input);
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
  const input = body as ProcessPaymentInput;

  if (!input.sessionId || !input.providerId || !input.methodType) {
    return {
      status: 400,
      body: {
        error: "sessionId, providerId, methodType são obrigatórios",
      },
    };
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
  const input = body as TrackEventInput;

  if (!input.sessionId || !input.eventType) {
    return {
      status: 400,
      body: { error: "sessionId e eventType são obrigatórios" },
    };
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
