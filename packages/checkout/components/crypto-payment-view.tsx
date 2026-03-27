"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, Copy, Coins } from "lucide-react";

type Props = {
  cryptoAddress?: string;
  cryptoCurrency?: string;
  cryptoAmount?: string;
};

export function CryptoPaymentView({
  cryptoAddress,
  cryptoCurrency,
  cryptoAmount,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);

  const displayCurrency = cryptoCurrency ?? "Crypto";

  // Generate QR code for crypto address
  useEffect(() => {
    if (!cryptoAddress) return;
    let cancelled = false;

    import("qrcode")
      .then((QRCode) =>
        QRCode.toDataURL(cryptoAddress, {
          width: 200,
          margin: 2,
          color: { dark: "#000000", light: "#FFFFFF" },
        }),
      )
      .then((url) => {
        if (!cancelled) setQrUrl(url as string);
      })
      .catch(() => {
        if (!cancelled) {
          setQrUrl(
            `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(cryptoAddress)}`,
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [cryptoAddress]);

  if (!cryptoAddress) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(cryptoAddress);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = cryptoAddress;
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
      className="space-y-5 rounded-2xl border-2 border-purple-200 bg-gradient-to-b from-purple-50 to-white p-6"
    >
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
          <Coins className="h-6 w-6 text-purple-600" />
        </div>
        <h3 className="text-base font-bold text-gray-900">
          Pagamento em {displayCurrency}
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Envie o valor para o endereco abaixo
        </p>
      </div>

      {/* Crypto amount if available */}
      {cryptoAmount ? (
        <div className="rounded-xl bg-purple-50 px-4 py-3 text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-purple-500">
            Valor em {displayCurrency}
          </p>
          <p className="mt-1 font-mono text-lg font-bold text-purple-700">
            {cryptoAmount} {displayCurrency}
          </p>
        </div>
      ) : null}

      {/* QR Code */}
      {qrUrl ? (
        <div className="flex justify-center">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm"
          >
            <img src={qrUrl} alt={`QR Code ${displayCurrency}`} className="h-44 w-44" />
          </motion.div>
        </div>
      ) : null}

      {/* Address */}
      <div className="rounded-xl border border-purple-200 bg-white p-3">
        <p className="break-all font-mono text-xs leading-5 text-gray-600">
          {cryptoAddress}
        </p>
      </div>

      {/* Copy button */}
      <motion.button
        type="button"
        onClick={handleCopy}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-purple-600/25 transition-colors hover:bg-purple-700"
      >
        {copied ? (
          <>
            <Check className="h-4 w-4" />
            Copiado!
          </>
        ) : (
          <>
            <Copy className="h-4 w-4" />
            Copiar endereco
          </>
        )}
      </motion.button>

      {/* Waiting */}
      <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
        <div className="h-2 w-2 animate-pulse rounded-full bg-purple-400" />
        Aguardando confirmacao na blockchain...
      </div>
    </motion.div>
  );
}
