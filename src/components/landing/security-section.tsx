"use client";

import { Shield, Scale, Server } from "lucide-react";
import { platformBrand } from "@/lib/platform";

const b = platformBrand;
const rgb = b.accentRgb;

const columns = [
  {
    icon: Shield,
    title: "Dados protegidos",
    description:
      "Criptografia AES-256 em repouso e TLS 1.3 em trânsito. Tokens de sessão com HMAC-SHA256 e rotação automática.",
  },
  {
    icon: Scale,
    title: "Compliance",
    description:
      "LGPD compliant com opt-out automático. Frequency capping para respeitar limites de contato. PCI-DSS compatível.",
  },
  {
    icon: Server,
    title: "Infraestrutura",
    description:
      "Deploy na Vercel (edge network global), Supabase (PostgreSQL gerenciado), 99.9% uptime garantido.",
  },
];

export function SecuritySection() {
  return (
    <section className="relative z-10 mx-auto max-w-[82rem] px-4 py-16 sm:px-8 sm:py-24 lg:px-10">
      <div className="text-center">
        <p
          className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.2em] opacity-70 sm:tracking-[0.3em]"
          style={{ color: b.accent }}
        >
          Segurança
        </p>
        <h2 className="mt-3 text-balance text-2xl font-bold tracking-[-0.03em] text-gray-900 dark:text-white sm:mt-4 sm:text-[1.75rem] lg:text-[2.2rem]">
          Segurança em primeiro lugar
        </h2>
      </div>

      <div className="mx-auto mt-10 grid max-w-[60rem] grid-cols-1 gap-6 sm:grid-cols-3 sm:mt-14">
        {columns.map((col) => {
          const Icon = col.icon;
          return (
            <div
              key={col.title}
              className="rounded-xl border p-6"
              style={{
                borderColor: "rgba(255,255,255,0.04)",
                background: `rgba(${b.slug === "pagrecovery" ? "6,20,15" : "13,13,13"},0.4)`,
              }}
            >
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg"
                style={{ background: `rgba(${rgb},0.08)` }}
              >
                <Icon className="h-5 w-5" style={{ color: b.accent }} />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-gray-200">
                {col.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">
                {col.description}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
