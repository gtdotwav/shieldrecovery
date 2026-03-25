"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bot,
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
  { from: "ai", text: "Olá Carlos! Notamos que seu pagamento de R$ 1.297,00 não foi concluído. Posso te ajudar a finalizar?", time: "14:32" },
  { from: "customer", text: "Oi, tive problema no cartão. Tem como pagar por PIX?", time: "14:33" },
  { from: "ai", text: "Claro! Aqui está seu link para pagamento via PIX com aprovação instantânea:", time: "14:33" },
  { from: "ai", text: "🔗 pay.pagrecovery.com/c/xK9m2 — PIX • R$ 1.297,00", time: "14:33" },
  { from: "customer", text: "Paguei! Pode verificar?", time: "14:35" },
  { from: "ai", text: "✅ Pagamento confirmado! Obrigado, Carlos. Sua compra está garantida.", time: "14:35" },
];

const STATUS_CONFIG = {
  new: { label: "Novo", dot: "bg-amber-400", text: "text-amber-300/70" },
  contacted: { label: "Contatado", dot: "bg-blue-400", text: "text-blue-300/70" },
  waiting: { label: "Aguardando", dot: "bg-orange-400", text: "text-orange-300/70" },
  recovered: { label: "Recuperado", dot: "bg-emerald-400", text: "text-emerald-300/70" },
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
    const delay = next.from === "ai" ? 2400 : 2000;

    const typingTimer = setTimeout(() => {
      if (next.from === "ai") setTyping(true);
    }, delay - 1400);

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

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveLead((prev) => (prev + 1) % LEADS.length);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative z-10 mx-auto max-w-[82rem] px-6 pb-24 sm:px-8 lg:px-10">
      <div className="mb-14 text-center">
        <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-[var(--accent)]/70">
          Operação ao vivo
        </p>
        <h2 className="mt-4 text-balance text-[1.75rem] font-bold tracking-[-0.03em] text-white sm:text-[2.2rem]">
          Veja a IA recuperando em tempo real
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-[0.95rem] leading-7 text-white/40">
          Enquanto você foca no negócio, a PagRecovery trabalha 24/7 recuperando
          cada pagamento falhado automaticamente.
        </p>
      </div>

      {/* Monitor */}
      <div className="mx-auto max-w-[66rem]">
        <div className="rounded-2xl border border-white/[0.06] bg-[rgba(8,8,8,0.7)] p-2.5 shadow-[0_40px_80px_-12px_rgba(0,0,0,0.7)]">
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 py-2">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)] opacity-40" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--accent)] shadow-[0_0_6px_rgba(30,215,96,0.5)]" />
              </span>
              <span className="font-mono text-[0.55rem] uppercase tracking-[0.2em] text-[var(--accent)]/50">
                PagRecovery AI — Ativo
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[var(--accent)]/60" />
              <span className="h-2 w-2 rounded-full bg-white/10" />
              <span className="h-2 w-2 rounded-full bg-white/10" />
            </div>
          </div>

          {/* Screen */}
          <div className="relative overflow-hidden rounded-xl border border-white/[0.04] bg-[#020c07]">
            {/* Scanlines */}
            <div
              className="pointer-events-none absolute inset-0 z-30 opacity-[0.03]"
              style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)" }}
            />
            {/* Green glow */}
            <div className="pointer-events-none absolute inset-0 z-20 animate-pulse bg-[rgba(30,215,96,0.015)] mix-blend-screen" style={{ animationDuration: "5s" }} />

            {/* Content */}
            <div className="relative z-10 grid h-[24rem] sm:h-[26rem] lg:grid-cols-[1fr_1.35fr]">
              {/* ─── CRM ─── */}
              <div className="hidden border-r border-white/[0.04] lg:flex lg:flex-col">
                <div className="flex items-center gap-2 border-b border-white/[0.04] px-4 py-3">
                  <User className="h-3.5 w-3.5 text-[var(--accent)]/40" />
                  <span className="font-mono text-[0.58rem] font-medium uppercase tracking-[0.2em] text-white/30">
                    CRM — Leads
                  </span>
                  <span className="ml-auto rounded-md bg-[rgba(30,215,96,0.08)] px-1.5 py-0.5 font-mono text-[0.5rem] text-[var(--accent)]/50">
                    {LEADS.length}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto p-1.5">
                  {LEADS.map((lead, i) => {
                    const cfg = STATUS_CONFIG[lead.status];
                    const isActive = i === activeLead;

                    return (
                      <div
                        key={lead.name}
                        className={`mb-0.5 flex items-center gap-2.5 rounded-lg px-3 py-2 transition-all duration-500 ${
                          isActive
                            ? "bg-[rgba(30,215,96,0.04)] shadow-[inset_0_0_0_1px_rgba(30,215,96,0.1)]"
                            : "hover:bg-white/[0.02]"
                        }`}
                      >
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/[0.04]">
                          <span className="text-[0.58rem] font-semibold text-white/40">
                            {lead.name.slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="truncate text-[0.7rem] font-medium text-white/65">{lead.name}</span>
                            <span className="font-mono text-[0.48rem] text-white/20">{lead.time}</span>
                          </div>
                          <div className="mt-0.5 flex items-center gap-1.5">
                            <span className="text-[0.62rem] font-semibold text-white/45">{lead.value}</span>
                            <span className="text-[0.5rem] text-white/15">•</span>
                            <span className="text-[0.55rem] text-white/20">{lead.method}</span>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                          <span className={`text-[0.48rem] font-medium ${cfg.text}`}>{cfg.label}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="grid grid-cols-3 border-t border-white/[0.04]">
                  <CrmStat label="Novos" value="12" />
                  <CrmStat label="Ativos" value="34" />
                  <CrmStat label="Recuperados" value="89" />
                </div>
              </div>

              {/* ─── Chat ─── */}
              <div className="flex flex-col">
                <div className="flex items-center gap-3 border-b border-white/[0.04] px-5 py-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[rgba(30,215,96,0.08)]">
                    <span className="text-[0.58rem] font-bold text-[var(--accent)]/70">CR</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[0.72rem] font-semibold text-white/80">Carlos R.</span>
                      <span className="rounded-md bg-amber-400/8 px-1.5 py-0.5 text-[0.45rem] font-semibold uppercase text-amber-300/60">
                        novo
                      </span>
                    </div>
                    <span className="text-[0.55rem] text-white/25">R$ 1.297,00 • PIX • Falha no cartão</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-white/15" />
                    <MessageSquare className="h-3.5 w-3.5 text-[var(--accent)]/40" />
                  </div>
                </div>

                <div ref={chatRef} className="flex-1 space-y-2.5 overflow-y-auto p-4">
                  {CONVERSATION.slice(0, visibleMessages).map((msg, i) => (
                    <ChatBubble key={i} message={msg} />
                  ))}
                  {typing && <TypingIndicator />}
                </div>

                <div className="border-t border-white/[0.04] bg-black/20 p-3 backdrop-blur-md">
                  <div className="flex items-center gap-2 rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2">
                    <Bot className="h-3.5 w-3.5 text-[var(--accent)]/30" />
                    <span className="flex-1 text-[0.7rem] font-light text-[var(--accent)]/20">
                      IA respondendo automaticamente...
                    </span>
                    <div className="flex h-6 w-6 items-center justify-center rounded-md border border-white/[0.06] bg-white/[0.03]">
                      <Send className="h-3 w-3 text-[var(--accent)]/30" />
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
    <div className={`flex items-start gap-2 ${isAi ? "" : "flex-row-reverse"} max-w-[88%] ${isAi ? "" : "ml-auto"}`}>
      <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${isAi ? "bg-[rgba(30,215,96,0.08)]" : "bg-white/[0.04]"}`}>
        {isAi ? <Bot className="h-2.5 w-2.5 text-[var(--accent)]/70" /> : <User className="h-2.5 w-2.5 text-white/35" />}
      </div>
      <div className={`rounded-2xl px-3.5 py-2 ${
        isAi
          ? "rounded-tl-sm border border-[rgba(30,215,96,0.06)] bg-[rgba(30,215,96,0.04)]"
          : "rounded-tr-sm border border-white/[0.04] bg-white/[0.03]"
      }`}>
        <p className={`text-[0.72rem] leading-relaxed ${isAi ? "text-[var(--accent)]/65" : "text-white/55"}`}>
          {message.text}
        </p>
        <p className={`mt-0.5 text-[0.45rem] ${isAi ? "text-[var(--accent)]/20" : "text-white/15"}`}>
          {message.time} {isAi && "• PagRecovery AI"}
        </p>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-start gap-2 max-w-[88%]">
      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[rgba(30,215,96,0.08)]">
        <Bot className="h-2.5 w-2.5 text-[var(--accent)]/70" />
      </div>
      <div className="rounded-2xl rounded-tl-sm border border-[rgba(30,215,96,0.06)] bg-[rgba(30,215,96,0.04)] px-4 py-2.5">
        <div className="flex items-center gap-1">
          <span className="h-1 w-1 animate-bounce rounded-full bg-[var(--accent)]/40" style={{ animationDelay: "0ms" }} />
          <span className="h-1 w-1 animate-bounce rounded-full bg-[var(--accent)]/40" style={{ animationDelay: "150ms" }} />
          <span className="h-1 w-1 animate-bounce rounded-full bg-[var(--accent)]/40" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}

function CrmStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3 py-2.5 text-center">
      <p className="text-[0.88rem] font-semibold text-white/50">{value}</p>
      <p className="font-mono text-[0.45rem] uppercase tracking-[0.18em] text-white/20">{label}</p>
    </div>
  );
}
