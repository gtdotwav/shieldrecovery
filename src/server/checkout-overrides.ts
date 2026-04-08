import { getSellerIdentityByEmail } from "@/server/auth/identities";
import { getStorageService } from "@/server/recovery/services/storage";

/**
 * Resolve checkout API overrides for a seller based on their email.
 * Returns { baseUrl, apiKey } if the seller has a configured checkout,
 * or undefined if not.
 */
export async function resolveCheckoutOverrides(email: string) {
  const identity = await getSellerIdentityByEmail(email);
  if (!identity) return undefined;

  const storage = getStorageService();
  const allControls = await storage.getSellerAdminControls();
  const controls = allControls.find((c) => c.sellerKey === identity.agentName);
  if (!controls?.checkoutApiKey) return undefined;

  return {
    baseUrl: controls.checkoutUrl || undefined,
    apiKey: controls.checkoutApiKey,
  };
}
