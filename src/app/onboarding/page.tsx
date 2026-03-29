import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  CircleAlert,
  Inbox,
  UsersRound,
  Zap,
} from "lucide-react";

import {
  PlatformAppPage,
  PlatformMetricCard,
  PlatformPill,
  PlatformSurface,
} from "@/components/platform/platform-shell";
import { formatCurrency } from "@/lib/format";
import { platformBrand } from "@/lib/platform";
import { canRoleAccessAgent, type UserRole } from "@/server/auth/core";
import { getSellerIdentityByEmail } from "@/server/auth/identities";
import { requireAuthenticatedSession } from "@/server/auth/session";
import {
  getConnectionSettingsService,
  type PublicRuntimeConnectionSettings,
} from "@/server/recovery/services/connection-settings-service";
import { MessagingService } from "@/server/recovery/services/messaging-service";
import { getPaymentRecoveryService } from "@/server/recovery/services/payment-recovery-service";

export const revalidate = 60;

export const metadata = {
  title: "Guia",
};

type OnboardingModule = {
  href: string;
  title: string;
  description: string;
  whenToUse: string;
  roleNote: string;
};

type ReadinessItem = {
  label: string;
  ready: boolean;
  detail: string;
};

export default async function OnboardingPage() {
  const session = await requireAuthenticatedSession(["admin", "seller"]);
  const service = getPaymentRecoveryService();
  const messaging = new MessagingService();
  const settingsService = getConnectionSettingsService();
  const sellerIdentity =
    session.role === "seller"
      ? await getSellerIdentityByEmail(session.email)
      : null;

  const [analytics, allContacts, inboxSnapshot, runtime, health, adminSnapshot] =
    await Promise.all([
      service.getRecoveryAnalytics(),
      service.getFollowUpContacts(),
      messaging.getInboxSnapshot(),
      settingsService.getPublicRuntimeSettings(),
      service.getHealthSummary(),
      session.role === "admin" ? service.getAdminPanelSnapshot() : Promise.resolve(null),
    ]);

  const contacts = allContacts.filter((contact) =>
    canRoleAccessAgent(
      session.role,
      contact.assigned_agent,
      sellerIdentity?.agentName,
    ),
  );
  const visibleLeadIds = new Set(contacts.map((contact) => contact.lead_id));
  const visibleConversations = inboxSnapshot.conversations.filter((conversation) => {
    if (session.role === "admin") {
      return true;
    }

    if (conversation.lead_id) {
      return visibleLeadIds.has(conversation.lead_id);
    }

    return canRoleAccessAgent(
      session.role,
      conversation.assigned_agent,
      sellerIdentity?.agentName,
    );
  });

  const modules = getModulesForRole(session.role);
  const readiness = getReadinessItems({
    role: session.role,
    runtime,
    analyticsEvents: analytics.total_failed_payments,
    sellerCount: adminSnapshot?.sellerUsers.length ?? 0,
    visibleLeadCount: contacts.length,
  });
  const readyCount = readiness.filter((item) => item.ready).length;
  const roleHomeHref = session.role === "admin" ? "/dashboard" : "/leads";
  const workerReady =
    runtime.workerConfigured &&
    (runtime.workerCronConfigured || runtime.workerExecutorConfigured);
  const nextAction = getNextActionForRole({
    role: session.role,
    runtime,
    sellerCount: adminSnapshot?.sellerUsers.length ?? 0,
    analyticsEvents: analytics.total_failed_payments,
    visibleLeadCount: contacts.length,
  });

  return (
    <PlatformAppPage
      currentPath="/onboarding"
      action={
        <Link
          href={roleHomeHref}
          className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[var(--accent-strong)]"
        >
          Ir para {session.role === "admin" ? "Recuperação" : "CRM"}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      }
    >
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <PlatformMetricCard
          icon={CheckCircle2}
          label="checklist pronto"
          value={`${readyCount}/${readiness.length}`}
          subtitle="itens essenciais do onboarding"
        />
        <PlatformMetricCard
          icon={UsersRound}
          label="leads visíveis"
          value={String(contacts.length)}
          subtitle="carteira acessível neste login"
        />
        <PlatformMetricCard
          icon={Inbox}
          label="conversas visíveis"
          value={String(visibleConversations.length)}
          subtitle="threads disponíveis para operar"
        />
        <PlatformMetricCard
          icon={BarChart3}
          label="valor recuperado"
          value={formatCurrency(analytics.recovered_revenue)}
          subtitle="resultado acumulado da plataforma"
        />
      </section>

      <PlatformSurface className="mt-5 p-5 sm:p-6">
        <div className="grid gap-5 border-b border-[var(--border)] pb-5 lg:grid-cols-[minmax(0,1.2fr)_20rem] lg:items-end">
          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">
              Onboarding da plataforma
            </p>
            <h2 className="mt-2 max-w-[18ch] text-3xl font-semibold tracking-tight text-[var(--foreground)] sm:text-[2.2rem]">
              Entre sabendo por onde começar e o que cada área faz.
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)]">
              O objetivo deste guia é tirar ambiguidade. Ele mostra o papel de
              cada tela, a ordem recomendada de uso e o estado real da operação
              neste ambiente.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <PlatformPill>{session.role === "admin" ? "visão admin" : "visão seller"}</PlatformPill>
            </div>
          </div>

          <div className="rounded-[1.2rem] border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-4 text-sm leading-6 text-[var(--muted)]">
            A estrutura já está coerente para operar. O foco agora é orientar o
            primeiro acesso, deixar a ordem de uso óbvia e mostrar o que já está
            pronto sem sobrecarregar quem entra.
          </div>
        </div>
      </PlatformSurface>

      <section className="mt-5 grid gap-5 2xl:grid-cols-[minmax(0,1.25fr)_22rem]">
        <PlatformSurface className="p-5 sm:p-6">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
                Ordem recomendada
              </p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--foreground)]">
                O fluxo ideal de uso
              </h3>
            </div>
            <PlatformPill icon={Zap}>
              {session.role === "admin" ? "configurar, governar e acompanhar" : "assumir, conversar e mover"}
            </PlatformPill>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {getFlowStepsForRole(session.role).map((step, index) => (
              <Link
                key={step.href}
                href={step.href}
                className="rounded-[1.4rem] border border-[var(--border)] bg-[var(--surface)] px-4 py-4 transition-colors hover:bg-[var(--surface-strong)]"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-sm font-semibold text-[var(--accent)]">
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--foreground)]">{step.title}</p>
                    <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                      {step.description}
                    </p>
                    <p className="mt-2 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
                      {step.outcome}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </PlatformSurface>

        <PlatformSurface className="p-4 sm:p-5">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
            Checklist do ambiente
          </p>
          <h3 className="mt-2 text-xl font-semibold tracking-tight text-[var(--foreground)]">
            O que já está pronto agora
          </h3>
          <div className="mt-4 space-y-2.5">
            {readiness.map((item) => (
              <div
                key={item.label}
                className="rounded-[1.15rem] border border-[var(--border)] bg-[var(--surface-strong)] px-3.5 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-[var(--foreground)]">{item.label}</p>
                  <span
                    className={
                      item.ready
                        ? "inline-flex items-center gap-1 rounded-full bg-[var(--accent)]/5 px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-[var(--accent-strong)]"
                        : "inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-amber-700"
                    }
                  >
                    {item.ready ? <CheckCircle2 className="h-3.5 w-3.5" /> : <CircleAlert className="h-3.5 w-3.5" />}
                    {item.ready ? "pronto" : "pendente"}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{item.detail}</p>
              </div>
            ))}
          </div>
        </PlatformSurface>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_20rem]">
        <PlatformSurface className="p-5 sm:p-6">
          <div className="border-b border-[var(--border)] pb-4">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
              O que cada área faz
            </p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--foreground)]">
              Use cada aba com um papel claro
            </h3>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {modules.map((module) => (
              <Link
                key={module.href}
                href={module.href}
                className="rounded-[1.35rem] border border-[var(--border)] bg-[var(--surface)] px-4 py-4 transition-colors hover:bg-[var(--surface-strong)]"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-base font-semibold text-[var(--foreground)]">{module.title}</p>
                  <ArrowRight className="h-4 w-4 text-[var(--muted)]" />
                </div>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  {module.description}
                </p>
                <div className="mt-3 space-y-2">
                  <div>
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                      Quando usar
                    </p>
                    <p className="mt-1 text-sm leading-6 text-[var(--foreground-secondary)]">
                      {module.whenToUse}
                    </p>
                  </div>
                  <div>
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                      Leitura de papel
                    </p>
                    <p className="mt-1 text-sm leading-6 text-[var(--foreground-secondary)]">
                      {module.roleNote}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </PlatformSurface>

        <div className="space-y-5">
          <PlatformSurface className="p-4 sm:p-5">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
              Próxima ação
            </p>
            <h3 className="mt-2 text-xl font-semibold tracking-tight text-[var(--foreground)]">
              {nextAction.title}
            </h3>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              {nextAction.description}
            </p>
            <Link
              href={nextAction.href}
              className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-strong)]"
            >
              {nextAction.ctaLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </PlatformSurface>

          <PlatformSurface className="p-4 sm:p-5">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
              URLs importantes
            </p>
            <div className="mt-4 space-y-3">
              <GuideLine label="Webhook do gateway" value={health.webhook_url} />
              <GuideLine label="Webhook do WhatsApp" value={health.whatsapp_webhook_url} />
              <GuideLine label="Worker" value={health.worker_url} />
            </div>
          </PlatformSurface>

          <PlatformSurface className="p-4 sm:p-5">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
              Estado do motor
            </p>
            <div className="mt-4 space-y-3">
              <GuideState
                label="Banco"
                ready={runtime.databaseConfigured}
                detail={
                  runtime.databaseConfigured
                    ? "Persistência ativa no Supabase."
                    : "Sem banco operacional conectado."
                }
              />
              <GuideState
                label="WhatsApp"
                ready={runtime.whatsappConfigured}
                detail={
                  runtime.whatsappConfigured
                    ? "Canal apto para disparo e inbound."
                    : "Canal ainda depende de provider e sessão."
                }
              />
              <GuideState
                label="IA"
                ready={runtime.aiConfigured}
                detail={
                  runtime.aiConfigured
                    ? "OpenAI pronta para copy e continuidade."
                    : "Sem chave da OpenAI no runtime."
                }
              />
              <GuideState
                label="Worker"
                ready={workerReady}
                detail={
                  workerReady
                    ? "Execução contínua disponível."
                    : "Executor ainda incompleto para rotina contínua."
                }
              />
            </div>
          </PlatformSurface>
        </div>
      </section>
    </PlatformAppPage>
  );
}

