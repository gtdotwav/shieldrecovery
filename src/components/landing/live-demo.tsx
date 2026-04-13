"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  MessageSquare,
  LayoutDashboard,
  CreditCard,
  TrendingUp,
  Users,
  Clock,
  QrCode,
  CheckCircle2,
  Bot,
  User,
} from "lucide-react";
import { platformBrand } from "@/lib/platform";

/* ───────── brand tokens ───────── */

const b = platformBrand;
const rgb = b.accentRgb;

/* ───────── tabs ───────── */

type Tab = "recovery" | "dashboard" | "checkout";

const tabs: { id: Tab; label: string; icon: typeof MessageSquare }[] = [
  { id: "recovery", label: "Recuperação", icon: MessageSquare },
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "checkout", label: "Checkout", icon: CreditCard },
];

/* ───────── component ───────── */

export function LiveDemo() {
  const [activeTab, setActiveTab] = useState<Tab>("recovery");

  return (
    <section className="relative z-10 mx-auto max-w-[82rem] px-4 pb-16 sm:px-8 sm:pb-24 lg:px-10">
      {/* Header */}
      <div className="mb-8 text-center sm:mb-14">
        <p
          className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.2em] opacity-70 sm:tracking-[0.3em]"
          style={{ color: b.accent }}
        >
          Como funciona
        </p>
        <h2 className="mt-3 text-balance text-2xl font-bold tracking-[-0.03em] text-gray-900 dark:text-white sm:mt-4 sm:text-[1.75rem] lg:text-[2.2rem]">
          Veja a plataforma em ação
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-gray-400 dark:text-gray-500 sm:mt-4 sm:text-[0.95rem] sm:leading-7">
          Recuperação automática, dashboard em tempo real e checkout integrado
          — tudo em uma plataforma.
        </p>
      </div>

      {/* Monitor */}
      <div className="mx-auto max-w-[54rem]">
        <div
          className="overflow-hidden rounded-xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] sm:rounded-2xl"
          style={{
            border: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(8,8,8,0.75)",
          }}
        >
          {/* Tab bar */}
          <div className="flex border-b border-white/[0.04]">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="relative flex flex-1 items-center justify-center gap-2 px-4 py-3.5 text-sm font-medium transition-colors sm:py-4"
                  style={{
                    color: isActive ? b.accent : "rgb(107,114,128)",
                  }}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="tab-indicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5"
                      style={{ background: b.accent }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <div className="relative min-h-[20rem] sm:min-h-[24rem]">
            <AnimatePresence mode="wait">
              {activeTab === "recovery" && (
                <motion.div
                  key="recovery"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3 }}
                  className="p-5 sm:p-8"
                >
                  <RecoveryTab />
                </motion.div>
              )}
              {activeTab === "dashboard" && (
                <motion.div
                  key="dashboard"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3 }}
                  className="p-5 sm:p-8"
                >
                  <DashboardTab />
                </motion.div>
              )}
              {activeTab === "checkout" && (
                <motion.div
                  key="checkout"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3 }}
                  className="p-5 sm:p-8"
                >
                  <CheckoutTab />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────── Recovery Tab ───────── */

