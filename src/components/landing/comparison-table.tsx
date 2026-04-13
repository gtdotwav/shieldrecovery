"use client";

import { Check, X } from "lucide-react";
import { platformBrand } from "@/lib/platform";

const b = platformBrand;
const rgb = b.accentRgb;

const rows = [
  {
    aspect: "Tempo de resposta",
    without: "Horas ou nunca",
    with: "< 2 minutos",
  },
  {
    aspect: "Disponibilidade",
    without: "Horário comercial",
    with: "24/7/365",
  },
  {
    aspect: "Custo de equipe",
    without: "R$3-5k/mês por atendente",
    with: "R$0 fixo",
  },
  {
    aspect: "Taxa de recuperação",
    without: "2-5%",
    with: "25-40%",
  },
  {
    aspect: "Escala",
    without: "Limitada por headcount",
    with: "Ilimitada",
  },
  {
    aspect: "Personalização",
    without: "Genérica",
    with: "IA adapta por cliente",
  },
];

export function ComparisonTable() {
  return (
    <section className="relative z-10 mx-auto max-w-[82rem] px-4 py-16 sm:px-8 sm:py-24 lg:px-10">
      <div className="text-center">
        <p
          className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.2em] opacity-70 sm:tracking-[0.3em]"
          style={{ color: b.accent }}
        >
          Comparativo
        </p>
        <h2 className="mt-3 text-balance text-2xl font-bold tracking-[-0.03em] text-gray-900 dark:text-white sm:mt-4 sm:text-[1.75rem] lg:text-[2.2rem]">
          Sem automação vs Com {b.name}
        </h2>
      </div>

      <div className="mx-auto mt-10 max-w-[50rem] overflow-x-auto sm:mt-14">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr>
              <th className="border-b border-white/[0.06] px-4 py-3 text-xs font-medium uppercase tracking-widest text-gray-500">
                Aspecto
              </th>
              <th className="border-b border-white/[0.06] px-4 py-3 text-xs font-medium uppercase tracking-widest text-gray-500">
                <div className="flex items-center gap-1.5">
                  <X className="h-3.5 w-3.5 text-red-400/60" />
                  Sem automação
                </div>
              </th>
              <th
                className="border-b px-4 py-3 text-xs font-medium uppercase tracking-widest"
                style={{
                  borderColor: `rgba(${rgb},0.15)`,
                  color: b.accent,
                }}
              >
                <div className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5" />
                  Com {b.name}
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row.aspect}
                className="transition-colors hover:bg-white/[0.01]"
              >
                <td className="border-b border-white/[0.04] px-4 py-3.5 font-medium text-gray-300">
                  {row.aspect}
                </td>
                <td className="border-b border-white/[0.04] px-4 py-3.5 text-gray-500">
                  <div className="flex items-center gap-2">
                    <X className="h-3.5 w-3.5 shrink-0 text-red-400/50" />
                    {row.without}
                  </div>
                </td>
                <td
                  className="border-b px-4 py-3.5"
                  style={{
                    borderColor: `rgba(${rgb},0.06)`,
                    background:
                      i % 2 === 0
                        ? `rgba(${rgb},0.02)`
                        : `rgba(${rgb},0.04)`,
                  }}
                >
                  <div className="flex items-center gap-2 font-medium" style={{ color: b.accent }}>
                    <Check className="h-3.5 w-3.5 shrink-0" />
                    {row.with}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
