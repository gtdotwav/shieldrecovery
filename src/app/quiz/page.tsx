"use client";

import { useActionState, useCallback, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

import { submitQuizEmail } from "@/app/actions/quiz-actions";
import { platformBrand } from "@/lib/platform";

const b = platformBrand;
const rgb = b.accentRgb;

/* ── Quiz steps ── */

type Step = {
  question: string;
  options: string[];
};

const STEPS: Step[] = [
  {
    question: "Qual o volume mensal de pagamentos da sua operação?",
    options: [
      "Até R$50 mil",
      "R$50 mil – R$200 mil",
      "R$200 mil – R$1 milhão",
      "Acima de R$1 milhão",
    ],
  },
  {
    question: "Qual gateway de pagamento você utiliza?",
    options: ["Stripe", "PagSeguro / PagBank", "Mercado Pago", "Asaas", "Outro"],
  },
  {
    question: "Qual o maior desafio na sua operação hoje?",
    options: [
      "Pagamentos falhados sem follow-up",
      "Falta de visibilidade sobre perdas",
      "Atendimento manual consome muito tempo",
      "Não sei quanto estou perdendo",
    ],
  },
  {
    question: "Qual % dos pagamentos você estima que falham?",
    options: [
      "Menos de 5%",
      "Entre 5% e 15%",
      "Entre 15% e 30%",
      "Não sei / nunca medi",
    ],
  },
];

const TOTAL = STEPS.length + 1; // +1 for the email step

/* ── Component ── */

export default function QuizPage() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [emailState, emailAction, emailPending] = useActionState(
    submitQuizEmail,
    null,
  );

  const handleSelect = useCallback(
    (option: string, idx: number) => {
      setSelectedIdx(idx);
      // Brief delay for visual feedback then advance
      setTimeout(() => {
        setAnswers((prev) => [...prev, option]);
        setStep((prev) => prev + 1);
        setSelectedIdx(null);
      }, 280);
    },
    [],
  );

  const isQuizStep = step < STEPS.length;
  const isEmailStep = step === STEPS.length;
  const isDone = emailState?.success === true;
  const progress = isDone ? 1 : step / TOTAL;

  return (
    <div
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-12"
      style={{ background: b.bgDark }}
    >
      {/* Background effects */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background: `
            radial-gradient(ellipse 70% 50% at 50% 20%, rgba(${rgb},0.10), transparent 60%),
            radial-gradient(ellipse 50% 40% at 80% 80%, rgba(${rgb},0.04), transparent 50%)
          `,
        }}
      />

      <div className="relative z-10 flex w-full max-w-lg flex-col items-center">
        {/* Back to landing */}
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-1.5 self-start text-xs text-gray-500 transition-colors hover:text-gray-300"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar
        </Link>

        {/* Logo */}
        <Image
          src={b.logo}
          alt={b.name}
          width={332}
          height={332}
          className="h-24 w-auto object-contain sm:h-32"
          style={{ filter: `drop-shadow(0 12px 32px rgba(${rgb},0.15))` }}
          priority
        />

        {/* Progress bar */}
        <div className="mt-10 h-1 w-full max-w-xs overflow-hidden rounded-full bg-gray-800">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${Math.max(progress * 100, 4)}%`,
              background: `linear-gradient(90deg, ${b.accent}, ${b.accentStrong})`,
            }}
          />
        </div>
        <p className="mt-2 font-mono text-[0.58rem] uppercase tracking-[0.2em] text-gray-600">
          {isDone ? "Completo" : `${step + 1} de ${TOTAL}`}
        </p>

        {/* ── Content card ── */}
        <div className="mt-8 w-full">
          {/* Quiz steps */}
          {isQuizStep && (
            <div key={step} className="animate-fade-in">
              <h2 className="text-center text-xl font-semibold tracking-[-0.02em] text-white sm:text-2xl">
                {STEPS[step].question}
              </h2>

              <div className="mt-8 space-y-3">
                {STEPS[step].options.map((option, idx) => {
                  const isSelected = selectedIdx === idx;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => handleSelect(option, idx)}
                      className="group w-full rounded-xl border px-5 py-4 text-left text-sm font-medium transition-all duration-200"
                      style={{
                        borderColor: isSelected
                          ? b.accent
                          : "rgba(255,255,255,0.06)",
                        background: isSelected
                          ? `rgba(${rgb},0.08)`
                          : "rgba(255,255,255,0.02)",
                        color: isSelected ? "#ffffff" : "#d1d5db",
                      }}
                    >
                      <span className="flex items-center gap-3">
                        <span
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-semibold transition-all duration-200"
                          style={{
                            background: isSelected
                              ? b.accent
                              : "rgba(255,255,255,0.06)",
                            color: isSelected ? "#ffffff" : "#9ca3af",
                          }}
                        >
                          {String.fromCharCode(65 + idx)}
                        </span>
                        {option}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Email step */}
          {isEmailStep && !isDone && (
            <div className="animate-fade-in">
              <h2 className="text-center text-xl font-semibold tracking-[-0.02em] text-white sm:text-2xl">
                Quase lá!
              </h2>
              <p className="mt-3 text-center text-sm leading-6 text-gray-400">
                Deixe seu email para ser um dos primeiros a testar a plataforma.
              </p>

              <form action={emailAction} className="mt-8 space-y-4">
                <input type="hidden" name="answers" value={JSON.stringify(answers)} />

                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="seu@email.com"
                  required
                  className="w-full rounded-xl border border-gray-700 bg-[#111111] px-5 py-4 text-sm text-white placeholder:text-gray-600 focus:border-[color:var(--accent)] focus:outline-none focus:ring-1 focus:ring-[color:var(--accent)]/20"
                />

                {emailState?.error && (
                  <p className="text-center text-xs text-red-400">
                    {emailState.error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={emailPending}
                  className="w-full rounded-xl px-5 py-4 text-sm font-semibold text-white transition-all disabled:opacity-60"
                  style={{
                    background: b.accent,
                    boxShadow: `0 8px 24px rgba(${rgb},0.3)`,
                  }}
                >
                  {emailPending ? "Enviando..." : "Quero acesso antecipado"}
                </button>
              </form>
            </div>
          )}

          {/* Done state */}
          {isDone && (
            <div className="animate-fade-in flex flex-col items-center text-center">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-2xl"
                style={{ background: `rgba(${rgb},0.12)` }}
              >
                <CheckCircle2 className="h-8 w-8" style={{ color: b.accent }} />
              </div>

              <h2 className="mt-6 text-xl font-semibold tracking-[-0.02em] text-white sm:text-2xl">
                Inscrição confirmada!
              </h2>
              <p className="mt-3 max-w-sm text-sm leading-6 text-gray-400">
                Você será um dos primeiros a testar a plataforma.
                Entraremos em contato em breve.
              </p>

              <Link
                href="/"
                className="mt-8 inline-flex items-center gap-2 rounded-xl border border-gray-800 bg-white/[0.03] px-6 py-3 text-sm font-medium text-gray-300 transition-all hover:bg-white/[0.06] hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar ao site
              </Link>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.35s ease-out both;
        }
      `}</style>
    </div>
  );
}
