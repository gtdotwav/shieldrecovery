import { CheckoutService, CheckoutStorage } from "@checkout/index";
import { appEnv } from "@/server/recovery/config";

let _service: CheckoutService | null = null;

export function getCheckoutService(): CheckoutService {
  if (_service) return _service;

  const storage = new CheckoutStorage(
    appEnv.supabaseUrl,
    appEnv.supabaseServiceRoleKey,
  );

  _service = new CheckoutService(storage, appEnv.appBaseUrl);
  return _service;
}
