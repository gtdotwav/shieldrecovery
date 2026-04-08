// Types
export type {
  CheckoutMethodType,
  CheckoutGateway,
  CheckoutSessionStatus,
  CheckoutSessionSource,
  CheckoutTrackingEvent,
  CheckoutPaymentProvider,
  CheckoutSession,
  CheckoutTrackingRecord,
  InstallmentRule,
  InstallmentOption,
  CreateSessionInput,
  CreateSessionResult,
  SessionDetailsResult,
  ProcessPaymentInput,
  ProcessPaymentResult,
  TrackEventInput,
  CheckoutAnalytics,
} from "./types";

export {
  CHECKOUT_METHOD_TYPES,
  CHECKOUT_GATEWAYS,
  CHECKOUT_SESSION_STATUSES,
  CHECKOUT_SESSION_SOURCES,
  CHECKOUT_TRACKING_EVENTS,
} from "./types";

// Constants
export {
  METHOD_LABELS,
  METHOD_DESCRIPTIONS,
  METHOD_BADGES,
  GATEWAY_LABELS,
  SESSION_STATUS_LABELS,
  CHECKOUT_SHORT_ID_LENGTH,
  CHECKOUT_DEFAULT_EXPIRY_MINUTES,
  CHECKOUT_DEFAULT_CURRENCY,
} from "./constants";

// Utilities
export {
  detectCardBrand,
  formatCardNumber,
  getCardMaxLength,
  getCvvLength,
  validateLuhn,
  BRAND_DISPLAY_NAME,
} from "./utils/card-brands";
export type { CardBrand } from "./utils/card-brands";

export {
  validateCPF,
  validateCNPJ,
  validateDocument,
  formatDocument,
} from "./utils/cpf-cnpj";

// Hooks
export { useCountdown } from "./hooks/use-countdown";
export { usePolling } from "./hooks/use-polling";

// Installments
export { computeInstallmentOptions } from "./installments/engine";

// Providers
export { createProvider, createProviders } from "./providers";
export type { PaymentProvider } from "./providers/types";

// Services
export { CheckoutService } from "./services/checkout-service";
export { CheckoutStorage } from "./services/checkout-storage";
export { TrackingService } from "./services/tracking-service";

// API
export { authenticateApiKey } from "./api/auth";
export type { AuthenticatedMerchant } from "./api/auth";
export {
  handleCreateSession,
  handleGetSession,
  handleProcessPayment,
  handleTrackEvent,
  handleWebhook,
  handleGetAnalytics,
} from "./api/handlers";
