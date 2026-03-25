"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app-error]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6">
      <div className="rounded-2xl border border-red-100 bg-red-50/50 px-8 py-6 text-center">
        <h2 className="text-lg font-semibold text-[#111827]">
          Algo deu errado
        </h2>
        <p className="mt-2 text-sm text-[#6b7280]">
          Ocorreu um erro inesperado. Tente recarregar a pagina.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-4 rounded-xl bg-[#111827] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1f2937]"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
