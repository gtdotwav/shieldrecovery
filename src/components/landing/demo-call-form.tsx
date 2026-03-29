"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { platformBrand } from "@/lib/platform";

const b = platformBrand;

type Status = "idle" | "submitting" | "success" | "error";

function formatPhoneDisplay(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 11)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

export function DemoCallForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  const handlePhoneChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/\D/g, "").slice(0, 11);
      setPhone(raw);
    },
    [],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (status === "submitting" || status === "success") return;

      const trimmedName = name.trim();
      const digits = phone.replace(/\D/g, "");

      if (!trimmedName || trimmedName.length < 2) {
        setStatus("error");
        setMessage("Digite seu nome.");
        return;
      }

      if (digits.length < 10 || digits.length > 11) {
        setStatus("error");
        setMessage("Telefone inválido. Use (DDD) 9XXXX-XXXX.");
        return;
      }

      setStatus("submitting");
      setMessage("");

      try {
        const response = await fetch("/api/calls/demo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: trimmedName, phone: digits }),
        });

        const data = await response.json();

        if (data.ok) {
          setStatus("success");
          setMessage(
            data.message ||
              "Chamada disparada! Atenda o telefone nos próximos segundos.",
          );
        } else {
          setStatus("error");
          setMessage(data.error || "Não foi possível iniciar a chamada.");
        }
      } catch {
        setStatus("error");
        setMessage("Erro de conexão. Tente novamente.");
      }
    },
    [name, phone, status],
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="text-[0.68rem] font-semibold uppercase tracking-[0.15em] text-gray-400">
            Seu nome
          </span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Como podemos te chamar?"
            required
            disabled={status === "success"}
            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-gray-500 outline-none transition-colors focus:border-white/[0.16] disabled:opacity-50"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-[0.68rem] font-semibold uppercase tracking-[0.15em] text-gray-400">
            Telefone com DDD
          </span>
          <input
            type="tel"
            value={formatPhoneDisplay(phone)}
            onChange={handlePhoneChange}
            placeholder="(11) 99999-9999"
            required
            disabled={status === "success"}
            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-gray-500 outline-none transition-colors focus:border-white/[0.16] disabled:opacity-50"
          />
        </label>
      </div>

      <AnimatePresence mode="wait">
        {status === "success" ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 rounded-xl border px-4 py-3"
            style={{
              borderColor: `rgba(${b.accentRgb},0.2)`,
              background: `rgba(${b.accentRgb},0.06)`,
            }}
          >
            <CheckCircle2
              className="mt-0.5 h-5 w-5 shrink-0"
              style={{ color: b.accent }}
            />
            <div>
              <p className="text-sm font-semibold text-white">{message}</p>
              <p className="mt-1 text-[0.78rem] text-gray-400">
                A IA vai se apresentar, explicar como funciona e responder suas
                dúvidas. Duração máxima: 90 segundos.
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div key="form-actions" className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="submit"
              disabled={status === "submitting"}
              className="group inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white transition-all hover:brightness-110 disabled:opacity-70"
              style={{
                background: b.accent,
                boxShadow: `0 12px 32px ${b.accentGlow}`,
              }}
            >
              {status === "submitting" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Disparando chamada...
                </>
              ) : (
                <>
                  <Phone className="h-4 w-4" />
                  Receber chamada grátis
                </>
              )}
            </button>

            <p className="text-[0.72rem] text-gray-500">
              1 teste por número · duração máx. 90s · sem compromisso
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {status === "error" && message ? (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-sm text-red-400"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          {message}
        </motion.div>
      ) : null}
    </form>
  );
}