function RecoveryTab() {
  const messages = [
    {
      from: "ai" as const,
      text: "Olá Carlos! Notamos que seu pagamento de R$ 1.297,00 não foi processado. Posso ajudar a finalizar?",
      time: "14:32",
    },
    {
      from: "customer" as const,
      text: "Oi, tive problema no cartão. Tem como pagar por PIX?",
      time: "14:33",
    },
    {
      from: "ai" as const,
      text: "Claro! Aqui está seu link exclusivo para pagamento via PIX:",
      time: "14:33",
    },
    {
      from: "ai" as const,
      text: "Pagamento confirmado! R$ 1.297,00 via PIX. Obrigado, Carlos!",
      time: "14:35",
      isConfirmation: true,
    },
  ];

  return (
    <div className="mx-auto max-w-md space-y-3">
      <p className="mb-4 text-center text-xs font-medium uppercase tracking-widest text-gray-600">
        Conversa WhatsApp — Recuperação automática
      </p>
      {messages.map((msg, i) => {
        const isAi = msg.from === "ai";
        return (
          <div
            key={i}
            className={`flex items-start gap-2 ${isAi ? "" : "flex-row-reverse"} ${isAi ? "" : "ml-auto"}`}
            style={{ maxWidth: "92%" }}
          >
            <div
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
              style={{
                background: isAi ? `rgba(${rgb},0.08)` : "rgba(255,255,255,0.04)",
              }}
            >
              {isAi ? (
                <Bot className="h-3 w-3" style={{ color: `rgba(${rgb},0.7)` }} />
              ) : (
                <User className="h-3 w-3 text-gray-500" />
              )}
            </div>
            <div
              className={`rounded-xl px-3.5 py-2.5 ${isAi ? "rounded-tl-sm" : "rounded-tr-sm"}`}
              style={{
                border: isAi
                  ? `1px solid rgba(${rgb},0.08)`
                  : "1px solid rgba(255,255,255,0.04)",
                background: msg.isConfirmation
                  ? `rgba(${rgb},0.08)`
                  : isAi
                  ? `rgba(${rgb},0.04)`
                  : "rgba(255,255,255,0.03)",
              }}
            >
              {msg.isConfirmation && (
                <div className="mb-1 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" style={{ color: b.accent }} />
                  <span className="text-xs font-bold" style={{ color: b.accent }}>
                    Pagamento Confirmado!
                  </span>
                </div>
              )}
              <p
                className="text-sm leading-relaxed"
                style={{ color: isAi ? `rgba(${rgb},0.65)` : "rgb(156,163,175)" }}
              >
                {msg.text}
              </p>
              <p
                className="mt-1 text-[0.6rem]"
                style={{ color: isAi ? `rgba(${rgb},0.25)` : "rgba(255,255,255,0.15)" }}
              >
                {msg.time}{isAi && ` \u2022 ${b.name} AI`}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ───────── Dashboard Tab ───────── */

function DashboardTab() {
  const metrics = [
    { label: "Recuperados hoje", value: "R$ 12.450", icon: TrendingUp, accent: true },
    { label: "Leads ativos", value: "34", icon: Users, accent: false },
    { label: "Tempo médio", value: "1m 47s", icon: Clock, accent: false },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <div
              key={m.label}
              className="rounded-xl border px-4 py-4"
              style={{
                borderColor: m.accent ? `rgba(${rgb},0.12)` : "rgba(255,255,255,0.04)",
                background: m.accent ? `rgba(${rgb},0.04)` : "rgba(255,255,255,0.02)",
              }}
            >
              <div className="flex items-center gap-2">
                <Icon
                  className="h-4 w-4"
                  style={{ color: m.accent ? b.accent : "rgb(107,114,128)" }}
                />
                <span className="text-xs text-gray-500">{m.label}</span>
              </div>
              <p
                className="mt-2 text-xl font-bold tracking-tight"
                style={{ color: m.accent ? b.accent : "rgb(229,231,235)" }}
              >
                {m.value}
              </p>
            </div>
          );
        })}
      </div>

      <div className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-widest text-gray-600">
          Funcionalidades do dashboard
        </p>
        <ul className="space-y-2 text-sm text-gray-400">
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" style={{ color: b.accent }} />
            Taxa de recuperação em tempo real com funil de conversão
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" style={{ color: b.accent }} />
            Breakdown por canal: WhatsApp, Email e Voz
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" style={{ color: b.accent }} />
            Histórico completo com exportação CSV
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" style={{ color: b.accent }} />
            App mobile com push notifications
          </li>
        </ul>
      </div>
    </div>
  );
}

/* ───────── Checkout Tab ───────── */

function CheckoutTab() {
  const methods = [
    { label: "PIX", desc: "Aprovação instantânea", icon: QrCode },
    { label: "Cartão de Crédito", desc: "Até 12x sem juros", icon: CreditCard },
    { label: "Boleto", desc: "Vencimento em 3 dias", icon: CreditCard },
  ];

  return (
    <div className="space-y-6">
      <p className="text-center text-xs font-medium uppercase tracking-widest text-gray-600">
        Métodos de pagamento no checkout
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {methods.map((m) => {
          const Icon = m.icon;
          return (
            <div
              key={m.label}
              className="flex flex-col items-center gap-3 rounded-xl border border-white/[0.04] bg-white/[0.02] px-4 py-5 text-center"
            >
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg"
                style={{ background: `rgba(${rgb},0.08)` }}
              >
                <Icon className="h-5 w-5" style={{ color: b.accent }} />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-200">{m.label}</p>
                <p className="mt-0.5 text-xs text-gray-500">{m.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] px-5 py-4">
        <p className="text-sm text-gray-400 leading-relaxed">
          Checkout otimizado para conversão com split automático de pagamentos,
          cálculo de comissão integrado, e suporte a múltiplos gateways.
          O cliente recebe um link personalizado e paga pelo método preferido.
        </p>
      </div>
    </div>
  );
}
