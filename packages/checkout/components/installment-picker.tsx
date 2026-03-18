"use client";

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

  return (
    <div className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
        Parcelas
      </p>
      <div className="max-h-60 space-y-1.5 overflow-y-auto">
        {options.map((opt) => {
          const active = selectedInstallments === opt.installments;
          return (
            <button
              key={opt.installments}
              type="button"
              onClick={() => onSelect(opt.installments)}
              className={`flex w-full items-center justify-between rounded-xl border px-4 py-2.5 text-left transition-all ${
                active
                  ? "border-orange-400 bg-orange-50 ring-2 ring-orange-400/30"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <span className="text-sm font-medium text-gray-900">
                {opt.label}
              </span>
              {opt.interestFree && opt.installments > 1 ? (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-[0.625rem] font-semibold text-green-700">
                  sem juros
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
