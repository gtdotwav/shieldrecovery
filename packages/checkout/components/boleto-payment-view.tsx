"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Copy, FileText, ExternalLink, Calendar } from "lucide-react";

type Props = {
  boletoBarcode?: string;
  boletoUrl?: string;
  dueDate?: string;
};

export function BoletoPaymentView({ boletoBarcode, boletoUrl, dueDate }: Props) {
  const [copied, setCopied] = useState(false);

  if (!boletoBarcode && !boletoUrl) return null;

  const handleCopy = async () => {
    if (!boletoBarcode) return;
    try {
      await navigator.clipboard.writeText(boletoBarcode);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = boletoBarcode;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Calculate due date (default: 3 business days from now)
  const displayDate = dueDate
    ? new Date(dueDate).toLocaleDateString("pt-BR")
    : (() => {
        const d = new Date();
        let added = 0;
        while (added < 3) {
          d.setDate(d.getDate() + 1);
          if (d.getDay() !== 0 && d.getDay() !== 6) added++;
        }
        return d.toLocaleDateString("pt-BR");
      })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5 rounded-2xl border-2 border-blue-200 bg-gradient-to-b from-blue-50 to-white p-6"
    >
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
          <FileText className="h-6 w-6 text-blue-600" />
        </div>
        <h3 className="text-base font-bold text-gray-900">
          Boleto gerado com sucesso
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Copie o codigo de barras ou abra o boleto
        </p>
      </div>

      {/* Due date */}
      <div className="flex items-center justify-center gap-2 rounded-xl bg-blue-50 px-4 py-2.5 text-sm">
        <Calendar className="h-4 w-4 text-blue-600" />
        <span className="font-medium text-blue-700">
          Vencimento: <span className="font-bold">{displayDate}</span>
        </span>
      </div>

      {/* Barcode */}
      {boletoBarcode ? (
        <>
          {/* Visual barcode representation */}
          <div className="flex justify-center">
            <div className="flex h-16 items-end gap-px px-4">
              {boletoBarcode
                .replace(/\D/g, "")
                .slice(0, 44)
                .split("")
                .map((digit, i) => {
                  const h = 40 + (parseInt(digit) * 2.4);
                  return (
                    <div
                      key={i}
                      className="bg-gray-900"
                      style={{
                        width: parseInt(digit) % 2 === 0 ? 1.5 : 2.5,
                        height: `${h}px`,
                      }}
                    />
                  );
                })}
            </div>
          </div>

          <div className="rounded-xl border border-blue-200 bg-white p-3">
            <p className="break-all font-mono text-xs leading-5 text-gray-600">
              {boletoBarcode}
            </p>
          </div>

          <motion.button
            type="button"
            onClick={handleCopy}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition-colors hover:bg-blue-700"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                Copiado!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copiar codigo de barras
              </>
            )}
          </motion.button>
        </>
      ) : null}

      {boletoUrl ? (
        <motion.a
          href={boletoUrl}
          target="_blank"
          rel="noreferrer"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-blue-200 bg-white px-4 py-3.5 text-sm font-bold text-blue-700 transition-colors hover:bg-blue-50"
        >
          <ExternalLink className="h-4 w-4" />
          Abrir boleto completo
        </motion.a>
      ) : null}

      {/* Instructions */}
      <div className="space-y-2 rounded-xl bg-gray-50 p-4">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
          Onde pagar
        </p>
        <ul className="space-y-1.5 text-xs text-gray-500">
          <li className="flex items-start gap-2">
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
            App do seu banco (escaneie ou cole o codigo)
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
            Loterica ou agencia bancaria
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
            Caixas eletronicos (ATMs)
          </li>
        </ul>
      </div>
    </motion.div>
  );
}
