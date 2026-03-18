import type { CheckoutPaymentProvider } from "../types";
import { MockProvider } from "./mock-provider";
import type { PaymentProvider } from "./types";

export type { PaymentProvider } from "./types";

type ProviderFactory = (
  record: CheckoutPaymentProvider,
) => PaymentProvider;

const FACTORY_MAP: Record<string, ProviderFactory> = {
  mock: (r) => new MockProvider(r.slug, r.methodType),
  // Future: stripe, mercado_pago, asaas, coinbase
};

/**
 * Builds a PaymentProvider instance from a database record.
 * Throws if the gateway is not yet implemented.
 */
export function createProvider(
  record: CheckoutPaymentProvider,
): PaymentProvider {
  const factory = FACTORY_MAP[record.gateway];
  if (!factory) {
    throw new Error(
      `Unsupported checkout gateway: ${record.gateway}. Available: ${Object.keys(FACTORY_MAP).join(", ")}`,
    );
  }
  return factory(record);
}

/**
 * Builds provider instances for all enabled records, sorted by priority.
 */
export function createProviders(
  records: CheckoutPaymentProvider[],
): PaymentProvider[] {
  return records
    .filter((r) => r.enabled)
    .sort((a, b) => a.priority - b.priority)
    .map(createProvider);
}
