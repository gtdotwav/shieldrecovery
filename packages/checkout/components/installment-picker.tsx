"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";

import type { InstallmentOption } from "../types";

export function InstallmentPicker({
  options,
  selectedInstallments,
  onSelect,
}: {
  options: InstallmentOption[];
  selectedInstallments: number;
  onSelect: (installments: number) => void;
}) {
  if (options.length <= 1) return null;

  const firstWithInterest = options.findIndex((o) => !o.interestFree && o.installments > 1);
  const hasMixedInterest = firstWithInterest > 0;

  const fmt = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  return (
    <motion.div
      className="space-y-3"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.1 }}
    >
      <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
        Parcelas
      </p>

      <div className="max-h-72 space-y-1.5 overflow-y-auto rounded-2xl border border-gray-100 bg-gray-50/50 p-2">
        <AnimatePresence>
          {options.map((opt, idx) => {
            const active = selectedInstallments === opt.installments;
            const isFirst = opt.installments === 1;
            const showDivider = hasMixedInterest && idx === firstWithInterest;

            return (
              <div key={opt.installments}>
                {showDivider ? (
                  <div className="my-2 flex items-center gap-2 px-2">
                    <div className="h-px flex-1 bg-gray-200" />
                    <span className="text-[0.6rem] font-medium uppercase tracking-wider text-gray-300">
                      Com juros
                    </span>
                    <div className="h-px flex-1 bg-gray-200" />
                  </div>
                ) : null}

                <motion.button
                  type="button"
                  onClick={() => onSelect(opt.installments)}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-all ${
                    active
                      ? "border-orange-400 bg-white ring-2 ring-orange-400/20 shadow-sm"
                      : "border-transparent bg-white/80 hover:bg-white hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {/* Radio */}
                    <div
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                        active ? "border-orange-500" : "border-gray-200"
                      }`}
                    >
                      {active ? (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="h-2 w-2 rounded-full bg-orange-500"
                        />
                      ) : null}
                    </div>

                    <div>
                      <span className="text-sm font-medium text-gray-900">
                        {opt.label}
                      </span>
                      {/* Show total for installments with interest */}
                      {!opt.interestFree && opt.installments > 1 ? (
                        <span className="ml-2 text-xs text-gray-400">
                          (total {fmt(opt.totalAmount)})
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isFirst ? (
                      <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[0.6rem] font-bold text-green-700">
                        <Sparkles className="h-2.5 w-2.5" />
                        Melhor preco
                      </span>
                    ) : opt.interestFree && opt.installments > 1 ? (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-[0.6rem] font-bold text-green-700">
                        Sem juros
                      </span>
                    ) : null}
                  </div>
                </motion.button>
              </div>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
