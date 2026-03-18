// ─── Enums & Literals ───────────────────────────────────────────────

export const CHECKOUT_METHOD_TYPES = [
  "card",
  "pix",
  "boleto",
  "crypto",
] as const;

export const CHECKOUT_GATEWAYS = [
  "stripe",
  "mercado_pago",
  "asaas",
  "coinbase",
  "pagnet",
  "mock",
] as const;

export const CHECKOUT_SESSION_STATUSES = [
  "open",
  "method_selected",
  "processing",
  "paid",
  "failed",
  "expired",
  "abandoned",
] as const;

export const CHECKOUT_SESSION_SOURCES = [
  "recovery",
  "direct",
  "api",
] as const;

export const CHECKOUT_TRACKING_EVENTS = [
  "page_viewed",
  "method_selected",
  "installment_selected",
  "payment_initiated",
  "payment_succeeded",
  "payment_failed",
  "payment_expired",
  "session_abandoned",
] as const;

export type CheckoutMethodType = (typeof CHECKOUT_METHOD_TYPES)[number];
export type CheckoutGateway = (typeof CHECKOUT_GATEWAYS)[number];
export type CheckoutSessionStatus = (typeof CHECKOUT_SESSION_STATUSES)[number];
export type CheckoutSessionSource = (typeof CHECKOUT_SESSION_SOURCES)[number];
export type CheckoutTrackingEvent = (typeof CHECKOUT_TRACKING_EVENTS)[number];

// ─── Provider ───────────────────────────────────────────────────────

export type CheckoutPaymentProvider = {
  id: string;
  slug: string;
  displayName: string;
  methodType: CheckoutMethodType;
  gateway: CheckoutGateway;
  credentials: Record<string, unknown>;
  /** Public key exposed to the client for card tokenization (PagNet, Stripe, etc.) */
  publicKey?: string;
  installmentRules: InstallmentRule[];
  enabled: boolean;
  priority: number;
  minAmount: number;
  maxAmount: number;
  createdAt: string;
  updatedAt: string;
};

// ─── Session ────────────────────────────────────────────────────────

export type CheckoutSession = {
  id: string;
  shortId: string;
  amount: number;
  currency: string;
  description: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerDocument?: string;

  selectedProviderId?: string;
  selectedMethodType?: CheckoutMethodType;
  selectedInstallments?: number;

  providerPaymentId?: string;
  pixCode?: string;
  pixQrCode?: string;
  boletoBarcode?: string;
  boletoUrl?: string;
  cryptoAddress?: string;
  cryptoCurrency?: string;

  status: CheckoutSessionStatus;
  source: CheckoutSessionSource;
  sourceReferenceId?: string;

  expiresAt: string;
  paidAt?: string;
  failedAt?: string;

  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;

  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

// ─── Tracking ───────────────────────────────────────────────────────

export type CheckoutTrackingRecord = {
  id: string;
  sessionId: string;
  eventType: CheckoutTrackingEvent;
  methodType?: CheckoutMethodType;
  providerId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

// ─── Installments ───────────────────────────────────────────────────

export type InstallmentRule = {
  minInstallments: number;
  maxInstallments: number;
  minAmount: number;
  interestRatePercent: number;
  maxInterestFreeInstallments: number;
  enabled: boolean;
};

export type InstallmentOption = {
  installments: number;
  installmentAmount: number;
  totalAmount: number;
  interestRate: number;
  interestFree: boolean;
  label: string;
};

// ─── Service inputs/outputs ─────────────────────────────────────────

export type CreateSessionInput = {
  amount: number;
  currency?: string;
  description: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerDocument?: string;
  source: CheckoutSessionSource;
  sourceReferenceId?: string;
  expiresInMinutes?: number;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  metadata?: Record<string, unknown>;
};

export type CreateSessionResult = {
  sessionId: string;
  shortId: string;
  checkoutUrl: string;
  expiresAt: string;
};

export type SessionDetailsResult = {
  session: CheckoutSession;
  providers: CheckoutPaymentProvider[];
  installmentOptions: Record<string, InstallmentOption[]>;
};

export type ProcessPaymentInput = {
  sessionId: string;
  providerId: string;
  methodType: CheckoutMethodType;
  installments?: number;
  cardToken?: string;
  customerDocument?: string;
};

export type ProcessPaymentResult = {
  status: "pending" | "approved" | "failed";
  providerPaymentId?: string;
  pixCode?: string;
  pixQrCode?: string;
  boletoBarcode?: string;
  boletoUrl?: string;
  cryptoAddress?: string;
  cryptoCurrency?: string;
  errorMessage?: string;
};

export type TrackEventInput = {
  sessionId: string;
  eventType: CheckoutTrackingEvent;
  methodType?: CheckoutMethodType;
  providerId?: string;
  metadata?: Record<string, unknown>;
};

export type CheckoutAnalytics = {
  totalSessions: number;
  paidSessions: number;
  conversionRate: number;
  totalRevenue: number;
  averageTicket: number;
  byMethod: Record<
    CheckoutMethodType,
    { count: number; revenue: number; conversionRate: number }
  >;
  funnel: Record<CheckoutTrackingEvent, number>;
};
