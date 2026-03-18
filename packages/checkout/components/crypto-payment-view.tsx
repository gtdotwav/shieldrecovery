"use client";

import { useState } from "react";

export function CryptoPaymentView({
  cryptoAddress,
  cryptoCurrency,
}: {
  cryptoAddress?: string;
  cryptoCurrency?: string;
}) {
  const [copied, setCopied] = useState(false);

  if (!cryptoAddress) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(cryptoAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-purple-200 bg-purple-50/50 p-5">
      <div className="text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-purple-700">
          Pagamento em {cryptoCurrency ?? "Cripto"}
        </p>
        <p className="mt-1 text-sm text-gray-600">
          Envie o valor para o endereço abaixo
        </p>
      </div>

      <div className="rounded-xl border border-purple-200 bg-white p-3">
        <p className="break-all font-mono text-xs leading-5 text-gray-700">
          {cryptoAddress}
        </p>
      </div>

      <button
        type="button"
        onClick={handleCopy}
        className="w-full rounded-xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-purple-700"
      >
        {copied ? "Copiado!" : "Copiar endereço"}
      </button>
    </div>
  );
}
