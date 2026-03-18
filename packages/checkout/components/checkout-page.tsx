import type { SessionDetailsResult } from "../types";
import { CheckoutClient } from "./checkout-client";
import { CheckoutStatus } from "./checkout-status";

export function CheckoutPage({
  data,
}: {
  data: SessionDetailsResult | null;
}) {
  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center">
          <p className="text-lg font-semibold text-gray-900">
            Sessão não encontrada
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Este link de pagamento não existe ou já expirou.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <CheckoutClient
          session={data.session}
          providers={data.providers}
          installmentOptions={data.installmentOptions}
        />
        <p className="mt-6 text-center text-xs text-gray-400">
          Ambiente seguro · Shield Checkout
        </p>
      </div>
    </div>
  );
}