function getFlowStepsForRole(role: UserRole) {
  if (role === "seller") {
    return [
      {
        href: "/leads",
        title: "Abrir o CRM",
        description:
          "Veja sua carteira e entenda quais casos estão em entrada, contato ou espera de retorno.",
        outcome: "Aqui você decide qual lead puxar primeiro.",
      },
      {
        href: "/inbox",
        title: "Continuar a conversa",
        description:
          "Atenda quem respondeu, registre a tratativa e mantenha o histórico no mesmo lugar.",
        outcome: "A conversa vira continuidade do lead, não canal isolado.",
      },
      {
        href: "/ai",
        title: "Usar automações como apoio",
        description:
          "Confira a leitura da IA, veja a estratégia sugerida e acompanhe a execução da carteira.",
        outcome: "A IA orienta; a operação decide quando assumir.",
      },
      {
        href: "/calendar",
        title: "Ler o dia pelo calendário",
        description:
          "Abra a data para ver movimento, notas e pontos importantes da rotina.",
        outcome: "O calendário vira memória operacional do time.",
      },
    ];
  }

  return [
    {
      href: "/connect",
      title: "Configurar integrações",
      description:
        "Banco, gateway, WhatsApp, CRM, IA e worker ficam aqui. Sem isso, o resto da plataforma opera só parcialmente.",
      outcome: "Essa é a primeira parada do admin.",
    },
    {
      href: "/dashboard",
      title: "Ler a recuperação",
      description:
        "Acompanhe o que pede ação agora, como a carteira está distribuída e onde estão os gargalos.",
      outcome: "O dashboard é visão de controle, não lugar de tratar cada caso.",
    },
    {
      href: "/admin",
      title: "Governar sellers e autonomia",
      description:
        "Defina limites, metas, acesso a conversas, automações e autonomia da IA por seller.",
      outcome: "Aqui o admin controla a operação sem entrar em cada conversa.",
    },
    {
      href: "/leads",
      title: "Entrar no caso quando necessário",
      description:
        "Use o CRM para validar distribuição, qualidade da carteira e evolução das etapas.",
      outcome: "O CRM é a área de trabalho; o admin entra quando precisa calibrar.",
    },
  ];
}

