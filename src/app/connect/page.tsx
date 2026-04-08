import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  CreditCard,
  Database,
  KeyRound,
  Mail,
  MessageCircle,
  PlayCircle,
  QrCode,
  RefreshCw,
  Save,
  Brain,
  Link2,
  Trash2,
  Unplug,
  UserPlus,
  UsersRound,
} from "lucide-react";

import { UNKNOWN_EMAIL, NOT_PROVIDED } from "@/lib/contact";
import { saveSellerGatewayKeyAction } from "@/app/actions/admin-actions";
import {
  createAffiliateLinkAction,
  deactivateAffiliateLinkAction,
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
import { platformBrand, resolveGateway } from "@/lib/platform";
import { getSellerIdentityByEmail } from "@/server/auth/identities";
import { requireAuthenticatedSession } from "@/server/auth/session";
import { appEnv } from "@/server/recovery/config";
import { getConnectionSettingsService } from "@/server/recovery/services/connection-settings-service";
import { MessagingService } from "@/server/recovery/services/messaging-service";
import { getPlatformBootstrapService } from "@/server/recovery/services/platform-bootstrap-service";
import { getPaymentRecoveryService } from "@/server/recovery/services/payment-recovery-service";

export const revalidate = 30;

export const metadata = {
  title: "Integrações",
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
  const session = await requireAuthenticatedSession(["admin", "seller", "market"]);
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
  const sellerAgentKey =
    sellerIdentity?.agentName ?? sellerIdentity?.displayName ?? session.email;
  const [affiliateLinks, affiliateStats] =
    session.role === "seller"
      ? await Promise.all([
          service.listAffiliateLinks(sellerAgentKey),
          service.getAffiliateStats(sellerAgentKey),
        ])
      : [[], null];

  const contactableLeads = contacts.filter(
    (contact) =>
      (contact.phone && contact.phone !== NOT_PROVIDED) ||
      (contact.email && contact.email !== UNKNOWN_EMAIL),
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
      icon: Brain,
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
    const sellerWhitelabel = sellerControl?.whitelabelId
      ? await service.getWhitelabelProfile(sellerControl.whitelabelId)
      : undefined;
    return (
      <SellerConnectView
        activeCount={activeCount}
        analyticsTotal={analytics.total_failed_payments}
        runtimeSettings={runtimeSettings}
        health={health}
        whatsappSessionStatus={whatsappSession.sessionStatus}
        whatsappSession={whatsappSession}
        integrations={integrations}
        sellerDisplayName={sellerIdentity?.displayName ?? sellerIdentity?.agentName ?? "Seller"}
        sellerWebhookUrl={await service.getGatewayWebhookUrlForSeller(
          sellerIdentity?.agentName ?? sellerIdentity?.displayName ?? session.email,
        )}
        sellerWebhookSnapshot={sellerWebhookSnapshot}
        sellerAiGuidance={sellerControl?.notes ?? ""}
        sellerGatewayName={resolveGateway(sellerControl?.gatewaySlug).name}
        sellerKey={sellerControl?.sellerKey ?? ""}
        sellerGatewayApiKey={sellerControl?.gatewayApiKey ?? ""}
        sellerWhitelabelId={sellerControl?.whitelabelId ?? ""}
        sellerWhitelabelName={sellerWhitelabel?.name}
        sellerWhitelabelProvider={sellerWhitelabel?.gatewayProvider}
        affiliateLinks={affiliateLinks}
        affiliateStats={affiliateStats}
        appBaseUrl={runtimeSettings.appBaseUrl}
      />
    );
  }

  return (
    <PlatformAppPage
      currentPath="/connect"
      action={
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 rounded-full bg-green-600 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-green-700"
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
          {/* WhatsApp — seção principal */}
          <PlatformSurface className="p-5">
            <SectionHeader eyebrow="WhatsApp" title="Conecte o canal de mensagens." />
            {runtimeSettings.whatsappProvider === "web_api" ? (
              <div className="mt-4 space-y-4">
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
                    Nenhum QR disponível. Gere um novo código para escanear.
                  </div>
                )}

                {whatsappSession.error ? (
                  <p className="text-sm text-red-500">{whatsappSession.error}</p>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  <form action={startWhatsAppQrSessionAction}>
                    <button className="inline-flex items-center gap-1.5 rounded-full bg-green-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700">
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
            ) : (
              <div className="mt-4 space-y-4">
                <PlatformPill icon={MessageCircle}>
                  {runtimeSettings.whatsappConfigured
                    ? `Cloud API ativa · ${inbox.conversations.length} conversas`
                    : "Provider pendente"}
                </PlatformPill>
                <p className="text-sm leading-6 text-[#717182]">
                  Para usar QR Code, troque o provider para Web API nas configurações abaixo.
                </p>
              </div>
            )}
          </PlatformSurface>

          {/* Endpoints */}
          <PlatformSurface className="p-5">
            <SectionHeader eyebrow="Endpoints" title="URLs da operação." />
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <SideLine label={`${platformBrand.gateway.name} webhook`} value={health.webhook_url} />
              <SideLine label="WhatsApp webhook" value={health.whatsapp_webhook_url} />
              <SideLine label="Worker executor" value={health.worker_url} />
              <SideLine label="Import" value={`${runtimeSettings.appBaseUrl}/api/import`} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <CopyButton value={health.webhook_url} />
              <Link
                href="/connect/docs"
                className="inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-white px-4 py-2 text-sm font-medium text-[#4b5563] transition-colors hover:bg-[#f5f5f7] hover:text-[#111827]"
              >
                <BookOpen className="h-4 w-4" />
                Documentação da API
              </Link>
            </div>
          </PlatformSurface>

          {/* Gateway */}
          <PlatformSurface className="p-5">
            <SectionHeader eyebrow="Gateway" title={`${platformBrand.gateway.name}`} />
            <div className="mt-4 flex flex-wrap gap-2">
              <PlatformPill icon={CreditCard}>
                {appEnv.pagouAiConfigured ? "secret key carregada" : "secret key pendente"}
              </PlatformPill>
              <PlatformPill icon={QrCode}>
                {appEnv.pagouAiCardConfigured ? "public key ativa" : "card opcional"}
              </PlatformPill>
              <PlatformPill>
                {appEnv.pagouAiEnvironment === "sandbox" ? "sandbox" : "producao"}
              </PlatformPill>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
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
          </PlatformSurface>

          {/* Configurações avançadas — colapsável */}
          <AdminAdvancedSettings
            runtimeSettings={runtimeSettings}
            databaseSettings={databaseSettings}
            whatsappDiagnostics={whatsappDiagnostics}
            isWebApiOnCloudUrl={isWebApiOnCloudUrl}
          />
        </div>

        <div className="space-y-4">
          <PlatformSurface className="p-4">
            <SectionHeader eyebrow="Estado do runtime" title="Integrações ativas." compact />
            <div className="mt-4 space-y-2">
              {integrations.map((item) => (
                <IntegrationLine key={item.title} item={item} />
              ))}
            </div>
          </PlatformSurface>

          <PlatformSurface className="p-4">
            <SectionHeader eyebrow="Persistência" title="Banco e automação." compact />
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
          </PlatformSurface>

          <PlatformSurface className="p-4">
            <SectionHeader eyebrow="WhatsApp" title="Diagnóstico." compact />
            <div className="mt-4 space-y-3">
              <SideLine
                label="Canal"
                value={whatsappDiagnostics.ready ? "pronto" : "incompleto"}
              />
              <SideLine
                label="Modo"
                value={whatsappDiagnostics.qrSupported ? "QR suportado" : "Cloud API"}
              />
              <SideLine
                label="Sessão"
                value={describeQrStatus(whatsappDiagnostics.sessionStatus)}
              />
            </div>
            {whatsappDiagnostics.missingFields.length > 0 ? (
              <p className="mt-3 text-sm leading-6 text-[#717182]">
                Pendentes: {whatsappDiagnostics.missingFields.join(", ")}.
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
  whatsappSession,
  integrations,
  sellerDisplayName,
  sellerWebhookUrl,
  sellerWebhookSnapshot,
  sellerAiGuidance,
  sellerGatewayName,
  sellerKey,
  sellerGatewayApiKey,
  sellerWhitelabelId,
  sellerWhitelabelName,
  sellerWhitelabelProvider,
  affiliateLinks,
  affiliateStats,
  appBaseUrl,
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
  whatsappSession: {
    sessionStatus: string;
    qrCode?: string;
    connectedPhone?: string;
    error?: string;
  };
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
  sellerGatewayName: string;
  sellerKey: string;
  sellerGatewayApiKey: string;
  sellerWhitelabelId: string;
  sellerWhitelabelName?: string;
  sellerWhitelabelProvider?: string;
  affiliateLinks: Array<{
    id: string;
    code: string;
    label?: string;
    commissionPct: number;
    clicks: number;
    active: boolean;
    createdAt: string;
  }>;
  affiliateStats: {
    totalLinks: number;
    totalClicks: number;
    totalSignups: number;
    activeReferrals: number;
    pendingReferrals: number;
  } | null;
  appBaseUrl: string;
}) {
  return (
    <PlatformAppPage
      currentPath="/connect"
      action={
        <Link
          href="/leads"
          className="inline-flex items-center gap-1.5 rounded-full bg-green-600 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-green-700"
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
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-green-600">
              Integrações para seller
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#111827] sm:text-[1.95rem]">
              Aqui você pega as URLs da sua operação.
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6b7280]">
              Este seller recebe um webhook proprio para conectar na{" "}
              {sellerGatewayName} sem misturar trafego com o restante
              da operacao. Basta enviar ao dev a URL do webhook abaixo.
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
            <SectionHeader eyebrow="Webhook do seller" title={`URL exclusiva para a ${sellerGatewayName} desta operação.`} />
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
            <SectionHeader eyebrow="Documentação" title="Tudo que seu dev precisa para integrar." />
            <p className="mt-3 text-sm leading-6 text-[#717182]">
              A documentação completa da API explica como disparar webhooks, o formato dos payloads,
              os eventos suportados e como a plataforma processa cada transação automaticamente.
            </p>
            <div className="mt-4">
              <Link
                href="/connect/docs"
                className="inline-flex items-center gap-2 rounded-full bg-green-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-700"
              >
                <BookOpen className="h-4 w-4" />
                Abrir documentação da API
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </PlatformSurface>

          <PlatformSurface className="p-5">
            <SectionHeader
              eyebrow="Gateway de pagamento"
              title="Cole a API key do seu provedor para sincronizar."
            />
            {sellerWhitelabelName ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <PlatformPill icon={KeyRound}>
                  Perfil: {sellerWhitelabelName}
                </PlatformPill>
                {sellerWhitelabelProvider ? (
                  <PlatformPill>{sellerWhitelabelProvider}</PlatformPill>
                ) : null}
              </div>
            ) : (
              <p className="mt-3 text-sm text-[#717182]">
                Nenhum perfil whitelabel vinculado. Peça ao admin para vincular
                um perfil no painel admin.
              </p>
            )}
            <form action={saveSellerGatewayKeyAction} className="mt-4 space-y-4">
              <input type="hidden" name="sellerKey" value={sellerKey} />
              <input type="hidden" name="whitelabelId" value={sellerWhitelabelId} />
              <Field
                label="API Key do gateway"
                name="gatewayApiKey"
                defaultValue={sellerGatewayApiKey}
                placeholder="Cole aqui a chave de API do seu provedor de pagamento"
              />
              <p className="text-sm leading-6 text-[#717182]">
                Ao salvar, a plataforma sincroniza automaticamente com o
                provedor vinculado ao seu perfil whitelabel. Nenhuma
                configuracao adicional necessaria.
              </p>
              <SaveButton label="Salvar API key" />
            </form>
          </PlatformSurface>

          <PlatformSurface className="p-5">
            <SectionHeader eyebrow="WhatsApp" title="Conecte o WhatsApp da sua operação." />
            {runtimeSettings.whatsappProvider !== "web_api" ? (
              <div className="mt-4 rounded-[1rem] border border-dashed border-black/[0.08] px-4 py-5 text-sm text-[#6b7280]">
                O admin ainda não habilitou o modo QR. Peça para ativar o provider{" "}
                <span className="font-medium text-[#1a1a2e]">WhatsApp Web API</span>.
              </div>
            ) : (
              <div className="mt-4 space-y-4">
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
                    Nenhum QR disponível. Gere um novo código para escanear com o WhatsApp do seu número.
                  </div>
                )}

                {whatsappSession.error ? (
                  <p className="text-sm text-red-500">{whatsappSession.error}</p>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  <form action={startWhatsAppQrSessionAction}>
                    <button className="inline-flex items-center gap-1.5 rounded-full bg-green-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700">
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

                <p className="text-sm leading-6 text-[#717182]">
                  Abra o WhatsApp no celular, vá em Dispositivos conectados e escaneie o QR acima.
                  A sessão conecta automaticamente e os webhooks de mensagem recebida chegam na nossa URL.
                </p>
              </div>
            )}
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

          <PlatformSurface className="p-5">
            <SectionHeader
              eyebrow="Afiliados"
              title="Convide sellers e ganhe comissão sobre cada recuperação."
            />
            <p className="mt-3 text-sm leading-6 text-[#717182]">
              Crie um link de convite exclusivo, compartilhe com outros sellers e receba
              uma porcentagem sobre cada pagamento recuperado por quem se afiliar a você.
            </p>

            {affiliateStats ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-black/[0.06] bg-[#f8f8fa] px-4 py-3 text-center">
                  <p className="text-lg font-semibold text-[#111827]">{affiliateStats.totalLinks}</p>
                  <p className="text-xs text-[#6b7280]">links criados</p>
                </div>
                <div className="rounded-xl border border-black/[0.06] bg-[#f8f8fa] px-4 py-3 text-center">
                  <p className="text-lg font-semibold text-[#111827]">{affiliateStats.totalClicks}</p>
                  <p className="text-xs text-[#6b7280]">cliques</p>
                </div>
                <div className="rounded-xl border border-black/[0.06] bg-[#f8f8fa] px-4 py-3 text-center">
                  <p className="text-lg font-semibold text-[#111827]">{affiliateStats.totalSignups}</p>
                  <p className="text-xs text-[#6b7280]">cadastros</p>
                </div>
                <div className="rounded-xl border border-black/[0.06] bg-[#f8f8fa] px-4 py-3 text-center">
                  <p className="text-lg font-semibold text-[#111827]">{affiliateStats.activeReferrals}</p>
                  <p className="text-xs text-[#6b7280]">ativos</p>
                </div>
              </div>
            ) : null}

            <form action={createAffiliateLinkAction} className="mt-5 space-y-4">
              <Field
                label="Nome do link (opcional)"
                name="affiliateLabel"
                placeholder="Ex.: Instagram, grupo WhatsApp, indicação pessoal"
              />
              <button className="inline-flex items-center gap-1.5 rounded-full bg-green-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700">
                <UserPlus className="h-4 w-4" />
                Criar link de afiliado
              </button>
            </form>

            {affiliateLinks.length > 0 ? (
              <div className="mt-5 space-y-3">
                <p className="text-xs uppercase tracking-[0.16em] text-[#9ca3af]">
                  Seus links
                </p>
                {affiliateLinks.map((link) => {
                  const affiliateUrl = `${appBaseUrl}/login?ref=${link.code}`;
                  return (
                    <div
                      key={link.id}
                      className={`flex flex-col gap-3 rounded-2xl border px-4 py-4 sm:flex-row sm:items-center ${
                        link.active
                          ? "border-black/[0.06] bg-[#fafafa]"
                          : "border-black/[0.04] bg-[#f5f5f5] opacity-60"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Link2 className="h-4 w-4 shrink-0 text-green-600" />
                          <p className="truncate text-sm font-medium text-[#1a1a2e]">
                            {link.label || link.code}
                          </p>
                          {!link.active ? (
                            <span className="rounded-full bg-[#e5e7eb] px-2 py-0.5 text-[0.65rem] font-medium text-[#6b7280]">
                              inativo
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 break-all text-xs text-[#6b7280]">
                          {affiliateUrl}
                        </p>
                        <div className="mt-2 flex gap-3 text-xs text-[#9ca3af]">
                          <span>{link.commissionPct}% comissão</span>
                          <span>{link.clicks} cliques</span>
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <CopyButton value={affiliateUrl} />
                        {link.active ? (
                          <form action={deactivateAffiliateLinkAction}>
                            <input type="hidden" name="linkId" value={link.id} />
                            <button
                              className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-medium text-[#6b7280] transition-colors hover:bg-red-50 hover:text-red-600"
                              title="Desativar link"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Desativar
                            </button>
                          </form>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
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

function AdminAdvancedSettings({
  runtimeSettings,
  databaseSettings,
  whatsappDiagnostics,
  isWebApiOnCloudUrl,
}: {
  runtimeSettings: {
    appBaseUrl: string;
    webhookSecret: string;
    webhookToleranceSeconds: number;
    whatsappProvider: string;
    whatsappApiBaseUrl: string;
    whatsappAccessToken: string;
    whatsappWebSessionId: string;
    whatsappPhoneNumberId: string;
    whatsappBusinessAccountId: string;
    whatsappWebhookVerifyToken: string;
    emailApiKey: string;
    emailFromAddress: string;
    crmApiUrl: string;
    crmApiKey: string;
    openAiApiKey: string;
  };
  databaseSettings: { supabaseUrl: string; supabaseServiceRoleKey: string };
  whatsappDiagnostics: { missingFields: string[] };
  isWebApiOnCloudUrl: boolean;
}) {
  return (
    <details className="group">
      <summary className="flex cursor-pointer items-center gap-2 rounded-xl border border-black/[0.06] bg-[#fbfbfc] px-5 py-4 text-sm font-semibold text-[#4b5563] transition-colors hover:bg-[#f5f5f7] [&::-webkit-details-marker]:hidden">
        <svg className="h-4 w-4 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
        Configurações avançadas
        <span className="ml-auto text-xs font-normal text-[#9ca3af]">banco, WhatsApp, email, CRM, AI</span>
      </summary>
      <div className="mt-5 space-y-5">
        <SettingsCard eyebrow="Banco" title="Supabase" description="URL do projeto e service role key.">
          <form action={saveDatabaseBootstrapAction} className="space-y-4">
            <Field label="Supabase URL" name="supabaseUrl" defaultValue={databaseSettings.supabaseUrl} placeholder="https://xxxx.supabase.co" />
            <Field label="Service role key" name="supabaseServiceRoleKey" defaultValue={databaseSettings.supabaseServiceRoleKey} placeholder="service role key" type="password" />
            <SaveButton label="Salvar banco" />
          </form>
        </SettingsCard>

        <SettingsCard eyebrow="Workspace" title="Base URL e webhook" description="URL da operação e parâmetros de compatibilidade.">
          <form action={saveConnectionSettingsAction} className="space-y-4">
            <input type="hidden" name="scope" value="workspace" />
            <Field label="App base URL" name="appBaseUrl" defaultValue={runtimeSettings.appBaseUrl} placeholder="https://sua-url.com" />
            <Field label="Webhook secret" name="webhookSecret" defaultValue={runtimeSettings.webhookSecret} placeholder="legacy_webhook_secret" type="password" />
            <Field label="Tolerância (seg)" name="webhookToleranceSeconds" defaultValue={String(runtimeSettings.webhookToleranceSeconds)} placeholder="300" type="number" />
            <SaveButton />
          </form>
        </SettingsCard>

        <SettingsCard eyebrow="WhatsApp" title="Configuração do provider" description="API URL, token e credenciais do canal.">
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
            <Field label="API base URL" name="whatsappApiBaseUrl" defaultValue={runtimeSettings.whatsappApiBaseUrl} placeholder="https://..." />
            <Field label="Access token" name="whatsappAccessToken" defaultValue={runtimeSettings.whatsappAccessToken} placeholder="token da API" type="password" />
            {runtimeSettings.whatsappProvider === "web_api" ? (
              <Field label="Session ID" name="whatsappWebSessionId" defaultValue={runtimeSettings.whatsappWebSessionId} placeholder="session id" />
            ) : null}
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Phone number ID" name="whatsappPhoneNumberId" defaultValue={runtimeSettings.whatsappPhoneNumberId} placeholder="id do numero" />
              <Field label="Business account ID" name="whatsappBusinessAccountId" defaultValue={runtimeSettings.whatsappBusinessAccountId} placeholder="id da conta" />
            </div>
            <Field label="Webhook verify token" name="whatsappWebhookVerifyToken" defaultValue={runtimeSettings.whatsappWebhookVerifyToken} placeholder="token" type="password" />
            {isWebApiOnCloudUrl ? (
              <p className="text-sm text-red-500">URL da Meta detectada. Troque para a URL do provider Web API.</p>
            ) : null}
            {whatsappDiagnostics.missingFields.length > 0 ? (
              <p className="text-sm text-amber-700">Faltando: {whatsappDiagnostics.missingFields.join(", ")}.</p>
            ) : null}
            <SaveButton />
          </form>
        </SettingsCard>

        <div className="grid gap-5 lg:grid-cols-2">
          <SettingsCard eyebrow="Email" title="SendGrid" description="API key e remetente.">
            <form action={saveConnectionSettingsAction} className="space-y-4">
              <input type="hidden" name="scope" value="email" />
              <Field label="API key" name="emailApiKey" defaultValue={runtimeSettings.emailApiKey} placeholder="sendgrid api key" type="password" />
              <Field label="From address" name="emailFromAddress" defaultValue={runtimeSettings.emailFromAddress} placeholder="recovery@empresa.com" />
              <SaveButton />
            </form>
          </SettingsCard>

          <SettingsCard eyebrow="CRM" title={platformBrand.crm.name} description="URL e chave do CRM.">
            <form action={saveConnectionSettingsAction} className="space-y-4">
              <input type="hidden" name="scope" value="crm" />
              <Field label="API URL" name="crmApiUrl" defaultValue={runtimeSettings.crmApiUrl} placeholder="https://crm.exemplo.com/api" />
              <Field label="API key" name="crmApiKey" defaultValue={runtimeSettings.crmApiKey} placeholder="crm api key" type="password" />
              <SaveButton />
            </form>
          </SettingsCard>
        </div>

        <SettingsCard eyebrow="AI" title="OpenAI" description="Chave da IA para automação.">
          <form action={saveConnectionSettingsAction} className="space-y-4">
            <input type="hidden" name="scope" value="ai" />
            <Field label="OpenAI API key" name="openAiApiKey" defaultValue={runtimeSettings.openAiApiKey} placeholder="openai api key" type="password" />
            <SaveButton />
          </form>
        </SettingsCard>
      </div>
    </details>
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
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-green-600">
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
        className="w-full rounded-[0.95rem] border border-black/[0.08] bg-white px-3.5 py-2.5 text-sm text-[#111827] outline-none placeholder:text-[#9ca3af] transition-colors focus:border-green-400 focus:ring-1 focus:ring-green-100"
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
        className="w-full rounded-[0.95rem] border border-black/[0.08] bg-white px-3.5 py-2.5 text-sm text-[#111827] outline-none transition-colors focus:border-green-400 focus:ring-1 focus:ring-green-100"
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
        className="w-full rounded-[0.95rem] border border-black/[0.08] bg-white px-3.5 py-3 text-sm leading-6 text-[#111827] outline-none placeholder:text-[#9ca3af] transition-colors focus:border-green-400 focus:ring-1 focus:ring-green-100"
      />
    </label>
  );
}

function SaveButton({ label = "Salvar configuração" }: { label?: string }) {
  return (
    <button className="inline-flex items-center gap-1.5 rounded-full bg-green-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700">
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
          item.active ? "bg-[var(--accent)]" : "bg-[#d1d5db]"
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
      <p className="text-xs uppercase tracking-[0.18em] text-green-600">{eyebrow}</p>
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
