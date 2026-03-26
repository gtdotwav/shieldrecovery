"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  CheckCircle2,
  Clock,
  MessageSquare,
  Phone,
  QrCode,
  RefreshCw,
  Send,
  User,
  Zap,
} from "lucide-react";
import { platformBrand } from "@/lib/platform";

/* ───────── brand tokens ───────── */

const b = platformBrand;
const rgb = b.accentRgb;
const cardBg = b.slug === "pagrecovery" ? "6,20,15" : "13,13,13";

/* ───────── types ───────── */

type Phase =
  | "idle"
  | "detected"
  | "contacting"
  | "link_sent"
  | "waiting_payment"
  | "confirmed"
  | "complete";

type LeadStatus = "new" | "contacted" | "waiting" | "recovered";

type Lead = {
  name: string;
  initials: string;
  value: string;
  method: string;
  status: LeadStatus;
  time: string;
};

type Message = {
  from: "ai" | "customer";
  text: string;
  time: string;
  type?: "text" | "payment_link" | "confirmation";
};

/* ───────── data ───────── */

const LEADS: Lead[] = [
  { name: "Maria S.", initials: "MS", value: "R$ 197,00", method: "PIX", status: "recovered", time: "2min" },
  { name: "João P.", initials: "JP", value: "R$ 497,00", method: "Cartão", status: "waiting", time: "6min" },
  { name: "Ana L.", initials: "AL", value: "R$ 89,90", method: "Boleto", status: "contacted", time: "12min" },
  { name: "Carlos R.", initials: "CR", value: "R$ 1.297,00", method: "PIX", status: "new", time: "agora" },
  { name: "Fernanda M.", initials: "FM", value: "R$ 347,00", method: "Cartão", status: "waiting", time: "18min" },
  { name: "Ricardo B.", initials: "RB", value: "R$ 67,00", method: "PIX", status: "recovered", time: "24min" },
];

const CONVERSATION: Message[] = [
  { from: "ai", text: "Olá Carlos! Notamos que seu pagamento de R$ 1.297,00 não foi processado. Gostaria de ajuda para finalizar?", time: "14:32" },
  { from: "customer", text: "Oi, tive problema no cartão. Tem como pagar por PIX?", time: "14:33" },
  { from: "ai", text: "Claro! Preparei um link exclusivo pra você:", time: "14:33" },
  { from: "ai", text: "R$ 1.297,00", time: "14:33", type: "payment_link" },
  { from: "customer", text: "Pronto, paguei!", time: "14:35" },
  { from: "ai", text: "R$ 1.297,00 via PIX — Carlos R.", time: "14:35", type: "confirmation" },
];

const STATUS_MAP: Record<LeadStatus, { label: string; dot: string; text: string }> = {
  new: { label: "Novo", dot: "bg-amber-400", text: "text-amber-300/70" },
  contacted: { label: "Contatado", dot: "bg-blue-400", text: "text-blue-300/70" },
  waiting: { label: "Aguardando", dot: "bg-orange-400", text: "text-orange-300/70" },
  recovered: { label: "Recuperado", dot: `bg-[${b.accent}]`, text: `text-[${b.accent}]` },
};

const TIMELINE_STEPS = [
  { label: "Detectado", icon: Zap, activatesAt: "detected" },
  { label: "Contatando", icon: Bot, activatesAt: "contacting" },
  { label: "Link enviado", icon: MessageSquare, activatesAt: "link_sent" },
  { label: "Confirmado", icon: CheckCircle2, activatesAt: "confirmed" },
] as const;

const PHASE_ORDER: Phase[] = [
  "idle",
  "detected",
  "contacting",
  "link_sent",
  "waiting_payment",
  "confirmed",
  "complete",
];

const STATUS_BADGES: Partial<Record<Phase, { label: string; color: string }>> = {
  detected: { label: "Falha detectada", color: "#fbbf24" },
  contacting: { label: "Contatando cliente", color: "#60a5fa" },
  link_sent: { label: "Link enviado", color: b.accent },
  waiting_payment: { label: "Aguardando pagamento", color: b.accent },
  confirmed: { label: "Recuperado", color: b.accent },
  complete: { label: "Recuperado", color: b.accent },
};

/* ───────── helpers ───────── */

