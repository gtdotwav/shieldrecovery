"use client";

import { Star } from "lucide-react";
import { platformBrand } from "@/lib/platform";

const b = platformBrand;
const rgb = b.accentRgb;

const testimonials = [
  {
    quote:
      "Recuperamos mais de R$45.000 no primeiro mês. O ROI foi absurdo.",
    name: "Ana L.",
    role: "E-commerce de Moda",
  },
  {
    quote:
      "A IA responde mais rápido que minha equipe inteira. E 24/7.",
    name: "Carlos M.",
    role: "SaaS B2B",
  },
  {
    quote:
      "Zero setup, zero dor de cabeça. Conectei o webhook e começou a funcionar.",
    name: "Mariana S.",
    role: "Cursos Online",
  },
];

function Stars() {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className="h-3.5 w-3.5 fill-amber-400 text-amber-400"
        />
      ))}
    </div>
  );
}

export function SocialProof() {
  return (
    <section className="relative z-10 mx-auto max-w-[82rem] px-4 py-16 sm:px-8 sm:py-24 lg:px-10">
      <p className="text-center text-sm text-gray-500 sm:text-base">
        Mais de{" "}
        <span className="font-semibold text-gray-300">200 empresas</span>{" "}
        já recuperam pagamentos com{" "}
        <span className="font-semibold" style={{ color: b.accent }}>
          {b.name}
        </span>
      </p>

      <div className="mx-auto mt-10 grid max-w-[60rem] grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
        {testimonials.map((t) => (
          <div
            key={t.name}
            className="rounded-xl border p-5 sm:p-6"
            style={{
              borderColor: "rgba(255,255,255,0.04)",
              background: `rgba(${b.slug === "pagrecovery" ? "6,20,15" : "13,13,13"},0.5)`,
            }}
          >
            <Stars />
            <p className="mt-4 text-sm leading-relaxed text-gray-300">
              &ldquo;{t.quote}&rdquo;
            </p>
            <div className="mt-4 border-t border-white/[0.04] pt-4">
              <p className="text-sm font-semibold text-gray-200">{t.name}</p>
              <p className="text-xs text-gray-500">{t.role}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
