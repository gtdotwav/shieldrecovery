"use client";

import { useState } from "react";

export function PixPaymentView({
  pixCode,
  pixQrCode,
}: {
  pixCode?: string;
  pixQrCode?: string;
}) {
  const [copied, setCopied] = useState(false);

  if (!pixCode) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(pixCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = pixCode;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-green-200 bg-green-50/50 p-5">
      <div className="text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-green-700">
          PIX gerado
        </p>
        <p className="mt-1 text-sm text-gray-600">
          Escaneie o QR Code ou copie o código
        </p>
      </div>

      {pixQrCode ? (
        <div className="flex justify-center">
          <img
            src={pixQrCode}
            alt="QR Code PIX"
            className="h-48 w-48 rounded-xl border border-gray-200 bg-white p-2"
          />
        </div>
      ) : null}

      <div className="rounded-xl border border-green-200 bg-white p-3">
        <p className="break-all font-mono text-xs leading-5 text-gray-700">
          {pixCode}
        </p>
      </div>

      <button
        type="button"
        onClick={handleCopy}
        className="w-full rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-green-700"
      >
        {copied ? "Copiado!" : "Copiar código PIX"}
      </button>
    </div>
  );
}
