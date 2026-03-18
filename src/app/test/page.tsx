import Link from "next/link";
import {
  ArrowRight,
  FlaskConical,
  Link2,
  MessageCircleReply,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";

import {
  resetOperationalDataAction,
  seedValidationScenarioAction,
  generateRetryLinkAction,
  seedFailedPaymentAction,
  seedRecoveredPaymentAction,
  seedShieldTransactionAction,
  simulateInboundReplyAction,
} from "@/app/actions/test-actions";
import {
  PlatformAppPage,
  PlatformInset,
  PlatformMetricCard,
  PlatformSurface,
} from "@/components/platform/platform-shell";
import { formatCurrency } from "@/lib/format";
import { requireAuthenticatedSession } from "@/server/auth/session";
import { getPaymentRecoveryService } from "@/server/recovery/services/payment-recovery-service";

export const dynamic = "force-dynamic";

type TestPageProps = {
  searchParams: Promise<{
    status?: string;
    event?: string;
    retry?: string;
    message?: string;
  }>;
};

export default async function TestPage({ searchParams }: TestPageProps) {
  await requireAuthenticatedSession(["admin"]);
  const params = await searchParams;
  const service = getPaymentRecoveryService();
  const [analytics, contacts] = await Promise.all([
    service.getRecoveryAnalytics(),
    service.getFollowUpContacts(),
  ]);
  const health = await service.getHealthSummary();

  const activeContacts = contacts.filter(
    (contact) =>
      contact.lead_status !== "RECOVERED" && contact.lead_status !== "LOST",
  );
  const inboxReadyContacts = contacts.filter((contact) => Boolean(contact.phone)).length;
  const latestContacts = [...contacts]
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, 4);

  return (
    <PlatformAppPage
      currentPath="/test"
      action={
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 rounded-full bg-orange-500 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-orange-600"
        >
          Voltar para recuperação
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      }
    >
      <section className="grid gap-4 sm:grid-cols-3">
        <PlatformMetricCard
          icon={FlaskConical}
          label="webhooks na base"
          value={analytics.total_failed_payments.toString()}
          subtitle="alimentando a operação"
        />
        <PlatformMetricCard
          icon={ShieldCheck}
          label="casos ativos"
          value={activeContacts.length.toString()}
          subtitle="carteira aberta agora"
        />
        <PlatformMetricCard
          icon={MessageCircleReply}
          label="com canal de conversa"
          value={inboxReadyContacts.toString()}
          subtitle="aptos para inbox e follow-up"
        />
      </section>

      {params.status ? (
        <PlatformSurface className="mt-5 p-4">
          <p className="text-sm font-medium text-[#1a1a2e]">
            {params.status === "ok"
              ? "Ação executada com sucesso."
              : "Não foi possível concluir a ação."}
          </p>
          {params.event ? (
            <p className="mt-1 text-sm text-[#717182]">
              Evento disparado:{" "}
              {params.event === "failure"
                ? "falha simulada"
                : "pagamento recuperado"}
            </p>
          ) : null}
          {params.retry ? (
            <p className="mt-1 break-all text-sm text-[#717182]">
              Retry gerado: {params.retry}
            </p>
          ) : null}
          {params.message ? (
            <p className="mt-1 text-sm text-[#717182]">{params.message}</p>
          ) : null}
        </PlatformSurface>
      ) : null}

      <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_21rem]">
        <div className="space-y-5">
          <PlatformSurface className="p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-orange-500">
              Sessão de validação
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#1a1a2e]">
              Alimente a plataforma só com dados reais do seu teste.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#717182]">
              Este painel injeta eventos no backend real da Shield Recovery.
              Tudo o que aparece em dashboard, CRM, conversas e analytics nasce
              daqui ou do webhook oficial. Se quiser validar do zero, limpe a
              base e gere um cenário completo.
            </p>

            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              <PlatformInset className="p-4">
                <p className="text-sm font-medium text-[#1a1a2e]">
                  Resetar operação
                </p>
                <p className="mt-2 text-sm leading-6 text-[#717182]">
                  Limpa pagamentos, leads, mensagens, filas e webhooks, mas
                  preserva as conexões salvas.
                </p>
                <form action={resetOperationalDataAction} className="mt-4">
                  <button className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-[#1a1a2e] transition-colors hover:bg-[#f5f5f7]">
                    <RotateCcw className="h-4 w-4" />
                    Limpar base
                  </button>
                </form>
              </PlatformInset>

              <PlatformInset className="p-4">
                <p className="text-sm font-medium text-[#1a1a2e]">
                  Criar cenário completo
                </p>
                <p className="mt-2 text-sm leading-6 text-[#717182]">
                  Gera Pix pendente, falha, caso recuperado e uma resposta
                  inbound do cliente para validar dashboard, leads e inbox.
                </p>
                <form action={seedValidationScenarioAction} className="mt-4">
                  <button className="inline-flex items-center gap-1.5 rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600">
                    <FlaskConical className="h-4 w-4" />
                    Gerar cenário
                  </button>
                </form>
              </PlatformInset>

              <PlatformInset className="p-4">
                <p className="text-sm font-medium text-[#1a1a2e]">
                  Simular falha de pagamento
                </p>
                <p className="mt-2 text-sm leading-6 text-[#717182]">
                  Cria um novo caso com status de recuperação ativa, usando o
                  fluxo real de importação.
                </p>
                <form action={seedFailedPaymentAction} className="mt-4">
                  <button className="inline-flex items-center gap-1.5 rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600">
                    Disparar falha
                  </button>
                </form>
              </PlatformInset>

              <PlatformInset className="p-4">
                <p className="text-sm font-medium text-[#1a1a2e]">
                  Simular payload da Shield
                </p>
                <p className="mt-2 text-sm leading-6 text-[#717182]">
                  Injeta um evento no formato real de transação da Shield, com
                  `data.pix.qrcode`, metadata serializada e status
                  `waiting_payment`.
                </p>
                <form action={seedShieldTransactionAction} className="mt-4">
                  <button className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-[#1a1a2e] transition-colors hover:bg-[#f5f5f7]">
                    <Link2 className="h-4 w-4" />
                    Importar payload Shield
                  </button>
                </form>
              </PlatformInset>

              <PlatformInset className="p-4">
                <p className="text-sm font-medium text-[#1a1a2e]">
                  Simular pagamento recuperado
                </p>
                <p className="mt-2 text-sm leading-6 text-[#717182]">
                  Cria um evento de sucesso para validar leitura analítica e
                  mudança de status da carteira.
                </p>
                <form action={seedRecoveredPaymentAction} className="mt-4">
                  <button className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-[#1a1a2e] transition-colors hover:bg-[#f5f5f7]">
                    Disparar recuperação
                  </button>
                </form>
              </PlatformInset>

              <PlatformInset className="p-4">
                <p className="text-sm font-medium text-[#1a1a2e]">
                  Simular resposta do cliente
                </p>
                <p className="mt-2 text-sm leading-6 text-[#717182]">
                  Injeta uma mensagem inbound na inbox para validar conversa,
                  thread e continuidade do atendimento antes de conectar o canal.
                </p>
                <form action={simulateInboundReplyAction} className="mt-4">
                  <button className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-[#1a1a2e] transition-colors hover:bg-[#f5f5f7]">
                    <MessageCircleReply className="h-4 w-4" />
                    Simular resposta
                  </button>
                </form>
              </PlatformInset>
            </div>
          </PlatformSurface>

          <PlatformSurface className="p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-orange-500">
              Retry
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-[#1a1a2e]">
              Gere um novo link de pagamento para um caso existente.
            </h2>
            <form action={generateRetryLinkAction} className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input
                name="gatewayPaymentId"
                defaultValue={latestContacts[0]?.gateway_payment_id ?? ""}
                placeholder="gateway payment id"
                className="flex-1 rounded-xl border border-black/10 bg-[#f5f5f7] px-3.5 py-2.5 text-sm text-[#1a1a2e] outline-none placeholder:text-[#9ca3af] focus:border-orange-300 focus:ring-1 focus:ring-orange-200"
              />
              <button className="inline-flex items-center justify-center rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600">
                Gerar retry
              </button>
            </form>
          </PlatformSurface>
        </div>

        <div className="space-y-4">
          <PlatformSurface className="p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-orange-500">
              Endpoints oficiais
            </p>
            <div className="mt-4 space-y-3">
              <SideLine label="Gateway webhook" value={health.webhook_url} />
              <SideLine
                label="WhatsApp webhook"
                value={health.whatsapp_webhook_url}
              />
              <SideLine label="Health" value="/api/health" />
              <SideLine label="Storage" value={health.storage_mode} />
            </div>
          </PlatformSurface>

          <PlatformSurface className="p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-orange-500">
              Casos recentes
            </p>
            <div className="mt-4 space-y-3">
              {latestContacts.map((contact) => (
                <PlatformInset key={contact.lead_id} className="p-3">
                  <p className="text-sm font-medium text-[#1a1a2e]">
                    {contact.customer_name}
                  </p>
                  <p className="mt-1 text-xs text-[#717182]">
                    {contact.gateway_payment_id}
                  </p>
                  <p className="mt-1 text-xs text-[#717182]">
                    {formatCurrency(contact.payment_value)}
                  </p>
                </PlatformInset>
              ))}
            </div>
          </PlatformSurface>
        </div>
      </section>
    </PlatformAppPage>
  );
}

function SideLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[0.68rem] uppercase tracking-[0.16em] text-[#9ca3af]">
        {label}
      </p>
      <div className="flex items-start gap-2">
        <Link2 className="mt-0.5 h-3.5 w-3.5 text-[#9ca3af]" />
        <p className="break-all text-sm leading-6 text-[#374151]">{value}</p>
      </div>
    </div>
  );
}
