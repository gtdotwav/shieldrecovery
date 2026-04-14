import {
  Bell,
  CheckCircle2,
  TrendingUp,
  Shield,
  Clock,
  Send,
  Calendar,
  Zap,
  MessageSquare,
  Mail,
} from "lucide-react";

import {
  PlatformAppPage,
  PlatformInset,
  PlatformMetricCard,
  PlatformSectionIntro,
  PlatformSurface,
} from "@/components/platform/platform-shell";
import { requireAuthenticatedSession } from "@/server/auth/session";

export const metadata = { title: "Preventiva" };
export const revalidate = 30;

export default async function PreventivePage() {
  await requireAuthenticatedSession(["admin", "seller"]);

  // TODO: fetch from preventive service when available
  return (
    <PlatformAppPage currentPath="/preventive">
      {/* KPI cards */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <PlatformMetricCard
          icon={Send}
          label="lembretes enviados"
          value="0"
          subtitle="no período ativo"
        />
        <PlatformMetricCard
          icon={CheckCircle2}
          label="pagos antes do vencimento"
          value="0"
          subtitle="por ação preventiva"
        />
        <PlatformMetricCard
          icon={TrendingUp}
          label="taxa de prevenção"
          value="0%"
          subtitle="evitaram inadimplência"
        />
        <PlatformMetricCard
          icon={Shield}
          label="inadimplência evitada"
          value="R$ 0"
          subtitle="valor salvo da régua"
        />
      </section>

      {/* Main content */}
      <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(17rem,0.85fr)]">
        <div className="space-y-5">
          {/* Rules */}
          <PlatformSurface className="p-5 sm:p-6">
            <PlatformSectionIntro
              eyebrow="Régua preventiva"
              title="Regras de lembrete"
              description="Sequência de lembretes enviados antes do vencimento."
            />
            <div className="mt-4 space-y-2.5">
              <RuleCard
                icon={Bell}
                step={1}
                label="Lembrete 3 dias antes"
                description="WhatsApp amigável lembrando do vencimento próximo."
                channel="WhatsApp"
                timing="D-3"
                active={false}
              />
              <RuleCard
                icon={Mail}
                step={2}
                label="E-mail 1 dia antes"
                description="E-mail com link de pagamento facilitado."
                channel="E-mail"
                timing="D-1"
                active={false}
              />
              <RuleCard
                icon={MessageSquare}
                step={3}
                label="Lembrete no dia"
                description="Mensagem no dia do vencimento com urgência sutil."
                channel="WhatsApp"
                timing="D-0"
                active={false}
              />
              <RuleCard
                icon={Zap}
                step={4}
                label="Alerta pós-vencimento"
                description="Comunicação imediata no dia seguinte ao vencimento."
                channel="WhatsApp + E-mail"
                timing="D+1"
                active={false}
              />
            </div>
          </PlatformSurface>

          {/* Recent reminders */}
          <PlatformSurface className="p-5 sm:p-6">
            <PlatformSectionIntro
              eyebrow="Histórico"
              title="Lembretes recentes"
              description="Últimos lembretes preventivos enviados."
            />
            <div className="mt-4">
              <PlatformInset className="p-6 text-center">
                <Bell className="mx-auto h-5 w-5 text-gray-400 dark:text-gray-500" />
                <p className="mt-3 text-sm font-medium text-gray-900 dark:text-white">
                  Nenhum lembrete preventivo enviado ainda.
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Os lembretes aparecerão aqui quando a régua preventiva estiver ativada.
                </p>
              </PlatformInset>
            </div>
          </PlatformSurface>
        </div>

        {/* Sidebar */}
        <div className="space-y-5 xl:sticky xl:top-20 xl:self-start">
          <PlatformSurface className="p-5">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
              Próximos vencimentos
            </p>
            <div className="mt-4 space-y-2.5">
              <UpcomingLine icon={Clock} label="Hoje" count={0} />
              <UpcomingLine icon={Calendar} label="Amanhã" count={0} />
              <UpcomingLine icon={Calendar} label="Próximos 3 dias" count={0} />
              <UpcomingLine icon={Calendar} label="Próximos 7 dias" count={0} />
            </div>
          </PlatformSurface>

          <PlatformSurface className="p-5">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
              Efetividade por canal
            </p>
            <div className="mt-4 space-y-2.5">
              <ChannelEfficiency label="WhatsApp" rate="—" sent={0} />
              <ChannelEfficiency label="E-mail" rate="—" sent={0} />
              <ChannelEfficiency label="SMS" rate="—" sent={0} />
            </div>
          </PlatformSurface>

          <PlatformSurface className="p-5">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
              Impacto preventivo
            </p>
            <div className="mt-4 space-y-2.5">
              <ImpactLine label="Inadimplência antes" value="—" />
              <ImpactLine label="Inadimplência agora" value="—" />
              <ImpactLine label="Redução" value="—" highlight />
            </div>
          </PlatformSurface>
        </div>
      </section>
    </PlatformAppPage>
  );
}

function RuleCard({
  icon: Icon,
  step,
  label,
  description,
  channel,
  timing,
  active,
}: {
  icon: typeof Bell;
  step: number;
  label: string;
  description: string;
  channel: string;
  timing: string;
  active: boolean;
}) {
  return (
    <div className="glass-inset rounded-xl px-4 py-3.5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)]/10">
          <Icon className="h-4 w-4 text-[var(--accent)]" />
        </span>
        <div className="flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[0.6rem] font-semibold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                {timing}
              </span>
              <span className={`rounded-full border px-2 py-0.5 text-[0.6rem] font-semibold ${
                active
                  ? "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400"
                  : "border-gray-200 bg-gray-50 text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
              }`}>
                {active ? "ativo" : "inativo"}
              </span>
            </div>
          </div>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{description}</p>
          <p className="mt-1 text-[0.65rem] font-medium uppercase tracking-wider text-[var(--accent)]">
            {channel}
          </p>
        </div>
      </div>
    </div>
  );
}

function UpcomingLine({ icon: Icon, label, count }: { icon: typeof Clock; label: string; count: number }) {
  return (
    <div className="glass-inset glass-hover rounded-xl px-3.5 py-2.5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 text-[var(--accent)]" />
          <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
        </div>
        <span className="text-sm font-semibold tabular-nums text-gray-900 dark:text-white">{count}</span>
      </div>
    </div>
  );
}

function ChannelEfficiency({ label, rate, sent }: { label: string; rate: string; sent: number }) {
  return (
    <div className="glass-inset rounded-xl px-3.5 py-2.5">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
        <div className="text-right">
          <span className="text-sm font-semibold text-gray-900 dark:text-white">{rate}</span>
          <p className="text-[0.6rem] text-gray-400 dark:text-gray-500">{sent} enviados</p>
        </div>
      </div>
    </div>
  );
}

function ImpactLine({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="glass-inset glass-hover rounded-xl px-3.5 py-2.5">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
        <span className={`text-sm font-semibold tabular-nums ${highlight ? "text-[var(--accent)]" : "text-gray-900 dark:text-white"}`}>
          {value}
        </span>
      </div>
    </div>
  );
}
