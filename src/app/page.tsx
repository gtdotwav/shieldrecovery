import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Inbox,
  Link2,
  RefreshCcw,
  UsersRound,
} from "lucide-react";

import { ShieldRecoveryLogo } from "@/components/platform/shield-recovery-logo";
import {
  PlatformPill,
  PlatformSurface,
} from "@/components/platform/platform-shell";
import { formatCurrency } from "@/lib/format";
import { getPaymentRecoveryService } from "@/server/recovery/services/payment-recovery-service";

export const dynamic = "force-dynamic";

type RouteCard = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

const modules: RouteCard[] = [
  {
    href: "/dashboard",
    title: "Recuperação",
    description: "Fila do que exige ação agora.",
    icon: BarChart3,
  },
  {
    href: "/calendar",
    title: "Calendário",
    description: "Movimento diário, board e automações.",
    icon: CalendarDays,
  },
  {
    href: "/leads",
    title: "CRM",
    description: "Carteira organizada por prioridade e etapa.",
    icon: UsersRound,
  },
  {
    href: "/inbox",
    title: "Conversas",
    description: "Thread viva para continuar o recovery.",
    icon: Inbox,
  },
  {
    href: "/connect",
    title: "Integrações",
    description: "Gateway, WhatsApp, IA e banco conectados.",
    icon: Link2,
  },
];

const ecosystem = [
  "Webhook transforma falha em caso",
  "IA decide a primeira abordagem",
  "WhatsApp ou email executa o contato",
  "CRM move o caso com contexto",
];

