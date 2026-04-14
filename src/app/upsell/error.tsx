"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20">
      <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-5 text-center dark:border-red-900/30 dark:bg-red-950/20">
        <p className="text-sm font-medium text-red-800 dark:text-red-300">Erro ao carregar</p>
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error.message}</p>
      </div>
      <button onClick={reset} className="glass-button-primary px-4 py-2 text-sm font-semibold">
        Tentar novamente
      </button>
    </div>
  );
}
