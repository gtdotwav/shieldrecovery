import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowUpRight,
  BarChart3,
  Link2,
  Sparkles,
  UsersRound,
  Workflow,
} from "lucide-react";

import {
  PlatformInset,
  PlatformPill,
  PlatformSurface,
} from "@/components/platform/platform-shell";
import {
  TextRevealCard,
  TextRevealCardDescription,
  TextRevealCardTitle,
} from "@/components/ui/text-reveal-card";

type PreviewMetric = {
  label: string;
  value: string;
  detail: string;
};

type ModuleCard = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  tone: string;
};

const modules: ModuleCard[] = [
  {
    href: "/connect",
    title: "Connect",
    description:
      "Liga WhatsApp, email, CRM e playbooks para que a operação comece do jeito certo.",
    icon: Link2,
    tone: "from-[rgba(255,106,0,0.14)] to-transparent",
  },
  {
    href: "/dashboard",
    title: "Dashboard",
    description:
      "Mostra o que merece atenção agora, o que está mais quente e onde a receita pode voltar.",
    icon: BarChart3,
    tone: "from-[rgba(143,217,255,0.12)] to-transparent",
  },
  {
    href: "/leads",
    title: "Leads",
    description:
      "Organiza o CRM por funil, perfil e momento do cliente com apoio da IA.",
    icon: UsersRound,
    tone: "from-[rgba(123,201,111,0.12)] to-transparent",
  },
];

const productFlow = [
  "Conexões entram pela camada de Connect.",
  "O Dashboard transforma atividade em prioridade comercial.",
  "Leads recebe cada caso no funil certo e a IA orienta a tratativa.",
];

const aiSignals = [
  "sinaliza quem precisa de ação imediata",
  "ajusta o tom conforme perfil e estágio",
  "sugere o próximo movimento com menor atrito",
];

type RecoveryCommandCenterProps = {
  totalFailedPayments: number;
  activeRecoveries: number;
  recoveredRevenue: number;
};

export function RecoveryCommandCenter({
  totalFailedPayments,
  activeRecoveries,
  recoveredRevenue,
}: RecoveryCommandCenterProps) {
  const previewMetrics: PreviewMetric[] = [
    {
      label: "eventos recebidos",
      value: totalFailedPayments.toString(),
      detail: "pagamentos reais que ja chegaram ao motor de recovery",
    },
    {
      label: "recoveries ativas",
      value: activeRecoveries.toString(),
      detail: "casos que continuam vivos dentro da carteira",
    },
    {
      label: "receita recuperada",
      value: formatCurrency(recoveredRevenue),
      detail: "valor ja reconquistado pela operacao ate agora",
    },
  ];

  return (
    <PlatformSurface className="p-5 sm:p-6">
      <div className="flex flex-col gap-4 border-b border-white/10 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[0.72rem] uppercase tracking-[0.28em] text-[#ff8d43]">
            Preview da plataforma
          </p>
          <h2 className="mt-3 max-w-[13ch] text-balance text-3xl font-semibold tracking-[-0.06em] text-white sm:text-[2.4rem]">
            Plataforma única para recuperar receita.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#c1c6ce]">
            O produto inteiro foi organizado para parecer software vivo: cada
            módulo tem função clara, a operação tem contexto e a IA ajuda a
            reduzir dúvida do time.
          </p>
        </div>

        <PlatformPill icon={Workflow}>connect, monitora, trata e recupera</PlatformPill>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.12fr)_21rem]">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {previewMetrics.map((metric) => (
              <PlatformInset key={metric.label} className="p-4">
                <p className="text-[0.68rem] uppercase tracking-[0.22em] text-[#9fa5ae]">
                  {metric.label}
                </p>
                <p className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-white">
                  {metric.value}
                </p>
                <p className="mt-2 text-sm leading-6 text-[#c1c6ce]">
                  {metric.detail}
                </p>
              </PlatformInset>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            {modules.map((module) => (
              <Link
                key={module.title}
                href={module.href}
                className="group relative overflow-hidden rounded-[1.55rem] border border-white/10 bg-[#0f1217] p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(255,106,0,0.18)] hover:bg-[#11151b]"
              >
                <div
                  className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${module.tone}`}
                />
                <div className="relative">
                  <div className="flex items-center justify-between gap-3">
                    <div className="rounded-[1rem] border border-white/10 bg-white/[0.04] p-2.5">
                      <module.icon className="h-4 w-4 text-[#ff6a00]" />
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-[#d1d5db]/40 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#ffb178]" />
                  </div>
                  <h3 className="mt-5 text-xl font-semibold tracking-[-0.05em] text-white">
                    {module.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-[#c1c6ce]">
                    {module.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>

          <PlatformInset className="p-5">
            <div className="flex items-center gap-2 text-[0.72rem] uppercase tracking-[0.28em] text-[#ff8d43]">
              <Workflow className="h-4 w-4" />
              Como a plataforma se organiza
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {productFlow.map((item, index) => (
                <div
                  key={item}
                  className="rounded-[1.2rem] border border-white/10 bg-[#0d1015] px-4 py-4"
                >
                  <p className="text-[0.68rem] uppercase tracking-[0.18em] text-[#ff8d43]">
                    etapa 0{index + 1}
                  </p>
                  <p className="mt-3 text-sm leading-7 text-[#c1c6ce]">{item}</p>
                </div>
              ))}
            </div>
          </PlatformInset>
        </div>

        <div className="space-y-4">
          <TextRevealCard
            text="Parecia perda inevitável."
            revealText="PagRecovery enxerga receita recuperavel."
            className="rounded-[1.8rem] border-white/10 bg-[#0c0f14] px-5 py-5"
            showStars={false}
          >
            <div className="mb-4 flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.22em] text-[#ff8d43]">
              <Sparkles className="h-4 w-4" />
              Leitura estratégica
            </div>
            <TextRevealCardTitle className="max-w-[14ch] text-[1.65rem] font-semibold tracking-[-0.06em] text-white">
              A operação ganha contexto antes do contato.
            </TextRevealCardTitle>
            <TextRevealCardDescription className="max-w-[30ch] text-sm leading-7 text-[#c1c6ce]">
              O foco deixa de ser a falha técnica e passa a ser a melhor forma
              de trazer a receita de volta.
            </TextRevealCardDescription>
          </TextRevealCard>

          <PlatformInset className="p-5">
            <div className="flex items-center gap-2 text-[0.72rem] uppercase tracking-[0.28em] text-[#ff8d43]">
              <Sparkles className="h-4 w-4" />
              O que a IA faz no dia a dia
            </div>
            <div className="mt-5 space-y-3">
              {aiSignals.map((signal) => (
                <div
                  key={signal}
                  className="rounded-[1.1rem] border border-white/10 bg-[#0d1015] px-4 py-3"
                >
                  <p className="text-sm leading-7 text-[#c1c6ce]">{signal}</p>
                </div>
              ))}
            </div>
          </PlatformInset>
        </div>
      </div>
    </PlatformSurface>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}
