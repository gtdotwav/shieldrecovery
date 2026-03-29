"use client";

import { useRef, useState } from "react";
import { Heart, Briefcase, Zap, Smile, ArrowRight } from "lucide-react";

/* ── Voice Tone Selector ── */

const TONES = [
  { value: "empathetic", label: "Empático", icon: Heart, desc: "Acolhedor e compreensivo" },
  { value: "professional", label: "Profissional", icon: Briefcase, desc: "Objetivo e confiante" },
  { value: "urgent", label: "Urgente", icon: Zap, desc: "Enfatiza prazos" },
  { value: "friendly", label: "Amigável", icon: Smile, desc: "Leve e descontraído" },
  { value: "direct", label: "Direto", icon: ArrowRight, desc: "Vai ao ponto" },
] as const;

export function VoiceToneSelector({
  defaultValue = "empathetic",
  name = "voiceTone",
}: {
  defaultValue?: string;
  name?: string;
}) {
  const [selected, setSelected] = useState(defaultValue);

  return (
    <div>
      <input type="hidden" name={name} value={selected} />
      <div className="grid grid-cols-5 gap-2">
        {TONES.map((tone) => {
          const Icon = tone.icon;
          const isActive = selected === tone.value;
          return (
            <button
              key={tone.value}
              type="button"
              onClick={() => setSelected(tone.value)}
              className={[
                "flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-center transition-all",
                isActive
                  ? "border-[var(--accent)] bg-[var(--accent)]/10 ring-1 ring-[var(--accent)]"
                  : "border-[var(--border)] bg-[var(--surface-strong)] hover:border-[var(--accent)]/40",
              ].join(" ")}
            >
              <Icon
                className={[
                  "h-5 w-5 transition-colors",
                  isActive ? "text-[var(--accent)]" : "text-[var(--muted)]",
                ].join(" ")}
              />
              <span
                className={[
                  "text-[0.7rem] font-semibold",
                  isActive ? "text-[var(--accent)]" : "text-[var(--foreground)]",
                ].join(" ")}
              >
                {tone.label}
              </span>
              <span className="text-[0.58rem] leading-tight text-[var(--muted)]">
                {tone.desc}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Voice Gender Selector ── */

const GENDERS = [
  { value: "female", label: "Feminino", provider: "Voz natural humanizada" },
  { value: "male", label: "Masculino", provider: "Voz natural humanizada" },
] as const;

export function VoiceGenderSelector({
  defaultValue = "female",
  name = "voiceGender",
}: {
  defaultValue?: string;
  name?: string;
}) {
  const [selected, setSelected] = useState(defaultValue);

  return (
    <div>
      <input type="hidden" name={name} value={selected} />
      <div className="grid grid-cols-2 gap-3">
        {GENDERS.map((gender) => {
          const isActive = selected === gender.value;
          return (
            <button
              key={gender.value}
              type="button"
              onClick={() => setSelected(gender.value)}
              className={[
                "flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all",
                isActive
                  ? "border-[var(--accent)] bg-[var(--accent)]/10 ring-1 ring-[var(--accent)]"
                  : "border-[var(--border)] bg-[var(--surface-strong)] hover:border-[var(--accent)]/40",
              ].join(" ")}
            >
              <span
                className={[
                  "flex h-9 w-9 items-center justify-center rounded-full text-lg",
                  isActive
                    ? "bg-[var(--accent)]/20 text-[var(--accent)]"
                    : "bg-[var(--surface)] text-[var(--muted)]",
                ].join(" ")}
              >
                {gender.value === "female" ? "♀" : "♂"}
              </span>
              <div>
                <p
                  className={[
                    "text-sm font-semibold",
                    isActive ? "text-[var(--accent)]" : "text-[var(--foreground)]",
                  ].join(" ")}
                >
                  {gender.label}
                </p>
                <p className="text-[0.65rem] text-[var(--muted)]">
                  {gender.provider}
                </p>
              </div>
              {isActive ? (
                <span className="ml-auto text-[var(--accent)]">✓</span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Quick Dispatch Form (lead selector + manual input) ── */

export function QuickDispatchInputs({
  contacts,
}: {
  contacts: {
    lead_id: string;
    customer_name: string;
    phone: string;
    payment_value: number;
  }[];
}) {
  const phoneRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"lead" | "manual">(
    contacts.length > 0 ? "lead" : "manual",
  );

  const inputCls =
    "w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]";

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode("lead")}
          className={[
            "rounded-full px-3 py-1 text-xs font-semibold transition-all",
            mode === "lead"
              ? "bg-[var(--accent)] text-white"
              : "bg-[var(--surface-strong)] text-[var(--muted)] hover:text-[var(--foreground)]",
          ].join(" ")}
        >
          Do CRM
        </button>
        <button
          type="button"
          onClick={() => setMode("manual")}
          className={[
            "rounded-full px-3 py-1 text-xs font-semibold transition-all",
            mode === "manual"
              ? "bg-[var(--accent)] text-white"
              : "bg-[var(--surface-strong)] text-[var(--muted)] hover:text-[var(--foreground)]",
          ].join(" ")}
        >
          Manual
        </button>
      </div>

      {mode === "lead" && contacts.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--muted)] mb-1.5">
              Lead
            </label>
            <select
              name="leadId"
              className={inputCls}
              onChange={(e) => {
                const opt = e.target.selectedOptions[0];
                if (phoneRef.current) phoneRef.current.value = opt?.dataset.phone ?? "";
                if (nameRef.current) nameRef.current.value = opt?.dataset.name ?? "";
              }}
            >
              <option value="">Selecionar lead...</option>
              {contacts.map((c) => (
                <option
                  key={c.lead_id}
                  value={c.lead_id}
                  data-phone={c.phone}
                  data-name={c.customer_name}
                >
                  {c.customer_name} — {c.phone}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--muted)] mb-1.5">
              Telefone
            </label>
            <input
              ref={phoneRef}
              name="toNumber"
              type="tel"
              required
              placeholder="+5521999998888"
              className={inputCls}
            />
          </div>
          <input ref={nameRef} type="hidden" name="customerName" value="" />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--muted)] mb-1.5">
              Nome do lead
            </label>
            <input
              name="customerName"
              type="text"
              placeholder="João Silva"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--muted)] mb-1.5">
              Telefone *
            </label>
            <input
              name="toNumber"
              type="tel"
              required
              placeholder="+5521999998888"
              className={inputCls}
            />
          </div>
        </div>
      )}
    </div>
  );
}
