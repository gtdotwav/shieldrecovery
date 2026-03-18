"use client";

import { useState } from "react";

export function BoletoPaymentView({
  boletoBarcode,
  boletoUrl,
}: {
  boletoBarcode?: string;
  boletoUrl?: string;
}) {
  const [copied, setCopied] = useState(false);

  if (!boletoBarcode && !boletoUrl) return null;

  const handleCopy = async () => {
    if (!boletoBarcode) return;
    try {
      await navigator.clipboard.writeText(boletoBarcode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-blue-200 bg-blue-50/50 p-5">
      <div className="text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-blue-700">
          Boleto gerado
        </p>
        <p className="mt-1 text-sm text-gray-600">
          Copie o código de barras ou abra o boleto
        </p>
      </div>

      {boletoBarcode ? (
        <>
          <div className="rounded-xl border border-blue-200 bg-white p-3">
            <p className="break-all font-mono text-xs leading-5 text-gray-700">
              {boletoBarcode}
            </p>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            {copied ? "Copiado!" : "Copiar código de barras"}
          </button>
        </>
      ) : null}

      {boletoUrl ? (
        <a
          href={boletoUrl}
          target="_blank"
          rel="noreferrer"
          className="block w-full rounded-xl border border-blue-300 bg-white px-4 py-3 text-center text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-50"
        >
          Abrir boleto
        </a>
      ) : null}
    </div>
  );
}
