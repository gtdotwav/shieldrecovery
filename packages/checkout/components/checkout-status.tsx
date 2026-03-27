"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, Clock, MinusCircle } from "lucide-react";

import { SESSION_STATUS_LABELS } from "../constants";
import type { CheckoutSessionStatus } from "../types";
import { fireConfetti } from "./confetti";

const STATUS_CONFIG: Record<
  string,
  {
    icon: React.ReactNode;
    color: string;
    bgColor: string;
    borderColor: string;
    gradient: string;
    subtitle: string;
  }
> = {
  paid: {
    icon: <CheckCircle className="h-16 w-16" />,
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    gradient: "from-green-50 to-white",
    subtitle: "Pagamento confirmado com sucesso!",
  },
  failed: {
    icon: <XCircle className="h-16 w-16" />,
    color: "text-red-500",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    gradient: "from-red-50 to-white",
    subtitle: "Houve um erro no pagamento. Tente novamente.",
  },
  expired: {
    icon: <Clock className="h-16 w-16" />,
    color: "text-gray-400",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-200",
    gradient: "from-gray-50 to-white",
    subtitle: "Esta sessao expirou. Solicite um novo link de pagamento.",
  },
  abandoned: {
    icon: <MinusCircle className="h-16 w-16" />,
    color: "text-gray-300",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-200",
    gradient: "from-gray-50 to-white",
    subtitle: "Sessao abandonada.",
  },
};

export function CheckoutStatus({
  status,
  providerPaymentId,
  methodType,
  paidAt,
}: {
  status: CheckoutSessionStatus;
  providerPaymentId?: string;
  methodType?: string;
  paidAt?: string;
}) {
  const config = STATUS_CONFIG[status];
  if (!config) return null;

  const label = SESSION_STATUS_LABELS[status] ?? status;

  // Fire confetti on success
  useEffect(() => {
    if (status === "paid") {
      const t = setTimeout(() => fireConfetti(), 300);
      return () => clearTimeout(t);
    }
  }, [status]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className={`overflow-hidden rounded-2xl border-2 ${config.borderColor} bg-gradient-to-b ${config.gradient} p-8 text-center`}
    >
      {/* Animated icon */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
        className={`mx-auto ${config.color}`}
      >
        {config.icon}
      </motion.div>

      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className={`mt-4 text-xl font-bold ${config.color}`}
      >
        {label}
      </motion.p>

      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="mt-2 text-sm text-gray-500"
      >
        {config.subtitle}
      </motion.p>

      {/* Receipt for paid status */}
      {status === "paid" ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mx-auto mt-6 max-w-xs space-y-2 rounded-xl border border-gray-100 bg-white p-4 text-left"
        >
          <p className="text-center text-[0.6rem] font-bold uppercase tracking-widest text-gray-300">
            Comprovante
          </p>
          {providerPaymentId ? (
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">ID Transacao</span>
              <span className="font-mono font-medium text-gray-700">
                {providerPaymentId.slice(0, 16)}
                {providerPaymentId.length > 16 ? "..." : ""}
              </span>
            </div>
          ) : null}
          {methodType ? (
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Metodo</span>
              <span className="font-medium capitalize text-gray-700">
                {methodType === "card"
                  ? "Cartao de Credito"
                  : methodType === "pix"
                    ? "PIX"
                    : methodType === "boleto"
                      ? "Boleto"
                      : methodType}
              </span>
            </div>
          ) : null}
          {paidAt ? (
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Data/Hora</span>
              <span className="font-medium text-gray-700">
                {new Date(paidAt).toLocaleString("pt-BR")}
              </span>
            </div>
          ) : null}
        </motion.div>
      ) : null}
    </motion.div>
  );
}