export default async function Home() {
  const service = getPaymentRecoveryService();
  const [analytics, contacts] = await Promise.all([
    service.getRecoveryAnalytics(),
    service.getFollowUpContacts(),
  ]);

  const activeContacts = contacts.filter(
    (contact) => contact.lead_status !== "RECOVERED" && contact.lead_status !== "LOST",
  );
  const portfolioValue = activeContacts.reduce(
    (sum, contact) => sum + contact.payment_value,
    0,
  );
  const awaitingReply = activeContacts.filter(
    (contact) => contact.lead_status === "WAITING_CUSTOMER",
  ).length;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(2,132,199,0.12),transparent_24rem),radial-gradient(circle_at_top_right,rgba(15,23,42,0.06),transparent_28rem),linear-gradient(180deg,#fbfbfc_0%,#f3f5f8_50%,#eef1f5_100%)]">
      <main className="mx-auto max-w-[88rem] px-4 pb-24 pt-6 sm:px-6 sm:pt-8 lg:px-8">
        <section className="relative overflow-hidden rounded-[2rem] border border-black/[0.06] bg-[linear-gradient(135deg,#11131a_0%,#171a24_45%,#1a1f2d_100%)] px-5 py-6 shadow-[0_35px_80px_rgba(15,23,42,0.16)] sm:px-8 sm:py-8 lg:px-10 lg:py-10">
          <div className="absolute inset-y-0 right-0 w-[32rem] bg-[radial-gradient(circle_at_top_right,rgba(2,132,199,0.22),transparent_42%)]" />
          <div className="absolute -left-12 top-24 h-40 w-40 rounded-full bg-[rgba(2,132,199,0.08)] blur-3xl" />

          <div className="relative">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <ShieldRecoveryLogo size="lg" emphasis="strong" className="w-fit bg-white/0 p-0 shadow-none ring-0" />

              <div className="flex flex-wrap gap-2">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-medium text-white/82 transition-colors hover:bg-white/10 hover:text-white"
                >
                  Entrar
                </Link>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-600"
                >
                  Abrir plataforma
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="mt-10 grid gap-8 xl:grid-cols-[minmax(0,1.15fr)_26rem] xl:items-start">
              <div className="max-w-4xl">
                <div className="flex flex-wrap gap-2">
                  <PlatformPill className="border-white/10 bg-white/7 text-white/72">
                    operação assistida por IA
                  </PlatformPill>
                </div>

                <h1 className="mt-6 max-w-[11ch] text-balance text-5xl font-semibold tracking-tight text-white sm:text-6xl lg:text-[4.8rem] lg:leading-[0.98]">
                  A falha entra. A operação responde.
                </h1>

                <p className="mt-5 max-w-2xl text-lg leading-8 text-white/72">
                  PagRecovery organiza a carteira, inicia o follow-up e mantém CRM,
                  conversas, automações e receita no mesmo ecossistema. A home explica
                  a tese. A plataforma cuida do trabalho.
                </p>

                <div className="mt-8 grid gap-3 sm:grid-cols-3">
                  <HeroStat
                    icon={RefreshCcw}
                    label="eventos recebidos"
                    value={analytics.total_failed_payments.toString()}
                  />
                  <HeroStat
                    icon={BarChart3}
                    label="recuperações ativas"
                    value={analytics.active_recoveries.toString()}
                  />
                  <HeroStat
                    icon={UsersRound}
                    label="carteira atual"
                    value={formatCurrency(portfolioValue)}
                  />
                </div>
              </div>

              <PlatformSurface className="border-white/8 bg-white/7 p-5 shadow-none backdrop-blur-xl">
                <div className="flex items-center justify-between border-b border-white/8 pb-4">
                  <div>
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-sky-300">
                      Fluxo do produto
                    </p>
                    <p className="mt-2 text-lg font-semibold text-white">
                      Como a operação se move
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {ecosystem.map((item, index) => (
                    <div
                      key={item}
                      className="rounded-[1rem] border border-white/8 bg-black/10 px-3.5 py-3"
                    >
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/8 text-[0.68rem] font-semibold text-sky-300">
                          {index + 1}
                        </span>
                        <p className="text-sm leading-6 text-white/78">{item}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-[1rem] border border-white/8 bg-black/10 px-3.5 py-3">
                    <p className="text-[0.68rem] uppercase tracking-[0.16em] text-white/52">
                      aguardando retorno
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-white">{awaitingReply}</p>
                  </div>
                  <div className="rounded-[1rem] border border-white/8 bg-black/10 px-3.5 py-3">
                    <p className="text-[0.68rem] uppercase tracking-[0.16em] text-white/52">
                      pagamentos recuperados
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-white">
                      {analytics.recovered_payments}
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-white/62">
                  O objetivo da home é só este: deixar claro o fluxo. O trabalho
                  operacional acontece nas áreas internas.
                </p>
              </PlatformSurface>
            </div>
          </div>
        </section>

        <section className="mt-10 grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <PlatformSurface className="p-5 sm:p-6">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-sky-500">
              Visão do produto
            </p>
            <h2 className="mt-2 max-w-[14ch] text-3xl font-semibold tracking-tight text-[#111827]">
              Uma entrada simples para um software de recovery.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#6b7280]">
              A home explica o que a plataforma resolve e aponta para as áreas
              de uso real. Ela não precisa competir com o dashboard.
            </p>
          </PlatformSurface>

          <PlatformSurface className="p-5 sm:p-6">
            <div className="grid gap-3 sm:grid-cols-2">
              {modules.map((module) => (
                <Link
                  key={module.href}
                  href={module.href}
                  className="group rounded-[1.2rem] border border-black/[0.06] bg-[#fbfbfc] px-4 py-4 transition-colors hover:bg-white"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-[0.95rem] bg-[rgba(2,132,199,0.1)]">
                    <module.icon className="h-5 w-5 text-sky-500" />
                  </div>
                  <p className="mt-4 text-base font-semibold text-[#111827]">
                    {module.title}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[#6b7280]">
                    {module.description}
                  </p>
                </Link>
              ))}
            </div>
          </PlatformSurface>
        </section>
      </main>
    </div>
  );
}

function HeroStat({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[1.2rem] border border-white/10 bg-white/7 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[0.68rem] uppercase tracking-[0.16em] text-white/54">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-white">{value}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-500/14 ring-1 ring-sky-400/18">
          <Icon className="h-5 w-5 text-sky-300" />
        </div>
      </div>
    </div>
  );
}
