import {
  BarChart3,
  MousePointerClick,
  Target,
  DollarSign,
  Link2,
  Megaphone,
  TrendingUp,
  Eye,
  Globe,
  ArrowRightLeft,
  Percent,
  Code2,
} from "lucide-react";

import {
  PlatformAppPage,
  PlatformInset,
  PlatformMetricCard,
  PlatformSectionIntro,
  PlatformSurface,
} from "@/components/platform/platform-shell";
import { requireAuthenticatedSession } from "@/server/auth/session";
import { getSellerIdentityByEmail } from "@/server/auth/identities";
import { getTrackingService } from "@/server/recovery/services/tracking-service";
import type { TrackingCampaign, TrackingLink, TrackingAnalytics } from "@/server/recovery/services/tracking-service";
import { appEnv } from "@/server/recovery/config";

export const metadata = { title: "Tracking & Atribuição" };
export const revalidate = 30;

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

export default async function TrackingPage() {
  const session = await requireAuthenticatedSession(["admin", "seller"]);

  const sellerIdentity = session.role === "seller" ? await getSellerIdentityByEmail(session.email) : null;
  const sellerKey = session.role === "seller" ? sellerIdentity?.agentName : undefined;

  let analytics: TrackingAnalytics = {
    totalEvents: 0,
    totalClicks: 0,
    totalConversions: 0,
    totalRevenueCents: 0,
    conversionRate: 0,
    topSources: [],
    topCampaigns: [],
    dailyStats: [],
    channelBreakdown: [],
  };
  let campaigns: TrackingCampaign[] = [];
  let links: TrackingLink[] = [];

  try {
    const service = getTrackingService();
    [analytics, campaigns, links] = await Promise.all([
      service.getAnalytics(sellerKey, 30),
      service.listCampaigns(sellerKey),
      service.listLinks(sellerKey),
    ]);
  } catch { /* tables may not exist yet */ }

  const activeCampaigns = campaigns.filter(c => c.active).length;
  const totalAdSpend = campaigns.reduce((s, c) => s + c.costCents, 0);
  const overallRoas = totalAdSpend > 0 ? analytics.totalRevenueCents / totalAdSpend : 0;
  const overallCpa = analytics.totalConversions > 0 && totalAdSpend > 0
    ? Math.round(totalAdSpend / analytics.totalConversions)
    : 0;

  const pixelSnippet = `<script src="${appEnv.appBaseUrl}/api/tracking/pixel.js" data-seller-key="${sellerKey || "SEU_SELLER_KEY"}" defer></script>`;

  return (
    <PlatformAppPage currentPath="/tracking">
      {/* KPI cards */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <PlatformMetricCard
          icon={MousePointerClick}
          label="cliques"
          value={String(analytics.totalClicks)}
          subtitle="nos últimos 30 dias"
        />
        <PlatformMetricCard
          icon={Target}
          label="conversões"
          value={String(analytics.totalConversions)}
          subtitle={`taxa: ${analytics.conversionRate.toFixed(1)}%`}
        />
        <PlatformMetricCard
          icon={DollarSign}
          label="receita atribuída"
          value={formatCurrency(analytics.totalRevenueCents)}
          subtitle="nos últimos 30 dias"
        />
        <PlatformMetricCard
          icon={TrendingUp}
          label="ROAS"
          value={overallRoas > 0 ? `${overallRoas.toFixed(1)}x` : "—"}
          subtitle={overallCpa > 0 ? `CPA: ${formatCurrency(overallCpa)}` : "sem investimento registrado"}
        />
      </section>

      {/* Main content */}
      <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(17rem,0.85fr)]">
        <div className="space-y-5">
          {/* Campaigns table */}
          <PlatformSurface className="p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <PlatformSectionIntro
                eyebrow="Campanhas"
                title="Campanhas de tracking"
                description="Gerencie campanhas UTM para atribuir receita a cada canal e fonte."
              />
              <span className="shrink-0 rounded-full bg-[var(--accent)]/10 px-3 py-1 text-xs font-semibold text-[var(--accent)]">
                {activeCampaigns} ativa{activeCampaigns !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="mt-4">
              {campaigns.length > 0 ? (
                <div className="space-y-2.5">
                  {campaigns.map(c => (
                    <div key={c.id} className="glass-inset rounded-xl px-4 py-3.5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{c.name}</p>
                          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                            {c.utmSource} / {c.utmMedium} / {c.utmCampaign}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <p className="text-sm font-semibold tabular-nums text-gray-900 dark:text-white">
                              {c.totalConversions} conv.
                            </p>
                            <p className="text-[0.65rem] text-gray-500 dark:text-gray-400">
                              {formatCurrency(c.totalRevenueCents)}
                            </p>
                          </div>
                          <span className={`rounded-full px-2 py-0.5 text-[0.6rem] font-semibold ${c.active ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"}`}>
                            {c.active ? "ativa" : "pausada"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <PlatformInset className="p-6 text-center">
                  <Megaphone className="mx-auto h-5 w-5 text-gray-400 dark:text-gray-500" />
                  <p className="mt-3 text-sm font-medium text-gray-900 dark:text-white">
                    Nenhuma campanha de tracking criada.
                  </p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Campanhas permitem agrupar UTMs para medir ROAS, CPA e conversões por fonte.
                  </p>
                </PlatformInset>
              )}
            </div>
          </PlatformSurface>

          {/* Top sources */}
          <PlatformSurface className="p-5 sm:p-6">
            <PlatformSectionIntro
              eyebrow="Fontes"
              title="Top fontes de tráfego"
              description="Fontes que mais geram cliques e conversões."
            />
            <div className="mt-4">
              {analytics.topSources.length > 0 ? (
                <div className="space-y-2">
                  {analytics.topSources.map(s => (
                    <div key={s.source} className="glass-inset rounded-xl px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Globe className="h-3.5 w-3.5 shrink-0 text-[var(--accent)]" />
                          <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{s.source}</span>
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                          <span className="text-xs text-gray-500 dark:text-gray-400">{s.clicks} cliques</span>
                          <span className="text-xs font-semibold text-gray-900 dark:text-white">{s.conversions} conv.</span>
                          <span className="text-xs text-[var(--accent)]">{formatCurrency(s.revenue)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <PlatformInset className="p-6 text-center">
                  <Eye className="mx-auto h-5 w-5 text-gray-400 dark:text-gray-500" />
                  <p className="mt-3 text-sm font-medium text-gray-900 dark:text-white">
                    Sem dados de fontes ainda.
                  </p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Instale o pixel ou crie links rastreados para começar a atribuir tráfego.
                  </p>
                </PlatformInset>
              )}
            </div>
          </PlatformSurface>

          {/* Short links */}
          <PlatformSurface className="p-5 sm:p-6">
            <PlatformSectionIntro
              eyebrow="Links"
              title="Links rastreados"
              description="Short links com UTM embutido para rastrear cada ponto de contato."
            />
            <div className="mt-4">
              {links.length > 0 ? (
                <div className="space-y-2">
                  {links.slice(0, 10).map(l => (
                    <div key={l.id} className="glass-inset rounded-xl px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {l.label || l.shortCode}
                          </p>
                          <p className="mt-0.5 text-[0.65rem] text-gray-500 dark:text-gray-400 font-mono truncate">
                            /api/t/{l.shortCode} → {l.destinationUrl.slice(0, 60)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-xs tabular-nums text-gray-500 dark:text-gray-400">
                            {l.totalClicks} cliques
                          </span>
                          <span className="text-xs font-semibold tabular-nums text-gray-900 dark:text-white">
                            {l.totalConversions} conv.
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <PlatformInset className="p-6 text-center">
                  <Link2 className="mx-auto h-5 w-5 text-gray-400 dark:text-gray-500" />
                  <p className="mt-3 text-sm font-medium text-gray-900 dark:text-white">
                    Nenhum link rastreado criado.
                  </p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Crie links via API para rastrear cliques e conversões de cada canal.
                  </p>
                </PlatformInset>
              )}
            </div>
          </PlatformSurface>
        </div>

        {/* Sidebar */}
        <div className="space-y-5 xl:sticky xl:top-20 xl:self-start">
          {/* Channel attribution */}
          <PlatformSurface className="p-5">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
              Atribuição por canal
            </p>
            <div className="mt-4 space-y-2.5">
              {analytics.channelBreakdown.length > 0 ? (
                analytics.channelBreakdown.slice(0, 8).map(ch => (
                  <ChannelBar key={ch.channel} channel={ch.channel} events={ch.events} conversions={ch.conversions} revenue={ch.revenue} totalEvents={analytics.totalEvents} />
                ))
              ) : (
                <>
                  <MetricLine label="WhatsApp" value="—" />
                  <MetricLine label="Email" value="—" />
                  <MetricLine label="Voz" value="—" />
                  <MetricLine label="Orgânico" value="—" />
                </>
              )}
            </div>
          </PlatformSurface>

          {/* Quick metrics */}
          <PlatformSurface className="p-5">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
              Métricas rápidas
            </p>
            <div className="mt-4 space-y-2.5">
              <MetricLine label="Total de eventos" value={String(analytics.totalEvents)} />
              <MetricLine label="Taxa de conversão" value={`${analytics.conversionRate.toFixed(1)}%`} />
              <MetricLine label="Campanhas ativas" value={String(activeCampaigns)} />
              <MetricLine label="Links ativos" value={String(links.filter(l => l.active).length)} />
              <MetricLine label="Investimento total" value={formatCurrency(totalAdSpend)} />
            </div>
          </PlatformSurface>

          {/* Pixel installation */}
          <PlatformSurface className="p-5">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
              Pixel de rastreamento
            </p>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Cole no HTML das suas páginas para rastrear visitas, cliques e conversões automaticamente.
            </p>
            <div className="mt-3 rounded-lg bg-gray-900 dark:bg-black/40 p-3 overflow-x-auto">
              <code className="text-[0.65rem] leading-5 text-green-400 whitespace-pre-wrap break-all font-mono">
                {pixelSnippet}
              </code>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <Code2 className="h-3.5 w-3.5" />
              <span>Captura UTM, sessão e visitante automaticamente</span>
            </div>
          </PlatformSurface>

          {/* API docs hint */}
          <PlatformSurface className="p-5">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
              API de tracking
            </p>
            <div className="mt-3 space-y-2 text-xs text-gray-500 dark:text-gray-400">
              <ApiEndpoint method="POST" path="/api/tracking/event" desc="Registrar evento" />
              <ApiEndpoint method="GET" path="/api/tracking/pixel.js" desc="Pixel JavaScript" />
              <ApiEndpoint method="GET" path="/api/t/[code]" desc="Redirect de link rastreado" />
              <ApiEndpoint method="GET" path="/api/tracking/campaigns" desc="Listar campanhas" />
              <ApiEndpoint method="POST" path="/api/tracking/campaigns" desc="Criar campanha" />
              <ApiEndpoint method="GET" path="/api/tracking/links" desc="Listar links" />
              <ApiEndpoint method="POST" path="/api/tracking/links" desc="Criar link rastreado" />
              <ApiEndpoint method="GET" path="/api/tracking/analytics" desc="Dashboard analytics" />
            </div>
          </PlatformSurface>
        </div>
      </section>
    </PlatformAppPage>
  );
}

/* ── Local components ── */

function MetricLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-inset glass-hover rounded-xl px-3.5 py-2.5">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
        <span className="text-sm font-semibold tabular-nums text-gray-900 dark:text-white">{value}</span>
      </div>
    </div>
  );
}

function ChannelBar({
  channel,
  events,
  conversions,
  revenue,
  totalEvents,
}: {
  channel: string;
  events: number;
  conversions: number;
  revenue: number;
  totalEvents: number;
}) {
  const pct = totalEvents > 0 ? Math.round((events / totalEvents) * 100) : 0;
  return (
    <div className="glass-inset rounded-xl px-3.5 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <span className="text-sm text-gray-900 dark:text-white font-medium truncate block">{channel}</span>
          <span className="text-[0.65rem] text-gray-500 dark:text-gray-400">{events} eventos · {conversions} conv.</span>
        </div>
        <span className="text-xs font-semibold text-[var(--accent)] shrink-0">{pct}%</span>
      </div>
      <div className="mt-1.5 h-1 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
        <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ApiEndpoint({ method, path, desc }: { method: string; path: string; desc: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className={`shrink-0 rounded px-1.5 py-0.5 text-[0.55rem] font-bold ${method === "POST" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"}`}>
        {method}
      </span>
      <div>
        <code className="text-[0.65rem] font-mono text-gray-700 dark:text-gray-300">{path}</code>
        <p className="text-[0.6rem] text-gray-400 dark:text-gray-500">{desc}</p>
      </div>
    </div>
  );
}
