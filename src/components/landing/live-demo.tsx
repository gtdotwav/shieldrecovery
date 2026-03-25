"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bot,
  CheckCircle2,
  ChevronRight,
  Clock,
  MessageSquare,
  Phone,
  Send,
  User,
} from "lucide-react";

/* ───────── types ───────── */

type Lead = {
  name: string;
  value: string;
  method: string;
  status: "new" | "contacted" | "waiting" | "recovered";
  time: string;
};

type Message = {
  from: "ai" | "customer";
  text: string;
  time: string;
};

/* ───────── data ───────── */

const LEADS: Lead[] = [
  { name: "Maria S.", value: "R$ 197,00", method: "PIX", status: "recovered", time: "2min" },
  { name: "João P.", value: "R$ 497,00", method: "Cartão", status: "waiting", time: "6min" },
  { name: "Ana L.", value: "R$ 89,90", method: "Boleto", status: "contacted", time: "12min" },
  { name: "Carlos R.", value: "R$ 1.297,00", method: "PIX", status: "new", time: "agora" },
  { name: "Fernanda M.", value: "R$ 347,00", method: "Cartão", status: "waiting", time: "18min" },
  { name: "Ricardo B.", value: "R$ 67,00", method: "PIX", status: "recovered", time: "24min" },
];

const CONVERSATION: Message[] = [
  {
    from: "ai",
    text: "Olá Carlos! Notamos que seu pagamento de R$ 1.297,00 não foi concluído. Posso te ajudar a finalizar?",
    time: "14:32",
  },
  {
    from: "customer",
    text: "Oi, tive problema no cartão. Tem como pagar por PIX?",
    time: "14:33",
  },
  {
    from: "ai",
    text: "Claro! Aqui está seu link para pagamento via PIX. O valor é R$ 1.297,00 com aprovação instantânea:",
    time: "14:33",
  },
  {
    from: "ai",
    text: "🔗 https://pay.pagrecovery.com/c/xK9m2 — PIX • R$ 1.297,00",
    time: "14:33",
  },
  {
    from: "customer",
    text: "Paguei! Pode verificar?",
    time: "14:35",
  },
  {
    from: "ai",
    text: "✅ Pagamento confirmado! Obrigado, Carlos. Sua compra está garantida.",
    time: "14:35",
  },
];

/* ───────── status config ───────── */

const STATUS_CONFIG = {
  new: { label: "Novo", color: "bg-amber-400/80", ring: "ring-amber-400/20", text: "text-amber-300" },
  contacted: { label: "Contatado", color: "bg-blue-400/80", ring: "ring-blue-400/20", text: "text-blue-300" },
  waiting: { label: "Aguardando", color: "bg-orange-400/80", ring: "ring-orange-400/20", text: "text-orange-300" },
  recovered: { label: "Recuperado", color: "bg-emerald-400/80", ring: "ring-emerald-400/20", text: "text-emerald-300" },
};

/* ───────── component ───────── */

