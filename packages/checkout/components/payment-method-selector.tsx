"use client";

import { METHOD_LABELS } from "../constants";
import type { CheckoutMethodType, CheckoutPaymentProvider } from "../types";

const METHOD_ICONS: Record<CheckoutMethodType, string> = {
  card: "💳",
  pix: "⚡",
  boleto: "📄",
  crypto: "🪙",
};

export function PaymentMethodSelector({
  providers,
  selectedMethodType,
  onSelect,
}: {
  providers: CheckoutPaymentProvider[];
  selectedMethodType?: CheckoutMethodType;
  onSelect: (methodType: CheckoutMethodType, providerId: string) => void;
}) {
  // Group by method type, pick highest priority per type
  const byMethod = new Map<CheckoutMethodType, CheckoutPaymentProvider>();
  for (const p of providers) {
    if (!byMethod.has(p.methodType)) {
      byMethod.set(p.methodType, p);
    }
  }

  const methods = Array.from(byMethod.entries());

  return (
    <div className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
        Forma de pagamento
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {methods.map(([method, provider]) => {
          const active = selectedMethodType === method;
          return (
            <button
              key={method}
              type="button"
              onClick={() => onSelect(method, provider.id)}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                active
                  ? "border-orange-400 bg-orange-50 ring-2 ring-orange-400/30"
                  : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <span className="text-2xl">{METHOD_ICONS[method]}</span>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {METHOD_LABELS[method] ?? method}
                </p>
                <p className="text-xs text-gray-400">{provider.displayName}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
