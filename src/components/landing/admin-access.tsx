"use client";

import { useActionState, useRef, useState } from "react";
import { LockKeyhole } from "lucide-react";

import { quickAccessAction } from "@/app/actions/quiz-actions";

export function AdminAccessButton() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(quickAccessAction, null);
  const popoverRef = useRef<HTMLDivElement>(null);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Acesso restrito"
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.03] text-gray-500 transition-all hover:bg-white/[0.07] hover:text-gray-300"
      >
        <LockKeyhole className="h-3.5 w-3.5" />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />

          {/* Popover */}
          <div
            ref={popoverRef}
            className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-gray-800 bg-[#111111] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.5)]"
          >
            <p className="font-mono text-[0.58rem] font-medium uppercase tracking-[0.16em] text-gray-500">
              Acesso restrito
            </p>

            <form action={formAction} className="mt-3 space-y-3">
              <input
                name="password"
                type="password"
                autoComplete="off"
                placeholder="Senha de acesso"
                required
                className="w-full rounded-lg border border-gray-700 bg-[#0d0d0d] px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-gray-500 focus:outline-none"
              />

              {state?.error && (
                <p className="text-xs text-red-400">{state.error}</p>
              )}

              <button
                type="submit"
                disabled={pending}
                className="w-full rounded-lg bg-gray-800 px-3 py-2 text-xs font-medium text-gray-300 transition-colors hover:bg-gray-700 hover:text-white disabled:opacity-50"
              >
                {pending ? "Verificando..." : "Entrar"}
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