function getModulesForRole(role: UserRole): OnboardingModule[] {
  const baseModules: OnboardingModule[] = [
    {
      href: "/connect",
      title: "Integrações",
      description:
        "Mostra o que já está configurado, o que está pendente e quais URLs a operação precisa copiar.",
      whenToUse: "No setup inicial e sempre que algum canal ou credencial cair.",
      roleNote:
        role === "admin"
          ? "Admin configura. Seller consulta as URLs e o estado do runtime."
          : "Seller consulta o que está ativo e copia URLs públicas sem acesso a segredos.",
    },
    {
      href: "/leads",
      title: "CRM",
      description:
        "Organiza a carteira em lista, mostra etapa, responsável, valor, contato e próxima ação.",
      whenToUse: "Quando você precisa priorizar, assumir ou mover um caso.",
      roleNote:
        role === "admin"
          ? "Admin usa para calibrar carteira e distribuição."
          : "Seller usa como base principal do dia.",
    },
    {
      href: "/inbox",
      title: "Conversas",
      description:
        "Centraliza a thread do cliente, o contexto da cobrança e a continuidade do follow-up.",
      whenToUse: "Sempre que houver resposta, disparo ou necessidade de continuar a tratativa.",
      roleNote:
        role === "admin"
          ? "Admin monitora e destrava. Seller atende a carteira própria."
          : "Seller atende e registra tudo na mesma conversa.",
    },
    {
      href: "/ai",
      title: "Automações",
      description:
        "Expõe a leitura da IA, estratégias ativas, classificações e atividade recente do motor.",
      whenToUse: "Quando você quer entender como a IA está orientando ou executando a recuperação.",
      roleNote:
        role === "admin"
          ? "Admin governa e ajusta autonomia."
          : "Seller usa como leitura de apoio para a própria carteira.",
    },
    {
      href: "/calendar",
      title: "Calendário",
      description:
        "Mostra a movimentação por dia e concentra timeline e notas ao abrir uma data.",
      whenToUse: "Para revisar operação diária, contexto de receita e registros internos.",
      roleNote: "Serve como memória do time e leitura de rotina.",
    },
  ];

  if (role === "admin") {
    return [
      {
        href: "/dashboard",
        title: "Recuperação",
        description:
          "É a visão executiva da operação: carteira, gargalos, prioridades e resultados.",
        whenToUse: "Ao abrir o dia e ao revisar andamento ao longo da operação.",
        roleNote: "Tela de controle. Não substitui CRM nem Inbox.",
      },
      {
        href: "/admin",
        title: "Admin",
        description:
          "Central de governança dos sellers, limites, metas, autonomia e fila do worker.",
        whenToUse: "Quando você precisa controlar o que cada seller pode fazer.",
        roleNote: "Área exclusiva do admin.",
      },
      ...baseModules,
      {
        href: "/test",
        title: "Testes",
        description:
          "Permite simular eventos, limpar base de teste e validar a operação ponta a ponta.",
        whenToUse: "Antes de uma integração nova ou durante homologação.",
        roleNote: "Use para validar sem depender do gateway real.",
      },
    ];
  }

  return baseModules;
}

