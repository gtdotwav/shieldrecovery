import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BarChart3,
  Inbox,
  Link2,
  RefreshCcw,
  UsersRound,
} from "lucide-react";

import {
  PlatformMetricCard,
  PlatformPage,
  PlatformSectionIntro,
  PlatformSurface,
} from "@/components/platform/platform-shell";
import { getPaymentRecoveryService } from "@/server/recovery/services/payment-recovery-service";
import { formatCurrency } from "@/lib/format";

export const dynamic = "force-dynamic";

type RouteCard = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

const steps = [
  {
    step: "01",
    title: "Captura",
    description: "Pagamento falhou? Vira caso de recuperação automaticamente.",
  },
  {
    step: "02",
    title: "Prioriza",
    description: "Dashboard mostra o que precisa de ação agora, por valor e urgência.",
  },
  {
    step: "03",
    title: "Recupera",
    description: "CRM organiza a tratativa e o time trabalha com contexto real.",
  },
];

const modules: RouteCard[] = [
  {
    href: "/dashboard",
    title: "Recuperação",
    description: "O que precisa de ação agora.",
    icon: BarChart3,
  },
  {
    href: "/connect",
    title: "Connect",
    description: "O que está ativo e o que falta.",
    icon: Link2,
  },
  {
    href: "/leads",
    title: "CRM",
    description: "Qual caso mover agora.",
    icon: UsersRound,
  },
  {
    href: "/inbox",
    title: "Inbox",
    description: "Quem precisa de resposta.",
    icon: Inbox,
  },
];

export default async function Home() {
  const service = getPaymentRecoveryService();
  const [analytics, contacts] = await Promise.all([
    service.getRecoveryAnalytics(),
    service.getFollowUpContacts(),
  ]);

  const activeContacts = contacts.filter(
    (c) => c.lead_status !== "RECOVERED" && c.lead_status !== "LOST",
  );
  const portfolioValue = activeContacts.reduce((sum, c) => sum + c.payment_value, 0);

  return (
    <PlatformPage
      currentPath="/"
      action={
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
          >
            Abrir plataforma
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      }
    >
      {/* Hero */}
      <section className="grid gap-10 xl:grid-cols-2 xl:items-start">
        <div className="space-y-6">
          <PlatformSectionIntro
            eyebrow="revenue recovery"
            title="Falha de pagamento vira nova chance de receita."
            description="Shield Recovery conecta canais, prioriza casos e organiza o CRM para que o time saiba o que fazer, com quem e quando."
            titleTag="h1"
          />

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/dashboard"
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
            >
              Ver a plataforma
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/leads"
              className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-medium text-[#1a1a2e] transition-colors hover:bg-[#f5f5f7]"
            >
              Abrir CRM
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <PlatformMetricCard
              icon={RefreshCcw}
              label="eventos recebidos"
              value={analytics.total_failed_payments.toString()}
            />
            <PlatformMetricCard
              icon={BarChart3}
              label="recuperações ativas"
              value={analytics.active_recoveries.toString()}
            />
            <PlatformMetricCard
              icon={UsersRound}
              label="valor em carteira"
              value={formatCurrency(portfolioValue)}
            />
          </div>
        </div>

        {/* Right side - compact platform preview */}
        <PlatformSurface className="p-5">
          <h2 className="text-xs font-medium text-[#717182]">Receita recuperada</h2>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-[#1a1a2e]">
            {formatCurrency(analytics.recovered_revenue)}
          </p>
          <p className="mt-1 text-sm text-[#9ca3af]">
            {analytics.recovered_payments} pagamentos revertidos
          </p>

          <div className="mt-5 border-t border-black/[0.06] pt-4">
            <h3 className="text-xs font-medium text-[#717182]">Módulos</h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {modules.map((m) => (
                <Link
                  key={m.href}
                  href={m.href}
                  className="group flex items-center gap-2.5 rounded-xl border border-black/[0.06] bg-white px-3 py-2.5 transition-colors hover:bg-[#f5f5f7]"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[rgba(249,115,22,0.08)]">
                    <m.icon className="h-4 w-4 text-[#9ca3af] group-hover:text-orange-500 transition-colors" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#1a1a2e]">{m.title}</p>
                    <p className="text-xs text-[#9ca3af]">{m.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </PlatformSurface>
      </section>

      {/* How it works */}
      <section className="mt-20">
        <PlatformSectionIntro
          eyebrow="como funciona"
          title="Da falha ao recovery em 3 etapas."
        />

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {steps.map((item) => (
            <div key={item.step} className="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm">
              <span className="text-xs font-semibold text-orange-500">{item.step}</span>
              <h3 className="mt-3 text-lg font-semibold tracking-tight text-[#1a1a2e]">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#717182]">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </section>
    </PlatformPage>
  );
}
