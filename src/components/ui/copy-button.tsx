"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyButton({
  value,
  className,
  label = "Copiar",
  copiedLabel = "Copiado",
}: {
  value: string;
  className?: string;
  label?: string;
  copiedLabel?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={
        className ??
        "glass-button-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white/78"
      }
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? copiedLabel : label}
    </button>
  );
}