function getReadinessItems(input: {
  role: UserRole;
  runtime: PublicRuntimeConnectionSettings;
  analyticsEvents: number;
  sellerCount: number;
  visibleLeadCount: number;
}): ReadinessItem[] {
  const base: ReadinessItem[] = [
    {
      label: "Gateway e webhook",
      ready: input.analyticsEvents > 0,
      detail:
        input.analyticsEvents > 0
          ? `A plataforma já recebeu ${input.analyticsEvents} eventos.`
          : "Ainda não há evento entrando; o próximo passo é apontar o gateway para o webhook.",
    },
    {
      label: "Banco operacional",
      ready: input.runtime.databaseConfigured,
      detail: input.runtime.databaseConfigured
        ? "Persistência real já ligada ao runtime."
        : "Sem banco real, a operação perde consistência fora do fallback local.",
    },
    {
      label: "WhatsApp",
      ready: input.runtime.whatsappConfigured,
      detail: input.runtime.whatsappConfigured
        ? "Canal apto para disparos e respostas inbound."
        : "O fluxo de conversa existe, mas ainda depende da conexão do canal.",
    },
    {
      label: "IA",
      ready: input.runtime.aiConfigured,
      detail: input.runtime.aiConfigured
        ? "A IA já pode gerar copy e continuidade."
        : "Sem chave configurada, a plataforma opera com fallback e sem inteligência ativa.",
    },
    {
      label: "Worker",
      ready:
        input.runtime.workerConfigured &&
        (input.runtime.workerCronConfigured || input.runtime.workerExecutorConfigured),
      detail:
        input.runtime.workerConfigured &&
        (input.runtime.workerCronConfigured || input.runtime.workerExecutorConfigured)
          ? "Fila pronta para execução recorrente."
          : "A fila existe, mas precisa do executor para rodar continuamente.",
    },
  ];

  if (input.role === "admin") {
    base.push({
      label: "Contas seller",
      ready: input.sellerCount > 0,
      detail:
        input.sellerCount > 0
          ? `${input.sellerCount} seller(s) persistidos na plataforma.`
          : "Ainda não há sellers criados no painel Admin.",
    });
  } else {
    base.push({
      label: "Carteira visível",
      ready: input.visibleLeadCount > 0,
      detail:
        input.visibleLeadCount > 0
          ? `Este seller já enxerga ${input.visibleLeadCount} leads.`
          : "Ainda não há lead atribuído ou disponível nesta carteira.",
    });
  }

  return base;
}

