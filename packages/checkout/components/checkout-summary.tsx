"use client";

import { motion } from "framer-motion";
import { Clock, ShieldCheck } from "lucide-react";

import { useCountdown } from "../hooks/use-countdown";
import type { CheckoutSession } from "../types";

export function CheckoutSummary({ session }: { session: CheckoutSession }) {
  const countdown = useCountdown(session.expiresAt);

  const fmt = (v: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: session.currency,
    }).format(v);

  const initials = session.customerName
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const isTerminal = ["paid", "expired", "abandoned"].includes(session.status);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
    >
      {/* Top accent bar */}
      <div className="h-1 bg-gradient-to-r from-orange-400 via-orange-500 to-amber-500" />

      <div className="p-5">
        {/* Shield badge + Description */}
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50">
            <ShieldCheck className="h-5 w-5 text-orange-500" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900 leading-tight">
              {session.description}
            </p>
            <p className="mt-0.5 text-xs text-gray-400">
              Ref: #{session.shortId}
            </p>
          </div>
        </div>

        {/* Amount */}
        <div className="mt-4 flex items-end justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
              Valor total
            </p>
            <p className="mt-0.5 text-3xl font-extrabold tracking-tight text-gray-900">
              {fmt(session.amount)}
            </p>
          </div>

          {/* Customer avatar */}
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-500">
              {initials}
            </div>
            <div className="hidden text-right sm:block">
              <p className="text-xs font-medium text-gray-700">
                {session.customerName}
              </p>
              {session.customerEmail ? (
                <p className="text-[0.65rem] text-gray-400">
                  {session.customerEmail}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        {/* Countdown */}
        {!isTerminal && session.expiresAt ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className={`mt-4 flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-medium ${
              countdown.total < 300000
                ? "bg-red-50 text-red-600"
                : countdown.total < 600000
                  ? "bg-amber-50 text-amber-600"
                  : "bg-gray-50 text-gray-500"
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            {countdown.expired ? (
              "Link expirado"
            ) : (
              <>
                Este link expira em{" "}
                <span className="font-mono font-bold">{countdown.formatted}</span>
              </>
            )}
          </motion.div>
        ) : null}
      </div>
    </motion.div>
  );
}