export function LiveDemo() {
  const [visibleMessages, setVisibleMessages] = useState(0);
  const [activeLead, setActiveLead] = useState(3);
  const [typing, setTyping] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (visibleMessages >= CONVERSATION.length) return;

    const next = CONVERSATION[visibleMessages];
    const delay = next.from === "ai" ? 2200 : 1800;

    const typingTimer = setTimeout(() => {
      if (next.from === "ai") setTyping(true);
    }, delay - 1200);

    const msgTimer = setTimeout(() => {
      setTyping(false);
      setVisibleMessages((v) => v + 1);
    }, delay);

    return () => {
      clearTimeout(typingTimer);
      clearTimeout(msgTimer);
    };
  }, [visibleMessages]);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [visibleMessages, typing]);

  // Cycle active lead highlight
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveLead((prev) => (prev + 1) % LEADS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative z-10 mx-auto max-w-[82rem] px-6 pb-24 sm:px-8 lg:px-10">
      {/* Section header */}
      <div className="mb-12 text-center">
        <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.32em] text-[var(--accent)]">
          Operação ao vivo
        </p>
        <h2 className="mt-4 text-balance text-3xl font-bold tracking-[-0.035em] text-white sm:text-[2.6rem]">
          Veja a IA recuperando em tempo real
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-white/48">
          Enquanto você foca no negócio, a PagRecovery trabalha 24/7 recuperando
          cada pagamento falhado automaticamente.
        </p>
      </div>

      {/* Monitor frame */}
      <div className="mx-auto max-w-[68rem]">
        <div className="rounded-[2rem] bg-[rgba(20,20,20,0.8)] p-3 shadow-[inset_0_2px_4px_rgba(255,255,255,0.06),0_30px_60px_-10px_rgba(0,0,0,0.8),0_0_0_1px_rgba(0,0,0,0.9)]">
          {/* Status LEDs */}
          <div className="mb-2 flex items-center justify-between px-4 py-1.5">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)] opacity-50" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--accent)] shadow-[0_0_8px_rgba(30,215,96,0.6)]" />
              </span>
              <span className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-[var(--accent)]/60">
                PagRecovery AI — Ativo
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[var(--accent)] shadow-[0_0_6px_rgba(30,215,96,0.5)]" />
              <span className="h-2 w-2 rounded-full bg-zinc-700" />
            </div>
          </div>

          {/* Screen */}
          <div className="relative overflow-hidden rounded-[1.25rem] border-[4px] border-zinc-950 bg-[#020e08] shadow-[inset_0_0_40px_rgba(0,0,0,0.8)]">
            {/* CRT scanlines */}
            <div
              className="pointer-events-none absolute inset-0 z-30 opacity-[0.04] mix-blend-overlay"
              style={{
                background:
                  "repeating-linear-gradient(0deg, #000, #000 1px, transparent 1px, transparent 3px)",
              }}
            />
            {/* Green ambient */}
            <div className="pointer-events-none absolute inset-0 z-20 bg-[rgba(30,215,96,0.02)] mix-blend-screen animate-pulse" style={{ animationDuration: "4s" }} />
            {/* Top shine */}
            <div className="pointer-events-none absolute left-0 top-0 z-20 h-1/3 w-full rounded-t-[14px] bg-gradient-to-b from-white/[0.03] to-transparent" />

            {/* Content grid */}
            <div className="relative z-10 grid h-[26rem] sm:h-[28rem] lg:grid-cols-[1fr_1.3fr]">
              {/* ─── CRM Panel ─── */}
              <div className="hidden border-r border-[rgba(30,215,96,0.08)] lg:flex lg:flex-col">
                {/* CRM Header */}
                <div className="flex items-center gap-2 border-b border-[rgba(30,215,96,0.08)] px-4 py-3">
                  <User className="h-3.5 w-3.5 text-[var(--accent)]/60" />
                  <span className="font-mono text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]/60">
                    CRM — Leads ativos
                  </span>
                  <span className="ml-auto rounded-full bg-[rgba(30,215,96,0.1)] px-2 py-0.5 font-mono text-[0.55rem] text-[var(--accent)]/70">
                    {LEADS.length}
                  </span>
                </div>

                {/* Lead list */}
                <div className="flex-1 overflow-y-auto p-2">
                  {LEADS.map((lead, i) => {
                    const cfg = STATUS_CONFIG[lead.status];
                    const isActive = i === activeLead;

                    return (
                      <div
                        key={lead.name}
                        className={`mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-500 ${
                          isActive
                            ? "border border-[rgba(30,215,96,0.15)] bg-[rgba(30,215,96,0.06)]"
                            : "border border-transparent"
                        }`}
                      >
                        {/* Avatar */}
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-2 ${cfg.ring} bg-zinc-900`}>
                          <span className="text-[0.65rem] font-semibold text-white/60">
                            {lead.name.slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                        {/* Info */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[0.75rem] font-medium text-white/80 truncate">{lead.name}</span>
                            <span className="font-mono text-[0.55rem] text-white/30">{lead.time}</span>
                          </div>
                          <div className="mt-0.5 flex items-center gap-2">
                            <span className="text-[0.68rem] font-semibold text-white/60">{lead.value}</span>
                            <span className="text-[0.55rem] text-white/30">•</span>
                            <span className="text-[0.6rem] text-white/30">{lead.method}</span>
                          </div>
                        </div>
                        {/* Status badge */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`h-1.5 w-1.5 rounded-full ${cfg.color}`} />
                          <span className={`text-[0.55rem] font-medium ${cfg.text}`}>
                            {cfg.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* CRM footer stats */}
                <div className="grid grid-cols-3 gap-px border-t border-[rgba(30,215,96,0.08)] bg-[rgba(30,215,96,0.02)]">
                  <CrmStat label="Novos" value="12" />
                  <CrmStat label="Ativos" value="34" />
                  <CrmStat label="Recuperados" value="89" />
                </div>
              </div>

              {/* ─── Conversas Panel ─── */}
              <div className="flex flex-col">
                {/* Conversation Header */}
                <div className="flex items-center gap-3 border-b border-[rgba(30,215,96,0.08)] px-5 py-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(30,215,96,0.12)] ring-2 ring-[rgba(30,215,96,0.15)]">
                    <span className="text-[0.65rem] font-bold text-[var(--accent)]">CR</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[0.78rem] font-semibold text-white/90">Carlos R.</span>
                      <span className="rounded-full bg-amber-400/10 px-1.5 py-0.5 text-[0.5rem] font-semibold uppercase text-amber-300">
                        novo
                      </span>
                    </div>
                    <span className="text-[0.6rem] text-white/35">R$ 1.297,00 • PIX • Falha no cartão</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-white/25" />
                    <MessageSquare className="h-3.5 w-3.5 text-[var(--accent)]/60" />
                  </div>
                </div>

                {/* Messages */}
                <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                  {CONVERSATION.slice(0, visibleMessages).map((msg, i) => (
                    <ChatBubble key={i} message={msg} />
                  ))}

                  {typing && (
                    <div className="flex items-start gap-2.5 max-w-[88%]">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[rgba(30,215,96,0.12)]">
                        <Bot className="h-3 w-3 text-[var(--accent)]" />
                      </div>
                      <div className="rounded-2xl rounded-tl-sm bg-[rgba(30,215,96,0.06)] border border-[rgba(30,215,96,0.1)] px-4 py-2.5">
                        <div className="flex items-center gap-1">
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--accent)]/60" style={{ animationDelay: "0ms" }} />
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--accent)]/60" style={{ animationDelay: "150ms" }} />
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--accent)]/60" style={{ animationDelay: "300ms" }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Input area */}
                <div className="border-t border-[rgba(30,215,96,0.08)] bg-black/30 p-3 backdrop-blur-md">
                  <div className="flex items-center gap-2 rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-3 py-2 shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)]">
                    <Bot className="h-4 w-4 text-[var(--accent)]/40" />
                    <span className="flex-1 text-[0.75rem] text-[var(--accent)]/30 font-light">
                      IA respondendo automaticamente...
                    </span>
                    <div className="flex h-6 w-6 items-center justify-center rounded-lg border border-[rgba(30,215,96,0.2)] bg-zinc-800">
                      <Send className="h-3 w-3 text-[var(--accent)]/50" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────── sub-components ───────── */

function ChatBubble({ message }: { message: Message }) {
  const isAi = message.from === "ai";

  return (
    <div className={`flex items-start gap-2.5 ${isAi ? "" : "flex-row-reverse"} max-w-[88%] ${isAi ? "" : "ml-auto"}`}>
      <div
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
          isAi
            ? "bg-[rgba(30,215,96,0.12)]"
            : "bg-zinc-800"
        }`}
      >
        {isAi ? (
          <Bot className="h-3 w-3 text-[var(--accent)]" />
        ) : (
          <User className="h-3 w-3 text-white/50" />
        )}
      </div>
      <div
        className={`rounded-2xl px-4 py-2.5 ${
          isAi
            ? "rounded-tl-sm border border-[rgba(30,215,96,0.1)] bg-[rgba(30,215,96,0.06)]"
            : "rounded-tr-sm border border-zinc-800 bg-zinc-900/60"
        }`}
      >
        <p className={`text-[0.78rem] leading-relaxed ${isAi ? "text-[var(--accent)]/80" : "text-white/70"}`}>
          {message.text}
        </p>
        <p className={`mt-1 text-[0.5rem] ${isAi ? "text-[var(--accent)]/30" : "text-white/20"}`}>
          {message.time} {isAi && "• PagRecovery AI"}
        </p>
      </div>
    </div>
  );
}

function CrmStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3 py-2.5 text-center">
      <p className="text-[1rem] font-semibold text-white/70">{value}</p>
      <p className="font-mono text-[0.5rem] uppercase tracking-[0.15em] text-white/30">{label}</p>
    </div>
  );
}