function phaseIndex(p: Phase) {
  return PHASE_ORDER.indexOf(p);
}

function getCarlosStatus(phase: Phase): LeadStatus {
  const i = phaseIndex(phase);
  if (i <= 1) return "new";
  if (i <= 2) return "contacted";
  if (i <= 4) return "waiting";
  return "recovered";
}

function formatElapsed(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

/* ───────── animation variants ───────── */

const msgVariants = {
  hidden: { opacity: 0, y: 14, filter: "blur(6px)", scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    scale: 1,
    transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
};

/* ───────── component ───────── */

export function LiveDemo() {
  const [started, setStarted] = useState(false);
  const [runId, setRunId] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [visibleMessages, setVisibleMessages] = useState(0);
  const [typing, setTyping] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [recoveredCount, setRecoveredCount] = useState(89);

  const sectionRef = useRef<HTMLElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  // ── Start on scroll ──
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const ob = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !started) {
          setStarted(true);
          ob.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    ob.observe(el);
    return () => ob.disconnect();
  }, [started]);

  // ── Orchestrate demo ──
  useEffect(() => {
    if (!started) return;

    const timers: ReturnType<typeof setTimeout>[] = [];
    const at = (ms: number, fn: () => void) =>
      timers.push(setTimeout(fn, ms));

    at(400, () => setPhase("detected"));
    at(1600, () => setTyping(true));
    at(2800, () => { setTyping(false); setVisibleMessages(1); setPhase("contacting"); });
    at(4500, () => setVisibleMessages(2));
    at(6000, () => setTyping(true));
    at(7000, () => { setTyping(false); setVisibleMessages(3); });
    at(7800, () => setTyping(true));
    at(8600, () => { setTyping(false); setVisibleMessages(4); setPhase("link_sent"); });
    at(10800, () => { setVisibleMessages(5); setPhase("waiting_payment"); });
    at(12200, () => setTyping(true));
    at(13200, () => {
      setTyping(false);
      setVisibleMessages(6);
      setPhase("confirmed");
      setRecoveredCount((c) => c + 1);
    });
    at(16500, () => setPhase("complete"));

    return () => timers.forEach(clearTimeout);
  }, [started, runId]);

  // ── Timer ──
  useEffect(() => {
    if (!started || phase === "idle" || phase === "complete") return;
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, [started, phase]);

  // ── Auto-scroll chat ──
  useEffect(() => {
    const el = chatRef.current;
    if (!el) return;
    requestAnimationFrame(() =>
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" }),
    );
  }, [visibleMessages, typing]);

  // ── Replay ──
  const replay = useCallback(() => {
    setPhase("idle");
    setVisibleMessages(0);
    setTyping(false);
    setElapsed(0);
    setRecoveredCount(89);
    setRunId((r) => r + 1);
  }, []);

  const currentPhaseIdx = phaseIndex(phase);
  const carlosStatus = getCarlosStatus(phase);
  const statusBadge = STATUS_BADGES[phase];

  return (
    <section
      ref={sectionRef}
      className="relative z-10 mx-auto max-w-[82rem] px-6 pb-24 sm:px-8 lg:px-10"
    >
      {/* Header */}
      <div className="mb-14 text-center">
        <p
          className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.3em] opacity-70"
          style={{ color: b.accent }}
        >
          Operação ao vivo
        </p>
        <h2 className="mt-4 text-balance text-[1.75rem] font-bold tracking-[-0.03em] text-gray-900 dark:text-white sm:text-[2.2rem]">
          Veja a IA recuperando em tempo real
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-[0.95rem] leading-7 text-gray-400 dark:text-gray-500">
          Enquanto você foca no negócio, a {b.name} trabalha 24/7 recuperando
          cada pagamento falhado automaticamente.
        </p>
      </div>

      {/* ── Monitor ── */}
      <div className="mx-auto max-w-[66rem]">
        <div
          className="relative overflow-hidden rounded-2xl p-2.5 shadow-[0_40px_80px_-12px_rgba(0,0,0,0.7)]"
          style={{
            border: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(8,8,8,0.75)",
          }}
        >
          {/* Celebration glow */}
          <AnimatePresence>
            {phase === "confirmed" && (
              <motion.div
                className="pointer-events-none absolute inset-0 z-40 rounded-2xl"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.2, 0.05] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 2, ease: "easeOut" }}
                style={{
                  background: `radial-gradient(ellipse at center, rgba(${rgb},0.15), transparent 70%)`,
                }}
              />
            )}
          </AnimatePresence>

          {/* ── Top bar ── */}
          <div className="flex items-center justify-between px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span
                  className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-40"
                  style={{ background: b.accent }}
                />
                <span
                  className="relative inline-flex h-2 w-2 rounded-full"
                  style={{ background: b.accent, boxShadow: `0 0 6px rgba(${rgb},0.5)` }}
                />
              </span>
              <span
                className="font-mono text-[0.55rem] uppercase tracking-[0.2em]"
                style={{ color: `rgba(${rgb},0.5)` }}
              >
                {b.name} AI — Ativo
              </span>
            </div>

            {/* Timeline steps */}
            <div className="hidden items-center gap-1 sm:flex">
              {TIMELINE_STEPS.map((step, i) => {
                const stepPhaseIdx = phaseIndex(step.activatesAt);
                const isCompleted = currentPhaseIdx > stepPhaseIdx;
                const isActive = currentPhaseIdx === stepPhaseIdx;
                const Icon = step.icon;

                return (
                  <div key={step.label} className="flex items-center">
                    {i > 0 && (
                      <div className="mx-1 h-px w-4 sm:w-6" style={{
                        background: isCompleted || isActive
                          ? `rgba(${rgb},0.4)`
                          : "rgba(255,255,255,0.06)",
                        transition: "background 0.6s ease",
                      }} />
                    )}
                    <motion.div
                      className="flex items-center gap-1.5 rounded-full px-2 py-1"
                      animate={{
                        background: isActive
                          ? `rgba(${rgb},0.12)`
                          : isCompleted
                          ? `rgba(${rgb},0.06)`
                          : "rgba(255,255,255,0.02)",
                        scale: isActive ? 1.05 : 1,
                      }}
                      transition={{ duration: 0.4 }}
                    >
                      <motion.div
                        animate={{
                          color: isActive || isCompleted ? b.accent : "rgba(255,255,255,0.15)",
                        }}
                        transition={{ duration: 0.4 }}
                      >
                        <Icon className="h-3 w-3" />
                      </motion.div>
                      <span
                        className="hidden text-[0.48rem] font-semibold uppercase tracking-[0.1em] lg:inline"
                        style={{
                          color: isActive || isCompleted ? b.accent : "rgba(255,255,255,0.2)",
                          transition: "color 0.4s ease",
                        }}
                      >
                        {step.label}
                      </span>
                    </motion.div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-1.5">
              {phase === "complete" && (
                <button
                  onClick={replay}
                  className="mr-2 flex items-center gap-1 rounded-md px-2 py-1 text-[0.5rem] font-medium transition-colors hover:bg-white/5"
                  style={{ color: `rgba(${rgb},0.5)` }}
                >
                  <RefreshCw className="h-2.5 w-2.5" />
                  Replay
                </button>
              )}
              <span className="h-2 w-2 rounded-full" style={{ background: `rgba(${rgb},0.6)` }} />
              <span className="h-2 w-2 rounded-full bg-white/10" />
              <span className="h-2 w-2 rounded-full bg-white/10" />
            </div>
          </div>

          {/* ── Screen ── */}
          <div
            className="relative overflow-hidden rounded-xl"
            style={{ border: "1px solid rgba(255,255,255,0.04)", background: "#0a0a0a" }}
          >
            {/* Scanlines */}
            <div
              className="pointer-events-none absolute inset-0 z-30 opacity-[0.025]"
              style={{
                background:
                  "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)",
              }}
            />

            {/* Content grid */}
            <div className="relative z-10 grid h-[26rem] sm:h-[28rem] lg:grid-cols-[1fr_1.4fr]">
              {/* ─── CRM Panel ─── */}
              <div className="hidden border-r border-white/[0.04] lg:flex lg:flex-col">
                <div className="flex items-center gap-2 border-b border-white/[0.04] px-4 py-3">
                  <User className="h-3.5 w-3.5" style={{ color: `rgba(${rgb},0.4)` }} />
                  <span className="font-mono text-[0.58rem] font-medium uppercase tracking-[0.2em] text-gray-600">
                    CRM — Leads
                  </span>
                  <span
                    className="ml-auto rounded-md px-1.5 py-0.5 font-mono text-[0.5rem]"
                    style={{
                      background: `rgba(${rgb},0.08)`,
                      color: `rgba(${rgb},0.5)`,
                    }}
                  >
                    {LEADS.length}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto p-1.5">
                  {LEADS.map((lead, i) => {
                    const isCarlos = i === 3;
                    const status = isCarlos ? carlosStatus : lead.status;
                    const cfg = STATUS_MAP[status];
                    const isActive = isCarlos;

                    return (
                      <motion.div
                        key={lead.name}
                        className="mb-0.5 flex items-center gap-2.5 rounded-lg px-3 py-2"
                        animate={{
                          background: isActive
                            ? `rgba(${rgb},0.04)`
                            : "transparent",
                          boxShadow: isActive
                            ? `inset 0 0 0 1px rgba(${rgb},0.1)`
                            : "inset 0 0 0 1px transparent",
                        }}
                        transition={{ duration: 0.5 }}
                      >
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/[0.04]">
                          <span className="text-[0.58rem] font-semibold text-gray-500">
                            {lead.initials}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="truncate text-[0.7rem] font-medium text-gray-300">
                              {lead.name}
                            </span>
                            <span className="font-mono text-[0.48rem] text-gray-600">
                              {lead.time}
                            </span>
                          </div>
                          <div className="mt-0.5 flex items-center gap-1.5">
                            <span className="text-[0.62rem] font-semibold text-gray-400">
                              {lead.value}
                            </span>
                            <span className="text-[0.5rem] text-gray-600">•</span>
                            <span className="text-[0.55rem] text-gray-600">
                              {lead.method}
                            </span>
                          </div>
                        </div>
                        <motion.div
                          className="flex shrink-0 items-center gap-1"
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.3 }}
                        >
                          <motion.span
                            className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`}
                            animate={
                              isCarlos && status === "recovered"
                                ? { scale: [1, 1.4, 1] }
                                : { scale: 1 }
                            }
                            transition={{ duration: 0.4 }}
                          />
                          <span
                            className={`text-[0.48rem] font-medium ${cfg.text}`}
                          >
                            {cfg.label}
                          </span>
                        </motion.div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* CRM Stats */}
                <div className="grid grid-cols-3 border-t border-white/[0.04]">
                  <CrmStat label="Novos" value="12" />
                  <CrmStat label="Ativos" value="34" />
                  <CrmStat
                    label="Recuperados"
                    value={recoveredCount.toString()}
                    highlight={phase === "confirmed"}
                  />
                </div>
              </div>

              {/* ─── Chat Panel ─── */}
              <div className="flex flex-col">
                {/* Chat header */}
                <div className="flex items-center gap-3 border-b border-white/[0.04] px-5 py-3">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full"
                    style={{ background: `rgba(${rgb},0.08)` }}
                  >
                    <span
                      className="text-[0.6rem] font-bold"
                      style={{ color: `rgba(${rgb},0.7)` }}
                    >
                      CR
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[0.75rem] font-semibold text-gray-200">
                        Carlos R.
                      </span>
                      <AnimatePresence mode="wait">
                        <motion.span
                          key={carlosStatus}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="rounded-md px-1.5 py-0.5 text-[0.45rem] font-semibold uppercase"
                          style={{
                            background:
                              carlosStatus === "recovered"
                                ? `rgba(${rgb},0.12)`
                                : carlosStatus === "waiting"
                                ? "rgba(251,191,36,0.08)"
                                : carlosStatus === "contacted"
                                ? "rgba(96,165,250,0.08)"
                                : "rgba(251,191,36,0.08)",
                            color:
                              carlosStatus === "recovered"
                                ? b.accent
                                : carlosStatus === "waiting"
                                ? "#fbbf24"
                                : carlosStatus === "contacted"
                                ? "#60a5fa"
                                : "#fbbf24",
                          }}
                        >
                          {STATUS_MAP[carlosStatus].label}
                        </motion.span>
                      </AnimatePresence>
                    </div>
                    <span className="text-[0.55rem] text-gray-600">
                      R$ 1.297,00 • PIX • Falha no cartão
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-gray-600" />
                    <MessageSquare
                      className="h-3.5 w-3.5"
                      style={{ color: `rgba(${rgb},0.4)` }}
                    />
                  </div>
                </div>

                {/* Messages */}
                <div
                  ref={chatRef}
                  className="flex-1 space-y-3 overflow-y-auto p-4"
                >
                  <AnimatePresence>
                    {CONVERSATION.slice(0, visibleMessages).map((msg, i) => (
                      <motion.div
                        key={i}
                        variants={msgVariants}
                        initial="hidden"
                        animate="visible"
                        layout
                      >
                        <ChatBubble message={msg} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {typing && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <TypingIndicator />
                    </motion.div>
                  )}
                </div>

                {/* Input bar */}
                <div className="border-t border-white/[0.04] bg-black/30 p-3 backdrop-blur-md">
                  <div className="flex items-center gap-2 rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2">
                    <Bot
                      className="h-3.5 w-3.5"
                      style={{ color: `rgba(${rgb},0.3)` }}
                    />
                    <span
                      className="flex-1 text-[0.7rem] font-light"
                      style={{ color: `rgba(${rgb},0.2)` }}
                    >
                      IA respondendo automaticamente...
                    </span>
                    <div className="flex h-6 w-6 items-center justify-center rounded-md border border-white/[0.06] bg-white/[0.03]">
                      <Send
                        className="h-3 w-3"
                        style={{ color: `rgba(${rgb},0.3)` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Bottom metrics bar ── */}
            <div
              className="relative z-10 grid grid-cols-3 border-t border-white/[0.04]"
              style={{ background: `rgba(${cardBg},0.8)` }}
            >
              {/* Timer */}
              <div className="flex items-center justify-center gap-2 px-4 py-2.5">
                <Clock className="h-3 w-3 text-gray-600" />
                <span className="font-mono text-[0.7rem] tabular-nums text-gray-400">
                  {formatElapsed(elapsed)}
                </span>
              </div>

              {/* Status badge */}
              <div className="flex items-center justify-center border-x border-white/[0.04] px-4 py-2.5">
                <AnimatePresence mode="wait">
                  {statusBadge && (
                    <motion.div
                      key={phase}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.3 }}
                      className="flex items-center gap-1.5"
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ background: statusBadge.color }}
                      />
                      <span
                        className="text-[0.6rem] font-semibold"
                        style={{ color: statusBadge.color }}
                      >
                        {statusBadge.label}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Recovered amount */}
              <div className="flex items-center justify-center gap-1.5 px-4 py-2.5">
                <AnimatePresence>
                  {(phase === "confirmed" || phase === "complete") && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center gap-1.5"
                    >
                      <CheckCircle2
                        className="h-3 w-3"
                        style={{ color: b.accent }}
                      />
                      <span
                        className="text-[0.68rem] font-bold"
                        style={{ color: b.accent }}
                      >
                        +R$ 1.297,00
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
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

  if (message.type === "payment_link") {
    return (
      <div className="flex items-start gap-2 max-w-[88%]">
        <div
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
          style={{ background: `rgba(${rgb},0.08)` }}
        >
          <Bot className="h-2.5 w-2.5" style={{ color: `rgba(${rgb},0.7)` }} />
        </div>
        <div
          className="overflow-hidden rounded-2xl rounded-tl-sm"
          style={{
            border: `1px solid rgba(${rgb},0.12)`,
            background: `rgba(${rgb},0.04)`,
          }}
        >
          <div className="flex items-center gap-3 px-4 py-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg"
              style={{ background: b.accent }}
            >
              <QrCode className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-[0.72rem] font-semibold text-white/80">
                Pagamento via PIX
              </p>
              <p className="text-[0.58rem] text-white/40">
                Aprovação instantânea
              </p>
            </div>
          </div>
          <div
            className="border-t px-4 py-2.5"
            style={{ borderColor: `rgba(${rgb},0.08)` }}
          >
            <p
              className="text-[1.15rem] font-bold tracking-tight"
              style={{ color: b.accent }}
            >
              {message.text}
            </p>
            <p className="mt-0.5 font-mono text-[0.48rem] text-white/25">
              pay.{b.slug}.com/c/xK9m2
            </p>
          </div>
          <div
            className="px-4 py-2.5 text-center"
            style={{ background: b.accent }}
          >
            <p className="text-[0.72rem] font-semibold text-white">
              Pagar agora →
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (message.type === "confirmation") {
    return (
      <div className="flex items-start gap-2 max-w-[88%]">
        <div
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
          style={{ background: `rgba(${rgb},0.08)` }}
        >
          <Bot className="h-2.5 w-2.5" style={{ color: `rgba(${rgb},0.7)` }} />
        </div>
        <div
          className="flex items-center gap-3 rounded-2xl rounded-tl-sm px-4 py-3"
          style={{
            border: `1px solid rgba(${rgb},0.15)`,
            background: `rgba(${rgb},0.08)`,
            boxShadow: `0 0 20px rgba(${rgb},0.08)`,
          }}
        >
          <motion.div
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <CheckCircle2
              className="h-5 w-5 shrink-0"
              style={{ color: b.accent }}
            />
          </motion.div>
          <div>
            <p
              className="text-[0.75rem] font-bold"
              style={{ color: b.accent }}
            >
              Pagamento Confirmado!
            </p>
            <p className="text-[0.6rem] text-white/50">
              {message.text}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Regular text bubble
  return (
    <div
      className={`flex items-start gap-2 ${isAi ? "" : "flex-row-reverse"} max-w-[88%] ${isAi ? "" : "ml-auto"}`}
    >
      <div
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
        style={{
          background: isAi ? `rgba(${rgb},0.08)` : "rgba(255,255,255,0.04)",
        }}
      >
        {isAi ? (
          <Bot className="h-2.5 w-2.5" style={{ color: `rgba(${rgb},0.7)` }} />
        ) : (
          <User className="h-2.5 w-2.5 text-gray-500" />
        )}
      </div>
      <div
        className={`rounded-2xl px-3.5 py-2.5 ${
          isAi ? "rounded-tl-sm" : "rounded-tr-sm"
        }`}
        style={{
          border: isAi
            ? `1px solid rgba(${rgb},0.06)`
            : "1px solid rgba(255,255,255,0.04)",
          background: isAi
            ? `rgba(${rgb},0.04)`
            : "rgba(255,255,255,0.03)",
        }}
      >
        <p
          className={`text-[0.72rem] leading-relaxed ${
            isAi ? "" : "text-gray-400"
          }`}
          style={isAi ? { color: `rgba(${rgb},0.65)` } : undefined}
        >
          {message.text}
        </p>
        <p
          className="mt-0.5 text-[0.45rem]"
          style={{
            color: isAi ? `rgba(${rgb},0.2)` : "rgba(255,255,255,0.15)",
          }}
        >
          {message.time}
          {isAi && ` • ${b.name} AI`}
        </p>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-start gap-2 max-w-[88%]">
      <div
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
        style={{ background: `rgba(${rgb},0.08)` }}
      >
        <Bot className="h-2.5 w-2.5" style={{ color: `rgba(${rgb},0.7)` }} />
      </div>
      <div
        className="rounded-2xl rounded-tl-sm px-4 py-2.5"
        style={{
          border: `1px solid rgba(${rgb},0.06)`,
          background: `rgba(${rgb},0.04)`,
        }}
      >
        <div className="flex items-center gap-1">
          <span
            className="h-1 w-1 animate-bounce rounded-full"
            style={{ background: `rgba(${rgb},0.4)`, animationDelay: "0ms" }}
          />
          <span
            className="h-1 w-1 animate-bounce rounded-full"
            style={{ background: `rgba(${rgb},0.4)`, animationDelay: "150ms" }}
          />
          <span
            className="h-1 w-1 animate-bounce rounded-full"
            style={{ background: `rgba(${rgb},0.4)`, animationDelay: "300ms" }}
          />
        </div>
      </div>
    </div>
  );
}

function CrmStat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="px-3 py-2.5 text-center">
      <motion.p
        className="text-[0.88rem] font-semibold"
        animate={
          highlight
            ? { color: b.accent, scale: [1, 1.15, 1] }
            : { color: "rgb(156,163,175)", scale: 1 }
        }
        transition={{ duration: 0.4 }}
      >
        {value}
      </motion.p>
      <p className="font-mono text-[0.45rem] uppercase tracking-[0.18em] text-gray-600">
        {label}
      </p>
    </div>
  );
}
