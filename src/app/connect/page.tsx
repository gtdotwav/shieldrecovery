import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Database,
  Mail,
  MessageCircle,
  QrCode,
  RefreshCw,
  Save,
  Sparkles,
  Unplug,
  UsersRound,
} from "lucide-react";

import {
  disconnectWhatsAppQrSessionAction,
  refreshWhatsAppQrSessionAction,
  saveConnectionSettingsAction,
  saveDatabaseBootstrapAction,
  startWhatsAppQrSessionAction,
} from "@/app/actions/connect-actions";
import {
  PlatformAppPage,
  PlatformMetricCard,
  PlatformPill,
  PlatformSurface,
} from "@/components/platform/platform-shell";
import { requireAuthenticatedSession } from "@/server/auth/session";
import { getConnectionSettingsService } from "@/server/recovery/services/connection-settings-service";
import { MessagingService } from "@/server/recovery/services/messaging-service";
import { getPlatformBootstrapService } from "@/server/recovery/services/platform-bootstrap-service";
import { getPaymentRecoveryService } from "@/server/recovery/services/payment-recovery-service";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Integrações | Shield Recovery",
};

type ConnectPageProps = {
  searchParams: Promise<{
    status?: string;
    saved?: string;
    message?: string;
  }>;
};

type IntegrationStatus = {
  title: string;
  active: boolean;
  detail: string;
  icon: LucideIcon;
};

