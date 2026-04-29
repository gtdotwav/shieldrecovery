"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

type CopyPixButtonProps = {
  pixCode: string;
};

export function CopyPixButton({ pixCode }: CopyPixButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!pixCode) return;
    try {
      await navigator.clipboard.writeText(pixCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers / restrictive contexts.
      const ta = document.createElement("textarea");
      ta.value = pixCode;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={!pixCode}
      aria-label={copied ? "Código Pix copiado" : "Copiar código Pix"}
      className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[color:var(--accent-on,_white)] shadow-[0_8px_30px_rgba(0,0,0,0.12)] transition-[filter,transform] hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {copied ? (
        <>
          <Check className="h-4 w-4" aria-hidden />
          Copiado!
        </>
      ) : (
        <>
          <Copy className="h-4 w-4" aria-hidden />
          Copiar Pix copia e cola
        </>
      )}
    </button>
  );
}