function getNextActionForRole(input: {
  role: UserRole;
  runtime: PublicRuntimeConnectionSettings;
  sellerCount: number;
  analyticsEvents: number;
  visibleLeadCount: number;
}) {
  if (input.role === "admin") {
    if (
      !input.runtime.databaseConfigured ||
      !input.runtime.whatsappConfigured ||
      !input.runtime.aiConfigured
    ) {
      return {
        title: "Fechar integrações essenciais",
        description:
          "Antes de escalar operação, confirme banco, WhatsApp e IA em Integrações. Isso evita uma plataforma bonita, mas ainda parcial.",
        href: "/connect",
        ctaLabel: "Abrir integrações",
      };
    }

    if (input.analyticsEvents === 0) {
      return {
        title: "Validar a entrada do gateway",
        description:
          "A próxima validação é simples: garantir que o primeiro evento real entre e abra a operação ponta a ponta.",
        href: "/test",
        ctaLabel: "Abrir testes",
      };
    }

    if (input.sellerCount === 0) {
      return {
        title: "Criar os sellers da operação",
        description:
          "O núcleo técnico já está pronto. Agora vale criar acessos e distribuir a carteira para o time operar.",
        href: "/admin",
        ctaLabel: "Abrir admin",
      };
    }

    return {
      title: "Acompanhar a recuperação em ritmo real",
      description:
        "Com integrações e sellers prontos, o melhor próximo passo é abrir a operação, monitorar gargalos e calibrar a autonomia.",
      href: "/dashboard",
      ctaLabel: "Abrir recuperação",
    };
  }

  if (input.visibleLeadCount === 0) {
    return {
      title: "Esperar ou assumir a primeira carteira",
      description:
        "Este login ainda não está vendo leads suficientes. O próximo passo é abrir o CRM e acompanhar quando a carteira entrar.",
      href: "/leads",
      ctaLabel: "Abrir CRM",
    };
  }

  return {
    title: "Entrar no CRM e puxar o próximo caso",
    description:
      "Com carteira visível, o seller já deve começar pelo CRM, seguir para Conversas e usar Automações como apoio.",
    href: "/leads",
    ctaLabel: "Abrir CRM",
  };
}

function GuideLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.15rem] border border-[var(--border)] bg-[var(--surface-strong)] px-3.5 py-3">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-1 break-all text-sm leading-6 text-[var(--foreground-secondary)]">{value}</p>
    </div>
  );
}

function GuideState({
  label,
  ready,
  detail,
}: {
  label: string;
  ready: boolean;
  detail: string;
}) {
  return (
    <div className="rounded-[1.15rem] border border-[var(--border)] bg-[var(--surface-strong)] px-3.5 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-[var(--foreground)]">{label}</p>
        <span
          className={
            ready
              ? "inline-flex items-center gap-1 rounded-full bg-[var(--accent)]/5 px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-[var(--accent-strong)]"
              : "inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-amber-700"
          }
        >
          {ready ? "ok" : "pendente"}
        </span>
      </div>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{detail}</p>
    </div>
  );
}
