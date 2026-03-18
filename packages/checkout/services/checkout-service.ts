import { computeInstallmentOptions } from "../installments/engine";
import { createProvider } from "../providers";
import type { PaymentProvider } from "../providers/types";
import type {
  CheckoutAnalytics,
  CheckoutSession,
  CreateSessionInput,
  CreateSessionResult,
  InstallmentOption,
  ProcessPaymentInput,
  ProcessPaymentResult,
  SessionDetailsResult,
  TrackEventInput,
} from "../types";
import type { CheckoutStorage } from "./checkout-storage";
import { TrackingService } from "./tracking-service";

export class CheckoutService {
  private tracking: TrackingService;

  constructor(
    private storage: CheckoutStorage,
    private baseUrl: string,
  ) {
    this.tracking = new TrackingService(storage);
  }

  // ── Create session ──────────────────────────────────────────────

  async createSession(input: CreateSessionInput): Promise<CreateSessionResult> {
    const session = await this.storage.createSession(input);

    return {
      sessionId: session.id,
      shortId: session.shortId,
      checkoutUrl: `${this.baseUrl}/checkout/${session.shortId}`,
      expiresAt: session.expiresAt,
    };
  }

  // ── Get session details (for checkout page) ─────────────────────

  async getSession(shortId: string): Promise<SessionDetailsResult | null> {
    const session = await this.storage.getSessionByShortId(shortId);
    if (!session) return null;

    // Check expiry
    if (
      session.status === "open" &&
      new Date(session.expiresAt) < new Date()
    ) {
      await this.storage.updateSession(session.id, { status: "expired" });
      session.status = "expired";
    }

    const providers = await this.storage.listEnabledProviders();

    // Filter by amount range
    const eligible = providers.filter(
      (p) =>
        session.amount >= p.minAmount &&
        (p.maxAmount === 0 || session.amount <= p.maxAmount),
    );

    // Compute installment options per provider
    const installmentOptions: Record<string, InstallmentOption[]> = {};
    for (const p of eligible) {
      installmentOptions[p.id] = computeInstallmentOptions(
        session.amount,
        p.installmentRules,
        session.currency,
      );
    }

    // Strip secret credentials — only expose publicKey to the client
    const safeProviders = eligible.map((p) => ({
      ...p,
      credentials: {},
    }));

    return { session, providers: safeProviders, installmentOptions };
  }

  // ── Process payment ─────────────────────────────────────────────

