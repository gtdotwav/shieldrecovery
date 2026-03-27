"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Check, Copy, Clock, QrCode } from "lucide-react";

import { useCountdown } from "../hooks/use-countdown";
import { usePolling } from "../hooks/use-polling";

type Props = {
  pixCode?: string;
  pixQrCode?: string;
  sessionId?: string;
  expiresAt?: string;
  onPaymentConfirmed?: () => void;
};

export function PixPaymentView({
  pixCode,
  pixQrCode,
  sessionId,
  expiresAt,
  onPaymentConfirmed,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [localQr, setLocalQr] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const countdown = useCountdown(expiresAt);

  // Generate QR code locally if no external URL provided
  useEffect(() => {
    if (!pixCode) return;
    if (pixQrCode) {
      setLocalQr(pixQrCode);
      return;
    }

    let cancelled = false;

    import("qrcode")
      .then((QRCode) =>
        QRCode.toDataURL(pixCode, {
          width: 280,
          margin: 2,
          color: { dark: "#000000", light: "#FFFFFF" },
        }),
      )
      .then((url) => {
        if (!cancelled) setLocalQr(url as string);
      })
      .catch(() => {
        // Fallback to external API
        if (!cancelled) {
          setLocalQr(
            `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(pixCode)}`,
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [pixCode, pixQrCode]);

  // Poll for payment confirmation
  usePolling(
    async () => {
      if (!sessionId) return false;
      try {
        const res = await fetch(`/api/checkout/session/${sessionId}/status`);
        if (!res.ok) return false;
        const data = await res.json();
        if (data.status === "paid") {
          onPaymentConfirmed?.();
          return true;
        }
      } catch {
        // keep polling
      }
      return false;
    },
    3000,
    !!sessionId && !countdown.expired,
  );

  if (!pixCode) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(pixCode);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = pixCode;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5 rounded-2xl border-2 border-green-200 bg-gradient-to-b from-green-50 to-white p-6"
    >
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <QrCode className="h-6 w-6 text-green-600" />
        </div>
        <h3 className="text-base font-bold text-gray-900">PIX gerado com sucesso</h3>
        <p className="mt-1 text-sm text-gray-500">
          Escaneie o QR Code ou copie o codigo abaixo
        </p>
      </div>

      {/* Countdown */}
      {expiresAt && !countdown.expired ? (
        <div className="flex items-center justify-center gap-2 rounded-xl bg-amber-50 px-4 py-2.5 text-sm">
          <Clock className="h-4 w-4 text-amber-600" />
          <span className="font-medium text-amber-700">
            Expira em{" "}
            <span className="font-mono font-bold">{countdown.formatted}</span>
          </span>
        </div>
      ) : countdown.expired ? (
        <div className="rounded-xl bg-red-50 px-4 py-2.5 text-center text-sm font-medium text-red-600">
          Codigo PIX expirado. Solicite um novo.
        </div>
      ) : null}

      {/* QR Code */}
      {localQr ? (
        <div className="flex justify-center">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="relative rounded-2xl border border-gray-200 bg-white p-3 shadow-sm"
          >
            <img src={localQr} alt="QR Code PIX" className="h-56 w-56" />

            {/* Waiting pulse overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-16 w-16 animate-ping rounded-full bg-green-400/10" />
            </div>
          </motion.div>
        </div>
      ) : null}

      {/* PIX code */}
      <div className="rounded-xl border border-green-200 bg-white p-3">
        <p className="break-all font-mono text-xs leading-5 text-gray-600">
          {pixCode}
        </p>
      </div>

      {/* Copy button */}
      <motion.button
        type="button"
        onClick={handleCopy}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-green-600/25 transition-colors hover:bg-green-700"
      >
        {copied ? (
          <>
            <Check className="h-4 w-4" />
            Copiado!
          </>
        ) : (
          <>
            <Copy className="h-4 w-4" />
            Copiar codigo PIX
          </>
        )}
      </motion.button>

      {/* Instructions */}
      <div className="space-y-2 rounded-xl bg-gray-50 p-4">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
          Como pagar
        </p>
        <ol className="space-y-1.5 text-xs text-gray-500">
          <li className="flex items-start gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-100 text-[0.6rem] font-bold text-green-700">
              1
            </span>
            Abra o app do seu banco ou carteira digital
          </li>
          <li className="flex items-start gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-100 text-[0.6rem] font-bold text-green-700">
              2
            </span>
            Escolha pagar via PIX com QR Code ou Copia e Cola
          </li>
          <li className="flex items-start gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-100 text-[0.6rem] font-bold text-green-700">
              3
            </span>
            Confirme o pagamento e pronto!
          </li>
        </ol>
      </div>

      {/* Waiting message */}
      <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
        <div className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
        Aguardando confirmacao do pagamento...
      </div>
    </motion.div>
  );
}
