"use client";

import { motion } from "framer-motion";
import {
  CreditCard,
  QrCode,
  FileText,
  Coins,
} from "lucide-react";

import { METHOD_LABELS, METHOD_DESCRIPTIONS, METHOD_BADGES } from "../constants";
import type { CheckoutMethodType, CheckoutPaymentProvider } from "../types";

const METHOD_ICON: Record<CheckoutMethodType, React.ReactNode> = {
  card: <CreditCard className="h-6 w-6" />,
  pix: <QrCode className="h-6 w-6" />,
  boleto: <FileText className="h-6 w-6" />,
  crypto: <Coins className="h-6 w-6" />,
};

const METHOD_COLORS: Record<CheckoutMethodType, { icon: string; activeBg: string; activeBorder: string; activeRing: string }> = {
  pix: {
    icon: "text-green-600",
    activeBg: "bg-green-50",
    activeBorder: "border-green-500",
    activeRing: "ring-green-500/20",
  },
  card: {
    icon: "text-orange-500",
    activeBg: "bg-orange-50",
    activeBorder: "border-orange-500",
    activeRing: "ring-orange-500/20",
  },
  boleto: {
    icon: "text-blue-600",
    activeBg: "bg-blue-50",
    activeBorder: "border-blue-500",
    activeRing: "ring-blue-500/20",
  },
  crypto: {
    icon: "text-purple-600",
    activeBg: "bg-purple-50",
    activeBorder: "border-purple-500",
    activeRing: "ring-purple-500/20",
  },
};

// Preferred display order — PIX first (highest BR conversion)
const METHOD_ORDER: CheckoutMethodType[] = ["pix", "card", "boleto", "crypto"];

export function PaymentMethodSelector({
  providers,
  selectedMethodType,
  onSelect,
}: {
  providers: CheckoutPaymentProvider[];
  selectedMethodType?: CheckoutMethodType;
  onSelect: (methodType: CheckoutMethodType, providerId: string) => void;
}) {
  const byMethod = new Map<CheckoutMethodType, CheckoutPaymentProvider>();
  for (const p of providers) {
    if (!byMethod.has(p.methodType)) {
      byMethod.set(p.methodType, p);
    }
  }

  const methods = METHOD_ORDER
    .filter((m) => byMethod.has(m))
    .map((m) => [m, byMethod.get(m)!] as const);

  return (
    <div className="space-y-3" role="radiogroup" aria-label="Forma de pagamento">
      <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
        Forma de pagamento
      </p>

      <div className="space-y-2">
        {methods.map(([method, provider]) => {
          const active = selectedMethodType === method;
          const colors = METHOD_COLORS[method];
          const badge = METHOD_BADGES[method];

          return (
            <motion.button
              key={method}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onSelect(method, provider.id)}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className={`relative flex w-full items-center gap-4 rounded-2xl border-2 px-5 py-4 text-left transition-colors ${
                active
                  ? `${colors.activeBorder} ${colors.activeBg} ring-4 ${colors.activeRing}`
                  : "border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50/50"
              }`}
            >
              {/* Icon */}
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-colors ${
                  active
                    ? `${colors.activeBg} ${colors.icon}`
                    : "bg-gray-50 text-gray-400"
                }`}
              >
                {METHOD_ICON[method]}
              </div>

              {/* Text */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-900">
                    {METHOD_LABELS[method] ?? method}
                  </p>
                  {badge ? (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide ${badge.color}`}
                    >
                      {badge.label}
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 text-xs text-gray-400">
                  {METHOD_DESCRIPTIONS[method] ?? provider.displayName}
                </p>
              </div>

              {/* Radio indicator */}
              <div
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                  active ? `${colors.activeBorder} ${colors.activeBg}` : "border-gray-200"
                }`}
              >
                {active ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={`h-2.5 w-2.5 rounded-full ${colors.activeBorder.replace("border-", "bg-")}`}
                  />
                ) : null}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