export default async function ConnectPage({ searchParams }: ConnectPageProps) {
  await requireAuthenticatedSession();
  const params = await searchParams;
  const service = getPaymentRecoveryService();
  const messaging = new MessagingService();
  const settingsService = getConnectionSettingsService();
  const bootstrap = getPlatformBootstrapService();

  const [
    analytics,
    contacts,
    inbox,
    runtimeSettings,
    health,
    databaseSettings,
    whatsappSession,
  ] = await Promise.all([
    service.getRecoveryAnalytics(),
    service.getFollowUpContacts(),
    messaging.getInboxSnapshot(),
    settingsService.getRuntimeSettings(),
    service.getHealthSummary(),
    Promise.resolve(bootstrap.getSettings()),
    messaging.getWhatsAppConnectionSnapshot(),
  ]);

  const contactableLeads = contacts.filter(
    (contact) =>
      (contact.phone && contact.phone !== "not_provided") ||
      (contact.email && contact.email !== "unknown@shield.local"),
  ).length;

  const integrations: IntegrationStatus[] = [
    {
      title: "Shield Gateway",
      active: Boolean(runtimeSettings.webhookSecret),
      detail: analytics.total_failed_payments
        ? `${analytics.total_failed_payments} eventos recebidos`
        : "Pronto para receber",
      icon: CreditCard,
    },
    {
      title: "Banco operacional",
      active: runtimeSettings.databaseConfigured,
      detail:
        runtimeSettings.databaseMode === "supabase"
          ? "Persistindo em Supabase"
          : "Persistindo em fallback local",
      icon: Database,
    },
    {
      title: "WhatsApp API",
      active:
        runtimeSettings.whatsappProvider === "web_api"
          ? whatsappSession.sessionStatus === "connected"
          : runtimeSettings.whatsappConfigured,
      detail:
        runtimeSettings.whatsappProvider === "web_api"
          ? describeQrStatus(whatsappSession.sessionStatus)
          : runtimeSettings.whatsappConfigured
            ? `${inbox.conversations.length} conversas armazenadas`
            : "Provider ainda incompleto",
      icon: MessageCircle,
    },
    {
      title: "Email",
      active: runtimeSettings.emailConfigured,
      detail: runtimeSettings.emailConfigured
        ? "Canal pronto para uso"
        : "API key pendente",
      icon: Mail,
    },
    {
      title: "Shield Lead CRM",
      active: runtimeSettings.crmConfigured,
      detail: runtimeSettings.crmConfigured
        ? "Endpoint salvo no banco"
        : "URL e key pendentes",
      icon: UsersRound,
    },
    {
      title: "AI",
      active: runtimeSettings.aiConfigured,
      detail: runtimeSettings.aiConfigured
        ? "Chave salva"
        : "OpenAI ainda não configurado",
      icon: Sparkles,
    },
  ];

  const activeCount = integrations.filter((item) => item.active).length;

  return (
    <PlatformAppPage
      currentPath="/connect"
      action={
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 rounded-full bg-orange-500 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-orange-600"
        >
          Recuperação
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      }
    >
      <section className="grid gap-3 sm:grid-cols-3">
        <PlatformMetricCard
          icon={CheckCircle2}
          label="integrações prontas"
          value={`${activeCount}/6`}
          subtitle="estado real do runtime"
        />
        <PlatformMetricCard
          icon={CreditCard}
          label="eventos recebidos"
          value={analytics.total_failed_payments.toString()}
          subtitle="gateway + imports internos"
        />
        <PlatformMetricCard
          icon={runtimeSettings.whatsappProvider === "web_api" ? QrCode : UsersRound}
          label={runtimeSettings.whatsappProvider === "web_api" ? "sessão WhatsApp" : "leads acionáveis"}
          value={
            runtimeSettings.whatsappProvider === "web_api"
              ? describeQrShortStatus(whatsappSession.sessionStatus)
              : contactableLeads.toString()
          }
          subtitle={
            runtimeSettings.whatsappProvider === "web_api"
              ? "estado atual do QR"
              : "carteira pronta para follow-up"
          }
        />
      </section>

      {params.status ? (
        <PlatformSurface className="mt-5 p-4">
          <p className="text-sm font-medium text-[#1a1a2e]">
            {params.status === "ok"
              ? "Configuração salva com sucesso."
              : "Não foi possível salvar a configuração."}
          </p>
          {params.saved ? (
            <p className="mt-1 text-sm text-[#717182]">
              Bloco atualizado: {params.saved}
            </p>
          ) : null}
          {params.message ? (
            <p className="mt-1 text-sm text-[#717182]">{params.message}</p>
          ) : null}
        </PlatformSurface>
      ) : null}

      <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_21rem]">
        <div className="space-y-5">
          <SettingsCard
            eyebrow="Banco"
            title="Supabase operacional"
            description="Cole a URL do projeto e a service role key. O app valida o acesso e, se o schema estiver aplicado, passa a persistir direto em Supabase."
          >
            <form action={saveDatabaseBootstrapAction} className="space-y-4">
              <Field
                label="Supabase URL"
                name="supabaseUrl"
                defaultValue={databaseSettings.supabaseUrl}
                placeholder="https://xxxx.supabase.co"
              />
              <Field
                label="Service role key"
                name="supabaseServiceRoleKey"
                defaultValue={databaseSettings.supabaseServiceRoleKey}
                placeholder="supabase service role key"
                type="password"
              />
              <SaveButton label="Salvar banco" />
            </form>
          </SettingsCard>

          <SettingsCard
            eyebrow="Workspace"
            title="Base pública e segurança do gateway"
            description="Esses valores definem a URL oficial da operação, a assinatura do gateway e a tolerância do webhook."
          >
            <form action={saveConnectionSettingsAction} className="space-y-4">
              <input type="hidden" name="scope" value="workspace" />
              <Field
                label="App base URL"
                name="appBaseUrl"
                defaultValue={runtimeSettings.appBaseUrl}
                placeholder="https://sua-url.com"
              />
              <Field
                label="Webhook secret"
                name="webhookSecret"
                defaultValue={runtimeSettings.webhookSecret}
                placeholder="shield_gateway_secret"
                type="password"
              />
              <Field
                label="Tolerância do webhook (segundos)"
                name="webhookToleranceSeconds"
                defaultValue={String(runtimeSettings.webhookToleranceSeconds)}
                placeholder="300"
                type="number"
              />
              <SaveButton />
            </form>
          </SettingsCard>

          <SettingsCard
            eyebrow="WhatsApp"
            title="Conecte sua operação de mensagens"
            description="Cloud API segue o fluxo oficial da Meta. Web API habilita sessão por QR Code, desde que o provider exponha endpoints de sessão compatíveis."
          >
            <form action={saveConnectionSettingsAction} className="space-y-4">
              <input type="hidden" name="scope" value="whatsapp" />
              <SelectField
                label="Provider"
                name="whatsappProvider"
                defaultValue={runtimeSettings.whatsappProvider}
                options={[
                  { label: "WhatsApp Cloud API", value: "cloud_api" },
                  { label: "WhatsApp Web API", value: "web_api" },
                ]}
              />
              <Field
                label="API base URL"
                name="whatsappApiBaseUrl"
                defaultValue={runtimeSettings.whatsappApiBaseUrl}
                placeholder="https://graph.facebook.com/v22.0"
              />
              <Field
                label="Access token"
                name="whatsappAccessToken"
                defaultValue={runtimeSettings.whatsappAccessToken}
                placeholder="token da API"
                type="password"
              />
              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label="Phone number ID"
                  name="whatsappPhoneNumberId"
                  defaultValue={runtimeSettings.whatsappPhoneNumberId}
                  placeholder="id do numero"
                />
                <Field
                  label="Business account ID"
                  name="whatsappBusinessAccountId"
                  defaultValue={runtimeSettings.whatsappBusinessAccountId}
                  placeholder="id da conta"
                />
              </div>
              <Field
                label="Webhook verify token"
                name="whatsappWebhookVerifyToken"
                defaultValue={runtimeSettings.whatsappWebhookVerifyToken}
                placeholder="token de verificação"
                type="password"
              />
              <SaveButton />
            </form>
          </SettingsCard>

          <SettingsCard
            eyebrow="QR"
            title="Sessão WhatsApp Web"
            description="Use este bloco quando o provider for Web API. O QR nasce, atualiza e desconecta por aqui."
          >
            {runtimeSettings.whatsappProvider !== "web_api" ? (
              <div className="rounded-xl border border-dashed border-black/10 px-4 py-5 text-sm text-[#717182]">
                Troque o provider para <span className="font-medium text-[#1a1a2e]">WhatsApp Web API</span> para habilitar conexão por QR.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <PlatformPill icon={QrCode}>
                    {describeQrStatus(whatsappSession.sessionStatus)}
                  </PlatformPill>
                  {whatsappSession.connectedPhone ? (
                    <PlatformPill>{whatsappSession.connectedPhone}</PlatformPill>
                  ) : null}
                </div>

                {whatsappSession.qrCode ? (
                  <div className="flex justify-center rounded-2xl border border-black/[0.06] bg-[#f8f8fa] p-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={whatsappSession.qrCode}
                      alt="QR Code do WhatsApp"
                      className="h-64 w-64 rounded-xl bg-white object-contain p-3 shadow-sm"
                    />
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-black/10 px-4 py-5 text-sm text-[#717182]">
                    Nenhum QR disponível ainda. Inicie ou atualize a sessão para receber um novo código.
                  </div>
                )}

                {whatsappSession.error ? (
                  <p className="text-sm text-red-500">{whatsappSession.error}</p>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  <form action={startWhatsAppQrSessionAction}>
                    <button className="inline-flex items-center gap-1.5 rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600">
                      <QrCode className="h-4 w-4" />
                      Gerar QR
                    </button>
                  </form>

                  <form action={refreshWhatsAppQrSessionAction}>
                    <button className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-[#1a1a2e] transition-colors hover:bg-[#f5f5f7]">
                      <RefreshCw className="h-4 w-4" />
                      Atualizar
                    </button>
                  </form>

                  <form action={disconnectWhatsAppQrSessionAction}>
                    <button className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-[#1a1a2e] transition-colors hover:bg-[#f5f5f7]">
                      <Unplug className="h-4 w-4" />
                      Desconectar
                    </button>
                  </form>
                </div>
              </div>
            )}
          </SettingsCard>

          <div className="grid gap-5 lg:grid-cols-2">
            <SettingsCard
              eyebrow="Email"
              title="Canal de email"
              description="Use este bloco para ativar lembretes por email e testes de envio."
            >
              <form action={saveConnectionSettingsAction} className="space-y-4">
                <input type="hidden" name="scope" value="email" />
                <Field
                  label="API key"
                  name="emailApiKey"
                  defaultValue={runtimeSettings.emailApiKey}
                  placeholder="sendgrid api key"
                  type="password"
                />
                <Field
                  label="From address"
                  name="emailFromAddress"
                  defaultValue={runtimeSettings.emailFromAddress}
                  placeholder="recovery@suaempresa.com"
                />
                <SaveButton />
              </form>
            </SettingsCard>

            <SettingsCard
              eyebrow="CRM"
              title="Shield Lead"
              description="Conecte a URL e a chave do CRM para sincronizar casos reais."
            >
              <form action={saveConnectionSettingsAction} className="space-y-4">
                <input type="hidden" name="scope" value="crm" />
                <Field
                  label="API URL"
                  name="crmApiUrl"
                  defaultValue={runtimeSettings.crmApiUrl}
                  placeholder="https://crm.exemplo.com/api"
                />
                <Field
                  label="API key"
                  name="crmApiKey"
                  defaultValue={runtimeSettings.crmApiKey}
                  placeholder="shield lead api key"
                  type="password"
                />
                <SaveButton />
              </form>
            </SettingsCard>
          </div>

          <SettingsCard
            eyebrow="AI"
            title="Camada de inteligência"
            description="Salve a chave da IA para ativar leitura e priorização assistida sem depender de variável de ambiente."
          >
            <form action={saveConnectionSettingsAction} className="space-y-4">
              <input type="hidden" name="scope" value="ai" />
              <Field
                label="OpenAI API key"
                name="openAiApiKey"
                defaultValue={runtimeSettings.openAiApiKey}
                placeholder="openai api key"
                type="password"
              />
              <SaveButton />
            </form>
          </SettingsCard>
        </div>

        <div className="space-y-4">
          <PlatformSurface className="p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-orange-500">
              Estado do runtime
            </p>
            <div className="mt-4 space-y-2">
              {integrations.map((item) => (
                <IntegrationLine key={item.title} item={item} />
              ))}
            </div>
          </PlatformSurface>

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
              <SideLine label="Import" value={`${runtimeSettings.appBaseUrl}/api/import`} />
            </div>
          </PlatformSurface>

          <PlatformSurface className="p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-orange-500">
              Persistência
            </p>
            <div className="mt-4 space-y-2">
              <PlatformPill icon={Database}>
                {runtimeSettings.databaseConfigured
                  ? "configurações salvas em Supabase"
                  : "configurações salvas no fallback local"}
              </PlatformPill>
              <p className="text-sm leading-6 text-[#717182]">
                Agora o banco também pode ser configurado pelo front. Para a
                troca funcionar, o projeto Supabase precisa já estar com o
                schema aplicado e aceitar a service role key informada.
              </p>
            </div>
          </PlatformSurface>
        </div>
      </section>
    </PlatformAppPage>
  );
}

function SettingsCard({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <PlatformSurface className="p-5">
      <p className="text-xs uppercase tracking-[0.18em] text-orange-500">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-xl font-semibold tracking-tight text-[#1a1a2e]">
        {title}
      </h2>
      <p className="mt-2 text-sm leading-6 text-[#717182]">{description}</p>
      <div className="mt-5">{children}</div>
    </PlatformSurface>
  );
}

function Field({
  label,
  name,
  defaultValue,
  placeholder,
  type = "text",
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  type?: "text" | "password" | "number";
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-[#1a1a2e]">{label}</span>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full rounded-xl border border-black/10 bg-[#f5f5f7] px-3.5 py-2.5 text-sm text-[#1a1a2e] outline-none placeholder:text-[#9ca3af] focus:border-orange-300 focus:ring-1 focus:ring-orange-200"
      />
    </label>
  );
}

function SelectField({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string;
  name: string;
  defaultValue: string;
  options: Array<{ label: string; value: string }>;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-[#1a1a2e]">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="w-full rounded-xl border border-black/10 bg-[#f5f5f7] px-3.5 py-2.5 text-sm text-[#1a1a2e] outline-none focus:border-orange-300 focus:ring-1 focus:ring-orange-200"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function SaveButton({ label = "Salvar configuração" }: { label?: string }) {
  return (
    <button className="inline-flex items-center gap-1.5 rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600">
      <Save className="h-4 w-4" />
      {label}
    </button>
  );
}

function IntegrationLine({ item }: { item: IntegrationStatus }) {
  return (
    <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-[#f5f5f7]">
      <item.icon className="h-4 w-4 text-[#9ca3af]" />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-[#1a1a2e]">{item.title}</p>
        <p className="text-xs text-[#717182]">{item.detail}</p>
      </div>
      <div
        className={`h-2.5 w-2.5 rounded-full ${
          item.active ? "bg-green-500" : "bg-[#d1d5db]"
        }`}
      />
    </div>
  );
}

function SideLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[0.68rem] uppercase tracking-[0.16em] text-[#9ca3af]">
        {label}
      </p>
      <p className="break-all text-sm leading-6 text-[#374151]">{value}</p>
    </div>
  );
}

function describeQrStatus(status: string) {
  if (status === "connected") return "WhatsApp conectado";
  if (status === "pending_qr") return "QR aguardando leitura";
  if (status === "expired") return "QR expirado";
  if (status === "error") return "Sessão com erro";
  return "Sessão desconectada";
}

function describeQrShortStatus(status: string) {
  if (status === "connected") return "conectado";
  if (status === "pending_qr") return "QR ativo";
  if (status === "expired") return "expirado";
  if (status === "error") return "erro";
  return "desligado";
}