  async processPayment(
    input: ProcessPaymentInput,
  ): Promise<ProcessPaymentResult> {
    const session = await this.storage.getSessionById(input.sessionId);
    if (!session) {
      return { status: "failed", errorMessage: "Sessão não encontrada" };
    }

    if (session.status !== "open" && session.status !== "method_selected") {
      return {
        status: "failed",
        errorMessage: `Sessão em status inválido: ${session.status}`,
      };
    }

    if (new Date(session.expiresAt) < new Date()) {
      await this.storage.updateSession(session.id, { status: "expired" });
      return { status: "failed", errorMessage: "Sessão expirada" };
    }

    const providerRecord = await this.storage.getProviderById(input.providerId);
    if (!providerRecord || !providerRecord.enabled) {
      return {
        status: "failed",
        errorMessage: "Método de pagamento indisponível",
      };
    }

    // Update session with selection
    await this.storage.updateSession(session.id, {
      selected_provider_id: input.providerId,
      selected_method_type: input.methodType,
      selected_installments: input.installments ?? 1,
      status: "processing",
    });

    // Track payment initiation
    await this.tracking.track({
      sessionId: session.id,
      eventType: "payment_initiated",
      methodType: input.methodType,
      providerId: input.providerId,
    });

    // Call provider
    let provider: PaymentProvider;
    try {
      provider = createProvider(providerRecord);
    } catch {
      return {
        status: "failed",
        errorMessage: "Gateway não configurado",
      };
    }

    try {
      // Build postback URL for this provider
      const postbackUrl = `${this.baseUrl}/api/checkout/webhook/${providerRecord.slug}`;

      const result = await provider.createPayment({
        sessionId: session.id,
        amount: session.amount,
        currency: session.currency,
        installments: input.installments ?? 1,
        customerName: session.customerName,
        customerEmail: session.customerEmail,
        customerPhone: session.customerPhone,
        customerDocument: session.customerDocument,
        description: session.description,
        cardToken: input.cardToken,
        metadata: { postbackUrl },
      });

      // Update session with provider response
      const sessionUpdates: Record<string, unknown> = {
        provider_payment_id: result.providerPaymentId,
      };

      if (result.pixCode) sessionUpdates.pix_code = result.pixCode;
      if (result.pixQrCode) sessionUpdates.pix_qr_code = result.pixQrCode;
      if (result.boletoBarcode)
        sessionUpdates.boleto_barcode = result.boletoBarcode;
      if (result.boletoUrl) sessionUpdates.boleto_url = result.boletoUrl;
      if (result.cryptoAddress)
        sessionUpdates.crypto_address = result.cryptoAddress;
      if (result.cryptoCurrency)
        sessionUpdates.crypto_currency = result.cryptoCurrency;

      if (result.status === "approved") {
        sessionUpdates.status = "paid";
        sessionUpdates.paid_at = new Date().toISOString();

        await this.tracking.track({
          sessionId: session.id,
          eventType: "payment_succeeded",
          methodType: input.methodType,
          providerId: input.providerId,
        });
      } else if (result.status === "failed") {
        sessionUpdates.status = "failed";
        sessionUpdates.failed_at = new Date().toISOString();

        await this.tracking.track({
          sessionId: session.id,
          eventType: "payment_failed",
          methodType: input.methodType,
          providerId: input.providerId,
          metadata: { error: result.errorMessage },
        });
      }

      await this.storage.updateSession(
        session.id,
        sessionUpdates as Parameters<typeof this.storage.updateSession>[1],
      );

      return {
        status: result.status,
        providerPaymentId: result.providerPaymentId,
        pixCode: result.pixCode,
        pixQrCode: result.pixQrCode,
        boletoBarcode: result.boletoBarcode,
        boletoUrl: result.boletoUrl,
        cryptoAddress: result.cryptoAddress,
        cryptoCurrency: result.cryptoCurrency,
        errorMessage: result.errorMessage,
      };
    } catch (err) {
      await this.storage.updateSession(session.id, {
        status: "failed",
        failed_at: new Date().toISOString(),
      });

      await this.tracking.track({
        sessionId: session.id,
        eventType: "payment_failed",
        methodType: input.methodType,
        providerId: input.providerId,
        metadata: {
          error: err instanceof Error ? err.message : "Unknown error",
        },
      });

      return {
        status: "failed",
        errorMessage:
          err instanceof Error ? err.message : "Erro ao processar pagamento",
      };
    }
  }

  // ── Webhook handling ────────────────────────────────────────────

  async handleProviderWebhook(
    providerSlug: string,
    payload: unknown,
    headers: Record<string, string>,
  ): Promise<{ handled: boolean; sessionId?: string }> {
    const providerRecord = await this.storage.getProviderBySlug(providerSlug);
    if (!providerRecord) {
      return { handled: false };
    }

    const provider = createProvider(providerRecord);
    const result = await provider.verifyWebhook(payload, headers);

    if (!result.valid || !result.providerPaymentId) {
      return { handled: false };
    }

    const session = await this.storage.getSessionByProviderPaymentId(
      result.providerPaymentId,
    );
    if (!session) {
      return { handled: false };
    }

    if (result.status === "approved" && session.status !== "paid") {
      await this.storage.updateSession(session.id, {
        status: "paid",
        paid_at: new Date().toISOString(),
      });

      await this.tracking.track({
        sessionId: session.id,
        eventType: "payment_succeeded",
        methodType: session.selectedMethodType,
        providerId: session.selectedProviderId,
        metadata: { via: "webhook" },
      });
    } else if (
      result.status === "failed" &&
      session.status !== "failed" &&
      session.status !== "paid"
    ) {
      await this.storage.updateSession(session.id, {
        status: "failed",
        failed_at: new Date().toISOString(),
      });

      await this.tracking.track({
        sessionId: session.id,
        eventType: "payment_failed",
        methodType: session.selectedMethodType,
        providerId: session.selectedProviderId,
        metadata: { via: "webhook" },
      });
    }

    return { handled: true, sessionId: session.id };
  }

  // ── Tracking ────────────────────────────────────────────────────

  async trackEvent(input: TrackEventInput) {
    return this.tracking.track(input);
  }

  // ── Analytics ───────────────────────────────────────────────────

  async getAnalytics(
    fromDate?: string,
    toDate?: string,
  ): Promise<CheckoutAnalytics> {
    return this.storage.getAnalytics(fromDate, toDate);
  }
}
