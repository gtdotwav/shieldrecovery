import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Database,
  Mail,
  MessageCircle,
  PlayCircle,
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
  saveSellerAiGuidanceAction,
  startWhatsAppQrSessionAction,
} from "@/app/actions/connect-actions";
import {
  PlatformAppPage,
  PlatformMetricCard,
  PlatformPill,
  PlatformSurface,
} from "@/components/platform/platform-shell";
import { CopyButton } from "@/components/ui/copy-button";
import { formatRelativeTime } from "@/lib/format";
import { platformBrand } from "@/lib/platform";
import { getSellerIdentityByEmail } from "@/server/auth/identities";
import { requireAuthenticatedSession } from "@/server/auth/session";
import { appEnv } from "@/server/recovery/config";
import { getConnectionSettingsService } from "@/server/recovery/services/connection-settings-service";
import { MessagingService } from "@/server/recovery/services/messaging-service";
import { getPlatformBootstrapService } from "@/server/recovery/services/platform-bootstrap-service";
import { getPaymentRecoveryService } from "@/server/recovery/services/payment-recovery-service";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Integrações | PagRecovery",
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
  const session = await requireAuthenticatedSession(["admin", "seller"]);
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
    whatsappDiagnostics,
    sellerIdentity,
  ] = await Promise.all([
    service.getRecoveryAnalytics(),
    service.getFollowUpContacts(),
    messaging.getInboxSnapshot(),
    settingsService.getRuntimeSettings(),
    service.getHealthSummary(),
    Promise.resolve(bootstrap.getSettings()),
    messaging.getWhatsAppConnectionSnapshot(),
    messaging.getWhatsAppDiagnostics(),
    session.role === "seller" ? getSellerIdentityByEmail(session.email) : Promise.resolve(null),
  ]);
  const sellerWebhookSnapshot =
    session.role === "seller"
      ? await service.getSellerWebhookSnapshot(
          sellerIdentity?.agentName ?? sellerIdentity?.displayName ?? session.email,
        )
      : null;
  const sellerControl =
    session.role === "seller"
      ? await service.getSellerAdminControlForName(
          sellerIdentity?.agentName ?? sellerIdentity?.displayName ?? session.email,
        )
      : null;

  const contactableLeads = contacts.filter(
    (contact) =>
      (contact.phone && contact.phone !== "not_provided") ||
      (contact.email && contact.email !== "unknown@pagrecovery.local"),
  ).length;

  const integrations: IntegrationStatus[] = [
    {
      title: platformBrand.gateway.name,
      active: health.integrations.pagouai,
      detail: health.integrations.pagouai
        ? appEnv.pagouAiCardConfigured
          ? "Pix ativo e public key pronta para checkout card"
          : "Pix direto ativo; public key opcional para checkout card"
        : "Defina PAGOUAI_SECRET_KEY no ambiente",
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
      active: whatsappDiagnostics.ready,
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
      title: "CRM Integrado",
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
    {
      title: "Worker",
      active: runtimeSettings.workerConfigured,
      detail: runtimeSettings.workerCronConfigured
        ? "Cron protegido por secret ativo"
        : runtimeSettings.workerExecutorConfigured
          ? "Executor manual pronto"
          : "Cron e executor ainda pendentes",
      icon: PlayCircle,
    },
  ];

  const activeCount = integrations.filter((item) => item.active).length;
  const isWebApiOnCloudUrl =
    runtimeSettings.whatsappProvider === "web_api" &&
    /graph\.facebook\.com/i.test(runtimeSettings.whatsappApiBaseUrl);

  if (session.role === "seller") {
    return (
      <SellerConnectView
        activeCount={activeCount}
        analyticsTotal={analytics.total_failed_payments}
        runtimeSettings={runtimeSettings}
        health={health}
        whatsappSessionStatus={whatsappSession.sessionStatus}
        integrations={integrations}
        sellerDisplayName={sellerIdentity?.displayName ?? sellerIdentity?.agentName ?? "Seller"}
        sellerWebhookUrl={await service.getGatewayWebhookUrlForSeller(
          sellerIdentity?.agentName ?? sellerIdentity?.displayName ?? session.email,
        )}
        sellerWebhookSnapshot={sellerWebhookSnapshot}
        sellerAiGuidance={sellerControl?.notes ?? ""}
      />
    );
  }

  return (
    <PlatformAppPage
      currentPath="/connect"
      action={
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 rounded-full bg-sky-500 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-sky-600"
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
          value={`${activeCount}/7`}
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

      <PlatformSurface className="mt-5 p-5 sm:p-6">
        <div className="grid gap-5 border-b border-black/[0.06] pb-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(17rem,0.8fr)] lg:items-end">
          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-sky-500">
              Setup da plataforma
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#111827] sm:text-[1.95rem]">
              Conecte o núcleo da operação.
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6b7280]">
              Banco, Pagou.ai, WhatsApp, CRM e IA ficam aqui. A ideia é
              simples: configurar o que pode viver no runtime e deixar as
              chaves críticas do gateway prontas para white label via ambiente.
            </p>
          </div>

          <div className="rounded-xl border border-black/[0.06] bg-[#fbfbfc] px-4 py-4 text-sm leading-6 text-[#6b7280]">
            Ordem ideal: banco, Pagou.ai, WhatsApp e IA.
          </div>
        </div>
      </PlatformSurface>

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
            description="Cole a URL do projeto e a service role key. Se o schema já estiver aplicado, a persistência troca para Supabase."
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
            title="Base pública e compatibilidade"
            description="URL oficial da operação e parâmetros do webhook legado de compatibilidade."
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
                placeholder="legacy_webhook_secret"
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
            eyebrow="Gateway"
            title={`${platformBrand.gateway.name} v2`}
            description="Este clone usa a API v2 da Pagou.ai para Pix de recovery e reconciliacao de webhooks."
          >
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <PlatformPill icon={CreditCard}>
                  {appEnv.pagouAiConfigured
                    ? "secret key carregada"
                    : "secret key pendente"}
                </PlatformPill>
                <PlatformPill icon={QrCode}>
                  {appEnv.pagouAiCardConfigured
                    ? "public key disponivel"
                    : "checkout card opcional"}
                </PlatformPill>
                <PlatformPill>
                  {appEnv.pagouAiEnvironment === "sandbox"
                    ? "ambiente sandbox"
                    : "ambiente producao"}
                </PlatformPill>
              </div>

              <div className="rounded-[1rem] border border-black/[0.06] bg-[#fbfbfc] px-4 py-4 text-sm leading-6 text-[#6b7280]">
                Pix ja cria transacao direto em <code>/v2/transactions</code> e
                o webhook reconcilia a cobranca com <code>GET /v2/transactions/{"{id}"}</code>
                quando faltar contexto no payload. Para habilitar cartao no
                checkout hospedado da Pagou.ai, mantenha tambem a public key no ambiente.
              </div>

              <div className="rounded-[1rem] border border-dashed border-black/[0.08] px-4 py-4 text-sm leading-6 text-[#6b7280]">
                Variaveis esperadas: <code>PAGOUAI_SECRET_KEY</code>,{" "}
                <code>PAGOUAI_ENVIRONMENT</code>, <code>PAGOUAI_API_BASE_URL</code>{" "}
                (opcional) e <code>NEXT_PUBLIC_PAGOUAI_PUBLIC_KEY</code> para card.
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href={platformBrand.gateway.docsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.08] bg-white px-3 py-1.5 text-xs font-medium text-[#4b5563] transition-colors hover:bg-[#f5f5f7] hover:text-[#111827]"
                >
                  Docs atuais
                </Link>
                <Link
                  href={platformBrand.gateway.legacyDocsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.08] bg-white px-3 py-1.5 text-xs font-medium text-[#4b5563] transition-colors hover:bg-[#f5f5f7] hover:text-[#111827]"
                >
                  Docs legados
                </Link>
              </div>
            </div>
          </SettingsCard>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,0.9fr)]">
            <SettingsCard
              eyebrow="WhatsApp"
              title="Conecte sua operação de mensagens"
              description="Cloud API segue o fluxo oficial da Meta. Para QR Code, use um provider Web API compatível."
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
                  placeholder={
                    runtimeSettings.whatsappProvider === "web_api"
                      ? "https://seu-provider-whatsapp-web.com"
                      : "https://graph.facebook.com/v22.0"
                  }
                />
                <Field
                  label={
                    runtimeSettings.whatsappProvider === "web_api"
                      ? "API key / access token"
                      : "Access token"
                  }
                  name="whatsappAccessToken"
                  defaultValue={runtimeSettings.whatsappAccessToken}
                  placeholder="token da API"
                  type="password"
                />
                {runtimeSettings.whatsappProvider === "web_api" ? (
                  <Field
                    label="Session ID"
                    name="whatsappWebSessionId"
                    defaultValue={runtimeSettings.whatsappWebSessionId}
                    placeholder={platformBrand.slug}
                  />
                ) : null}
                <div className="grid gap-4 md:grid-cols-2">
                  <Field
                    label="Phone number ID"
                    name="whatsappPhoneNumberId"
                    defaultValue={runtimeSettings.whatsappPhoneNumberId}
                    placeholder={
                      runtimeSettings.whatsappProvider === "web_api"
                        ? "opcional para providers próprios"
                        : "id do numero"
                    }
                  />
                  <Field
                    label="Business account ID"
                    name="whatsappBusinessAccountId"
                    defaultValue={runtimeSettings.whatsappBusinessAccountId}
                    placeholder={
                      runtimeSettings.whatsappProvider === "web_api"
                        ? "opcional para providers próprios"
                        : "id da conta"
                    }
                  />
                </div>
                <Field
                  label="Webhook verify token"
                  name="whatsappWebhookVerifyToken"
                  defaultValue={runtimeSettings.whatsappWebhookVerifyToken}
                  placeholder="token de verificação"
                  type="password"
                />
                {runtimeSettings.whatsappProvider === "web_api" ? (
                  <div className="rounded-[1rem] border border-black/[0.06] bg-[#fbfbfc] px-4 py-3 text-sm leading-6 text-[#6b7280]">
                    Para QR, use a URL do seu provider WhatsApp Web. Se a URL da
                    Meta continuar aqui, a sessão não vai nascer.
                  </div>
                ) : null}
                {isWebApiOnCloudUrl ? (
                  <p className="text-sm text-red-500">
                    A URL atual ainda é da Cloud API da Meta. Troque para a URL do seu provider WhatsApp Web para gerar QR.
                  </p>
                ) : null}
                {whatsappDiagnostics.missingFields.length > 0 ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-700">
                    Faltando para ativar: {whatsappDiagnostics.missingFields.join(", ")}.
                  </div>
                ) : null}
                <SaveButton />
              </form>
            </SettingsCard>

            <SettingsCard
              eyebrow="QR"
              title="Sessão WhatsApp Web"
              description="Use este bloco quando o provider for Web API. O QR nasce, atualiza e desconecta por aqui."
            >
              {runtimeSettings.whatsappProvider !== "web_api" ? (
                    <div className="rounded-[1rem] border border-dashed border-black/[0.08] px-4 py-5 text-sm text-[#6b7280]">
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
                    <div className="flex justify-center rounded-xl border border-black/[0.06] bg-[#f8f9fb] p-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={whatsappSession.qrCode}
                        alt="QR Code do WhatsApp"
                        className="h-64 w-64 rounded-xl bg-white object-contain p-3 shadow-sm"
                      />
                    </div>
                  ) : (
                    <div className="rounded-[1rem] border border-dashed border-black/[0.08] px-4 py-5 text-sm text-[#6b7280]">
                      Nenhum QR disponível. Gere ou atualize a sessão para receber um novo código.
                    </div>
                  )}

                  {whatsappSession.error ? (
                    <p className="text-sm text-red-500">{whatsappSession.error}</p>
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    <form action={startWhatsAppQrSessionAction}>
                      <button className="inline-flex items-center gap-1.5 rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-600">
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
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <SettingsCard
              eyebrow="Email"
              title="Canal de email"
            description="Ative lembretes por email e testes de envio."
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
              title={platformBrand.crm.name}
              description="Conecte a URL e a chave do seu CRM para sincronizar casos reais."
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
                  placeholder="crm api key"
                  type="password"
                />
                <SaveButton />
              </form>
            </SettingsCard>
          </div>

          <SettingsCard
            eyebrow="AI"
            title="Camada de inteligência"
            description="Salve a chave da IA para ativar leitura, copy e automação assistida."
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
            <SectionHeader eyebrow="Estado do runtime" title="Leitura rápida do que já está ativo." compact />
            <div className="mt-4 space-y-2">
              {integrations.map((item) => (
                <IntegrationLine key={item.title} item={item} />
              ))}
            </div>
          </PlatformSurface>

          <PlatformSurface className="p-4">
            <SectionHeader eyebrow="Endpoints oficiais" title="URLs públicas da operação." compact />
            <div className="mt-4 space-y-3">
              <SideLine label={`${platformBrand.gateway.name} webhook`} value={health.webhook_url} />
              <SideLine
                label="WhatsApp webhook"
                value={health.whatsapp_webhook_url}
              />
              <SideLine label="Worker executor" value={health.worker_url} />
              <SideLine label="Import" value={`${runtimeSettings.appBaseUrl}/api/import`} />
            </div>
          </PlatformSurface>

          <PlatformSurface className="p-4">
            <SectionHeader eyebrow="Persistência e automação" title="Banco e execução contínua." compact />
            <div className="mt-4 space-y-3">
              <SideLine
                label="Banco"
                value={
                  runtimeSettings.databaseConfigured
                    ? "Supabase operacional"
                    : "fallback local ativo"
                }
              />
              <SideLine
                label="Worker"
                value={
                  runtimeSettings.workerConfigured
                    ? runtimeSettings.workerCronConfigured
                      ? "cron ativo"
                      : "executor manual pronto"
                    : "não habilitado"
                }
              />
            </div>
            <p className="mt-3 text-sm leading-6 text-[#717182]">
              Se o cron já estiver ativo, o worker cuida do follow-up contínuo.
            </p>
          </PlatformSurface>

          <PlatformSurface className="p-4">
            <SectionHeader eyebrow="Diagnóstico do WhatsApp" title="Estado atual do canal." compact />
            <div className="mt-4 space-y-3">
              <SideLine
                label="Estado do canal"
                value={whatsappDiagnostics.ready ? "pronto" : "incompleto"}
              />
              <SideLine
                label="Modo"
                value={whatsappDiagnostics.qrSupported ? "QR suportado" : "Cloud API oficial"}
              />
              <SideLine label="Webhook do canal" value={whatsappDiagnostics.webhookUrl} />
              <SideLine
                label="Sessão"
                value={describeQrStatus(whatsappDiagnostics.sessionStatus)}
              />
            </div>
            {whatsappDiagnostics.missingFields.length > 0 ? (
              <p className="mt-3 text-sm leading-6 text-[#717182]">
                Campos pendentes: {whatsappDiagnostics.missingFields.join(", ")}.
              </p>
            ) : null}
            {whatsappDiagnostics.warnings.length > 0 ? (
              <div className="mt-3 space-y-2">
                {whatsappDiagnostics.warnings.map((warning) => (
                  <p key={warning} className="text-sm leading-6 text-amber-700">
                    {warning}
                  </p>
                ))}
              </div>
            ) : null}
          </PlatformSurface>
        </div>
      </section>
    </PlatformAppPage>
  );
}

function SellerConnectView({
  activeCount,
  analyticsTotal,
  runtimeSettings,
  health,
  whatsappSessionStatus,
  integrations,
  sellerDisplayName,
  sellerWebhookUrl,
  sellerWebhookSnapshot,
  sellerAiGuidance,
}: {
  activeCount: number;
  analyticsTotal: number;
  runtimeSettings: {
    appBaseUrl: string;
    databaseConfigured: boolean;
    databaseMode: string;
    whatsappProvider: string;
    workerConfigured: boolean;
    workerExecutorConfigured: boolean;
    workerCronConfigured: boolean;
  };
  health: {
    webhook_url: string;
    whatsapp_webhook_url: string;
    worker_url: string;
    required_headers: string[];
    integrations: {
      pagouai: boolean;
      whatsapp: boolean;
      email: boolean;
      crm: boolean;
      ai: boolean;
    };
  };
  whatsappSessionStatus: string;
  integrations: IntegrationStatus[];
  sellerDisplayName: string;
  sellerWebhookUrl: string;
  sellerWebhookSnapshot: {
    eventCount: number;
    processedCount: number;
    failedCount: number;
    pendingCount: number;
    lastReceivedAt?: string;
    lastEventType?: string;
    lastError?: string;
    status: "idle" | "healthy" | "attention";
  } | null;
  sellerAiGuidance: string;
}) {
  return (
    <PlatformAppPage
      currentPath="/connect"
      action={
        <Link
          href="/leads"
          className="inline-flex items-center gap-1.5 rounded-full bg-sky-500 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-sky-600"
        >
          Abrir CRM
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      }
    >
      <section className="grid gap-3 sm:grid-cols-3">
        <PlatformMetricCard
          icon={CheckCircle2}
          label="integrações visíveis"
          value={`${activeCount}/7`}
          subtitle="estado atual da operação"
        />
        <PlatformMetricCard
          icon={CreditCard}
          label="eventos recebidos"
          value={analyticsTotal.toString()}
          subtitle="volume já processado pelo gateway"
        />
        <PlatformMetricCard
          icon={runtimeSettings.whatsappProvider === "web_api" ? QrCode : MessageCircle}
          label="WhatsApp"
          value={
            runtimeSettings.whatsappProvider === "web_api"
              ? describeQrShortStatus(whatsappSessionStatus)
              : health.integrations.whatsapp
                ? "ativo"
                : "pendente"
          }
          subtitle="leitura operacional do canal"
        />
      </section>

      <PlatformSurface className="mt-5 p-5 sm:p-6">
        <div className="grid gap-5 border-b border-black/[0.06] pb-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(17rem,0.8fr)] lg:items-end">
          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-sky-500">
              Integrações para seller
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#111827] sm:text-[1.95rem]">
              Aqui você pega as URLs da sua operação.
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6b7280]">
              Este seller recebe um webhook proprio para conectar na{" "}
              {platformBrand.gateway.name} sem misturar trafego com o restante
              da operacao. Chaves e credenciais continuam com o admin.
            </p>
          </div>

          <div className="rounded-xl border border-black/[0.06] bg-[#fbfbfc] px-4 py-4 text-sm leading-6 text-[#6b7280]">
            Seller vinculado: <span className="font-medium text-[#1a1a2e]">{sellerDisplayName}</span>
          </div>
        </div>
      </PlatformSurface>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_21rem]">
        <div className="space-y-5">
          <PlatformSurface className="p-5">
            <SectionHeader eyebrow="Webhook do seller" title={`URL exclusiva para a ${platformBrand.gateway.name} desta operacao.`} />
            <div className="mt-4 rounded-2xl border border-black/[0.06] bg-[#f8f8fa] px-4 py-4">
              <p className="break-all text-sm leading-7 text-[#1a1a2e]">
                {sellerWebhookUrl}
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <CopyButton value={sellerWebhookUrl} />
              <Link
                href={sellerWebhookUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.08] bg-white px-3 py-1.5 text-xs font-medium text-[#4b5563] transition-colors hover:bg-[#f5f5f7] hover:text-[#111827]"
              >
                Ver endpoint
              </Link>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <SideLine label="App base URL" value={runtimeSettings.appBaseUrl} />
              <SideLine label="WhatsApp webhook" value={health.whatsapp_webhook_url} />
              <SideLine label="Worker executor" value={health.worker_url} />
              <SideLine label="Escopo" value={`Eventos entram direto para ${sellerDisplayName}`} />
            </div>
          </PlatformSurface>

          <PlatformSurface className="p-5">
            <SectionHeader eyebrow="Formato minimo" title="O que o endpoint espera receber." />
            <div className="mt-4 flex flex-wrap gap-2">
              {health.required_headers.map((header) => (
                <PlatformPill key={header}>{header}</PlatformPill>
              ))}
            </div>
            <p className="mt-4 text-sm leading-6 text-[#717182]">
              Nesta base, a reconciliacao principal da {platformBrand.gateway.name} usa o id
              do evento ou da transacao no proprio payload. O seller so precisa
              apontar a URL correta e manter o envio em JSON.
            </p>
          </PlatformSurface>

          <PlatformSurface className="p-5">
            <SectionHeader
              eyebrow="Direção da IA"
              title="Defina o contexto que a IA deve seguir nas suas conversas."
            />
            <form action={saveSellerAiGuidanceAction} className="mt-4 space-y-4">
              <TextareaField
                label="Briefing do seller"
                name="sellerAiGuidance"
                defaultValue={sellerAiGuidance}
                placeholder="Ex.: priorize linguagem premium, nao ofereca desconto, reforce urgencia leve, fale como especialista do produto e mantenha tom consultivo."
              />
              <p className="text-sm leading-6 text-[#717182]">
                Use este campo para orientar tom, abordagem comercial, limites e contexto
                operacional. A IA segue esta direcao sem quebrar as regras de envio.
              </p>
              <SaveButton label="Salvar direção da IA" />
            </form>
          </PlatformSurface>
        </div>

        <div className="space-y-4">
          <PlatformSurface className="p-4">
            <SectionHeader eyebrow="Estado do runtime" title="Leitura rápida do ambiente." compact />
            <div className="mt-4 space-y-2">
              {integrations.map((item) => (
                <IntegrationLine key={item.title} item={item} />
              ))}
            </div>
          </PlatformSurface>

          <PlatformSurface className="p-4">
            <SectionHeader eyebrow="Saúde do webhook" title="Se a operação já começou a chegar aqui." compact />
            <div className="mt-4 space-y-3">
              <PlatformPill>
                {sellerWebhookSnapshot?.status === "healthy"
                  ? "recebendo eventos"
                  : sellerWebhookSnapshot?.status === "attention"
                    ? "com atenção"
                    : "aguardando primeiro evento"}
              </PlatformPill>
              <div className="space-y-2">
                <SideLine
                  label="Eventos recebidos"
                  value={String(sellerWebhookSnapshot?.eventCount ?? 0)}
                />
                <SideLine
                  label="Processados"
                  value={String(sellerWebhookSnapshot?.processedCount ?? 0)}
                />
                <SideLine
                  label="Pendentes"
                  value={String(sellerWebhookSnapshot?.pendingCount ?? 0)}
                />
                <SideLine
                  label="Falhas"
                  value={String(sellerWebhookSnapshot?.failedCount ?? 0)}
                />
                <SideLine
                  label="Último evento"
                  value={
                    sellerWebhookSnapshot?.lastReceivedAt
                      ? `${sellerWebhookSnapshot.lastEventType ?? "evento"} · ${formatRelativeTime(
                          sellerWebhookSnapshot.lastReceivedAt,
                        )}`
                      : "ainda não recebido"
                  }
                />
              </div>
              {sellerWebhookSnapshot?.lastError ? (
                <p className="text-sm leading-6 text-amber-700">
                  Último erro: {sellerWebhookSnapshot.lastError}
                </p>
              ) : null}
            </div>
          </PlatformSurface>

          <PlatformSurface className="p-4">
            <SectionHeader eyebrow="Persistência" title="Onde a operação está gravando." compact />
            <div className="mt-4 space-y-2">
              <PlatformPill icon={Database}>
                {runtimeSettings.databaseConfigured
                  ? `runtime em ${runtimeSettings.databaseMode}`
                  : "runtime sem banco configurado"}
              </PlatformPill>
              <p className="text-sm leading-6 text-[#717182]">
                Se precisar mudar banco, token, provider ou qualquer chave, peça ao admin.
              </p>
            </div>
          </PlatformSurface>

          <PlatformSurface className="p-4">
            <SectionHeader eyebrow="Automação contínua" title="Estado do worker." compact />
            <div className="mt-4 space-y-2">
              <PlatformPill icon={PlayCircle}>
                {runtimeSettings.workerConfigured
                  ? runtimeSettings.workerCronConfigured
                    ? "cron ativo"
                    : "executor manual pronto"
                  : "ainda não habilitada"}
              </PlatformPill>
              <p className="text-sm leading-6 text-[#717182]">
                O seller pode copiar a URL do worker para testes controlados. O token técnico continua com o admin.
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
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-sky-500">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-[1.15rem] font-semibold tracking-tight text-[#111827]">
        {title}
      </h2>
      <p className="mt-2 text-sm leading-6 text-[#6b7280]">{description}</p>
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
      <span className="text-[0.78rem] font-semibold uppercase tracking-[0.12em] text-[#6b7280]">{label}</span>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full rounded-[0.95rem] border border-black/[0.08] bg-white px-3.5 py-2.5 text-sm text-[#111827] outline-none placeholder:text-[#9ca3af] transition-colors focus:border-sky-300 focus:ring-1 focus:ring-sky-100"
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
      <span className="text-[0.78rem] font-semibold uppercase tracking-[0.12em] text-[#6b7280]">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="w-full rounded-[0.95rem] border border-black/[0.08] bg-white px-3.5 py-2.5 text-sm text-[#111827] outline-none transition-colors focus:border-sky-300 focus:ring-1 focus:ring-sky-100"
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

function TextareaField({
  label,
  name,
  defaultValue,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-[0.78rem] font-semibold uppercase tracking-[0.12em] text-[#6b7280]">
        {label}
      </span>
      <textarea
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        rows={6}
        className="w-full rounded-[0.95rem] border border-black/[0.08] bg-white px-3.5 py-3 text-sm leading-6 text-[#111827] outline-none placeholder:text-[#9ca3af] transition-colors focus:border-sky-300 focus:ring-1 focus:ring-sky-100"
      />
    </label>
  );
}

function SaveButton({ label = "Salvar configuração" }: { label?: string }) {
  return (
    <button className="inline-flex items-center gap-1.5 rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-600">
      <Save className="h-4 w-4" />
      {label}
    </button>
  );
}

function IntegrationLine({ item }: { item: IntegrationStatus }) {
  return (
    <div className="flex items-center gap-3 rounded-[1rem] border border-black/[0.05] bg-[#fafafa] px-3 py-3">
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

function SectionHeader({
  eyebrow,
  title,
  compact = false,
}: {
  eyebrow: string;
  title: string;
  compact?: boolean;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.18em] text-sky-500">{eyebrow}</p>
      <h3
        className={
          compact
            ? "mt-2 text-sm font-semibold text-[#111827]"
            : "mt-2 text-xl font-semibold tracking-tight text-[#111827]"
        }
      >
        {title}
      </h3>
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
