"use client";

import { useRef } from "react";
import type { FollowUpContact } from "@/server/recovery/types";
import { formatCurrency } from "@/lib/format";
import { formatPhone } from "@/lib/contact";

const selectCls =
  "w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#111] px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/30";

const inputCls = selectCls;

export function LeadPhoneSelector({
  contacts,
}: {
  contacts: { lead_id: string; customer_name: string; phone: string; payment_value: number }[];
}) {
  const phoneRef = useRef<HTMLInputElement>(null);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
          Lead (selecionar contato)
        </label>
        <select
          name="leadId"
          className={selectCls}
          onChange={(e) => {
            const opt = e.target.selectedOptions[0];
            if (phoneRef.current) {
              phoneRef.current.value = opt?.dataset.phone ?? "";
            }
          }}
        >
          <option value="">Selecionar lead...</option>
          {contacts.map((c) => (
            <option key={c.lead_id} value={c.lead_id} data-phone={c.phone}>
              {c.customer_name} — {formatPhone(c.phone)} — {formatCurrency(c.payment_value)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
          Numero de destino
        </label>
        <input
          ref={phoneRef}
          name="toNumber"
          type="text"
          placeholder="+5511999998888"
          className={inputCls}
        />
      </div>
    </div>
  );
}
