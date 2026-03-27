import type { SessionDetailsResult } from "../types";
import { CheckoutClient } from "./checkout-client";
import { CheckoutStatus } from "./checkout-status";
import { SecurityFooter } from "./security-footer";

export function CheckoutPage({
  data,
}: {
  data: SessionDetailsResult | null;
}) {
  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-50 via-white to-gray-50 p-4">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-gray-200 bg-white/80 p-8 text-center shadow-xl shadow-gray-200/50 backdrop-blur-xl">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <p className="text-lg font-bold text-gray-900">
              Sessao nao encontrada
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Este link de pagamento nao existe ou ja expirou.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-50 via-white to-gray-50 p-4">
      <div className="w-full max-w-md">
        {/* Main content */}
        <div className="rounded-3xl border border-gray-100 bg-white/70 p-5 shadow-2xl shadow-gray-200/40 backdrop-blur-xl sm:p-6">
          <CheckoutClient
            session={data.session}
            providers={data.providers}
            installmentOptions={data.installmentOptions}
          />
        </div>

        {/* Security footer */}
        <SecurityFooter />
      </div>
    </div>
  );
}
