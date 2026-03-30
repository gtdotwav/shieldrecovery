import Link from "next/link";
import {
  ArrowRight,
  KeyRound,
  Layers,
  Mail,
  MessageCircle,
  Search,
  Send,
  ShieldCheck,
  Target,
  UsersRound,
  Wallet,
} from "lucide-react";

import {
  createSellerInviteAction,
  saveSellerControlAction,
  saveSellerUserAction,
  sendQuizLeadWhatsAppAction,
} from "@/app/actions/admin-actions";
import {
  PlatformAppPage,
  PlatformInset,
  PlatformMetricCard,
  PlatformPill,
  PlatformSurface,
} from "@/components/platform/platform-shell";
import { CopyButton } from "@/components/ui/copy-button";
import { formatCurrency, formatRelativeTime } from "@/lib/format";
import { platformBrand } from "@/lib/platform";
import { requireAuthenticatedSession } from "@/server/auth/session";
import { getPaymentRecoveryService } from "@/server/recovery/services/payment-recovery-service";
import { getStorageService } from "@/server/recovery/services/storage";
import type {
  AdminSellerSnapshot,
  QuizLeadRecord,
  SellerInviteSnapshot,
  WhitelabelProfileRecord,
} from "@/server/recovery/types";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin",
};

type AdminPageProps = {
  searchParams?: Promise<{
    status?: string;
    saved?: string;
    message?: string;
    query?: string;
    seller?: string;
    tab?: string;
  }>;
};

const TABS = [
  { key: undefined, label: "Visão Geral", href: "/admin" },
  { key: "sellers", label: "Sellers", href: "/admin?tab=sellers" },
  { key: "acessos", label: "Acessos", href: "/admin?tab=acessos" },
  { key: "leads", label: "Leads", href: "/admin?tab=leads" },
] as const;

export default async function AdminPage({ searchParams }: AdminPageProps) {
  await requireAuthenticatedSession(["admin"]);
  const params = (await searchParams) ?? {};
  const service = getPaymentRecoveryService();
  const storage = getStorageService();
  const [snapshot, whitelabelProfiles, quizLeads] = await Promise.all([
    service.getAdminPanelSnapshot(),
    service.listWhitelabelProfiles(),
    storage.listQuizLeads(),
  ]);
  const query = typeof params.query === "string" ? params.query.trim() : "";
  const filteredSellers = snapshot.sellers.filter((seller) =>
    matchesSellerQuery(seller, query),
  );
  const selectedSeller =
    typeof params.seller === "string"
      ? filteredSellers.find((seller) => seller.sellerKey === params.seller) ?? null
      : null;
  const overloadedSellers = snapshot.sellers.filter(
    (seller) => seller.activeLeads > seller.control.maxAssignedLeads,
  );
  const sellersWithWebhookTraffic = snapshot.sellers.filter(
    (seller) => seller.webhook.eventCount > 0,
  );
  const activeInvites = snapshot.sellerInvites.filter(
    (invite) => invite.status === "pending" && !invite.expired,
  );

  const activeTab = typeof params.tab === "string" ? params.tab : undefined;

  return (
    <PlatformAppPage
      currentPath="/admin"
      action={
        <div className="flex items-center gap-2">
          <Link
            href="/admin/whitelabel"
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3.5 py-1.5 text-xs font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-strong)]"
          >
            <Layers className="h-3.5 w-3.5" />
            Whitelabel
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[var(--accent-strong)]"
          >
            Abrir recuperação
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      }
    >
      <PlatformSurface className="p-5 sm:p-6">
        <div className="grid gap-5 border-b border-[var(--border)] pb-5 lg:grid-cols-[minmax(0,1.2fr)_18rem] lg:items-end">
          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">
              Governança da operação
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-[1.95rem]">
              Um painel para ver sellers, carteira e autonomia sem perder controle.
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">
              O admin acompanha carteira, recuperação, fila e autonomia dos sellers
              em um só lugar.
            </p>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-4 text-sm leading-6 text-[var(--muted)]">
            {snapshot.totalSellers} sellers mapeados, {snapshot.pendingInvites} convites
            pendentes, {snapshot.unassignedLeads} leads sem dono e{" "}
            {sellersWithWebhookTraffic.length} sellers com tráfego no webhook.
          </div>
        </div>
      </PlatformSurface>

      {params.status ? (
        <PlatformSurface className="mt-5 p-4">
          <p className="text-sm font-medium text-[var(--foreground)]">
            {params.status === "ok"
              ? "Controle do seller atualizado com sucesso."
              : "Nao foi possivel salvar o controle do seller."}
          </p>
          {params.saved ? (
            <p className="mt-1 text-sm text-[var(--muted)]">Registro: {params.saved}</p>
          ) : null}
          {params.message ? (
            <p className="mt-1 text-sm text-[var(--muted)]">{params.message}</p>
          ) : null}
        </PlatformSurface>
      ) : null}

      <nav className="mt-5 flex gap-2 border-b border-[var(--border)] pb-3 mb-5">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <Link
              key={tab.label}
              href={tab.href}
              className={
                isActive
                  ? "rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white"
                  : "rounded-full border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-2 text-sm font-semibold text-[var(--muted)] hover:text-[var(--foreground)]"
              }
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {activeTab === undefined ? (
        <TabOverview
          snapshot={snapshot}
          overloadedSellers={overloadedSellers}
          sellersWithWebhookTraffic={sellersWithWebhookTraffic}
        />
      ) : activeTab === "sellers" ? (
        <TabSellers
          snapshot={snapshot}
          filteredSellers={filteredSellers}
          selectedSeller={selectedSeller}
          query={query}
          whitelabelProfiles={whitelabelProfiles}
        />
      ) : activeTab === "acessos" ? (
        <TabAcessos
          snapshot={snapshot}
          activeInvites={activeInvites}
        />
      ) : activeTab === "leads" ? (
        <TabLeads
          snapshot={snapshot}
          quizLeads={quizLeads}
        />
      ) : (
        <TabOverview
          snapshot={snapshot}
          overloadedSellers={overloadedSellers}
          sellersWithWebhookTraffic={sellersWithWebhookTraffic}
        />
      )}
    </PlatformAppPage>
  );
}

function TabOverview({
  snapshot,
  overloadedSellers,
  sellersWithWebhookTraffic,
}: {
  snapshot: Awaited<ReturnType<ReturnType<typeof getPaymentRecoveryService>["getAdminPanelSnapshot"]>>;
  overloadedSellers: AdminSellerSnapshot[];
  sellersWithWebhookTraffic: AdminSellerSnapshot[];
}) {
  return (
    <>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
        <PlatformMetricCard
          icon={UsersRound}
          label="sellers mapeados"
          value={String(snapshot.totalSellers)}
          subtitle={`${snapshot.activeSellers} ativos para operar`}
        />
        <PlatformMetricCard
          icon={ShieldCheck}
          label="carteira ativa"
          value={String(snapshot.totalActiveLeads)}
          subtitle={`${snapshot.unassignedLeads} sem dono`}
        />
        <PlatformMetricCard
          icon={Wallet}
          label="valor recuperado"
          value={formatCurrency(snapshot.totalRecoveredRevenue)}
          subtitle="resultado real da operação"
        />
        <PlatformMetricCard
          icon={MessageCircle}
          label="não lidas"
          value={String(snapshot.totalUnreadConversations)}
          subtitle="conversas pedindo ação"
        />
        <PlatformMetricCard
          icon={Target}
          label="sellers acima do limite"
          value={String(overloadedSellers.length)}
          subtitle="carteiras acima da meta definida"
        />
        <PlatformMetricCard
          icon={KeyRound}
          label="convites pendentes"
          value={String(snapshot.pendingInvites)}
          subtitle="sellers ainda finalizando o acesso"
        />
        <PlatformMetricCard
          icon={ShieldCheck}
          label="webhooks ativos"
          value={String(sellersWithWebhookTraffic.length)}
          subtitle="sellers já recebendo do gateway"
        />
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-2">
        <PlatformSurface className="p-5 sm:p-6">
          <SectionHeader eyebrow="Gargalos do admin" title="Pontos que pedem ação." />
          <div className="mt-4 space-y-3">
            <AdminLine
              label="Leads sem responsável"
              value={String(snapshot.unassignedLeads)}
              tone={snapshot.unassignedLeads > 0 ? "warn" : "ok"}
            />
            <AdminLine
              label="Sellers acima do limite"
              value={String(overloadedSellers.length)}
              tone={overloadedSellers.length > 0 ? "warn" : "ok"}
            />
            <AdminLine
              label="Conversas não lidas"
              value={String(snapshot.totalUnreadConversations)}
              tone={snapshot.totalUnreadConversations > 0 ? "warn" : "ok"}
            />
          </div>
        </PlatformSurface>

        <PlatformSurface className="p-5 sm:p-6">
          <SectionHeader eyebrow="Worker e fila" title="Leitura rápida da automação." />
          <div className="mt-4 space-y-3">
            <AdminLine
              label="jobs agendados"
              value={String(snapshot.worker.scheduled)}
              tone="ok"
            />
            <AdminLine
              label="jobs com falha"
              value={String(snapshot.worker.failed)}
              tone={snapshot.worker.failed > 0 ? "warn" : "ok"}
            />
            <AdminLine
              label="vencidos agora"
              value={String(snapshot.worker.dueNow)}
              tone={snapshot.worker.dueNow > 0 ? "warn" : "ok"}
            />
            <AdminLine
              label="atraso da fila"
              value={
                snapshot.worker.queueLagMinutes > 0
                  ? `${snapshot.worker.queueLagMinutes} min`
                  : "em dia"
              }
              tone={snapshot.worker.queueLagMinutes > 10 ? "warn" : "ok"}
            />
            <AdminLine
              label="capacidade por ciclo"
              value={`${snapshot.worker.batchSize} jobs x ${snapshot.worker.concurrency}`}
              tone="ok"
            />
          </div>
          {snapshot.worker.recentJobs.length > 0 ? (
            <div className="mt-4 space-y-2">
              {snapshot.worker.recentJobs.slice(0, 6).map((job) => (
                <div
                  key={job.id}
                  className="rounded-[1rem] border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-3"
                >
                  <p className="text-sm font-medium text-[var(--foreground)]">{job.jobType}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {job.status} · {formatRelativeTime(job.runAt)}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
          {snapshot.worker.recentEvents.length > 0 ? (
            <div className="mt-4 space-y-2 border-t border-[var(--border)] pt-4">
              {snapshot.worker.recentEvents.slice(0, 4).map((event) => (
                <div key={event.id} className="text-xs leading-5 text-[var(--muted)]">
                  <span className="font-medium text-[var(--foreground)]">{event.eventType}</span>{" "}
                  · {formatRelativeTime(event.createdAt)}
                </div>
              ))}
            </div>
          ) : null}
        </PlatformSurface>
      </section>
    </>
  );
}

function TabSellers({
  snapshot,
  filteredSellers,
  selectedSeller,
  query,
  whitelabelProfiles,
}: {
  snapshot: Awaited<ReturnType<ReturnType<typeof getPaymentRecoveryService>["getAdminPanelSnapshot"]>>;
  filteredSellers: AdminSellerSnapshot[];
  selectedSeller: AdminSellerSnapshot | null;
  query: string;
  whitelabelProfiles: WhitelabelProfileRecord[];
}) {
  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <PlatformSurface className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 border-b border-[var(--border)] pb-4 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeader
            eyebrow="Sellers da operação"
            title="Localize um seller pela lista ou pela busca."
          />

          <form className="w-full sm:max-w-xs">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
              <input
                type="search"
                name="query"
                defaultValue={query}
                placeholder="Buscar por nome, email ou agente"
                className="w-full rounded-full border border-[var(--border)] bg-[var(--surface)] px-10 py-2.5 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
              />
              <input type="hidden" name="tab" value="sellers" />
            </label>
          </form>
        </div>

        {snapshot.sellers.length === 0 ? (
          <PlatformInset className="mt-4 p-6 text-center">
            <UsersRound className="mx-auto h-6 w-6 text-[var(--muted)]" />
            <p className="mt-3 text-sm font-medium text-[var(--foreground)]">
              Nenhum seller/agente operacional apareceu ainda.
            </p>
            <p className="mt-1.5 text-sm leading-6 text-[var(--muted)]">
              Assim que a operação atribuir leads ou conversar com clientes,
              os sellers entram aqui automaticamente para controle administrativo.
            </p>
            <Link
              href="/connect"
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--accent)] hover:underline"
            >
              Configurar integrações
              <ArrowRight className="h-3 w-3" />
            </Link>
          </PlatformInset>
        ) : (
          <div className="mt-4 space-y-2">
            {filteredSellers.length === 0 ? (
              <PlatformInset className="p-4">
                <p className="text-sm font-medium text-[var(--foreground)]">
                  Nenhum seller encontrado para essa busca.
                </p>
                <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                  Ajuste o nome, email ou agente vinculado para localizar a carteira.
                </p>
              </PlatformInset>
            ) : (
              filteredSellers.map((seller) => (
                <SellerListRow
                  key={seller.sellerKey}
                  seller={seller}
                  active={seller.sellerKey === selectedSeller?.sellerKey}
                  query={query}
                />
              ))
            )}
          </div>
        )}
      </PlatformSurface>

      <div>
        {selectedSeller ? (
          <SellerControlCard seller={selectedSeller} query={query} whitelabelProfiles={whitelabelProfiles} />
        ) : filteredSellers.length > 0 ? (
          <PlatformSurface className="p-6">
            <p className="text-lg font-semibold text-[var(--foreground)]">
              Abra um seller para ver detalhes, percentuais e controles.
            </p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
              A lista funciona como índice. Os dados densos ficam escondidos até
              você abrir um seller, o que deixa a navegação mais leve.
            </p>
          </PlatformSurface>
        ) : null}
      </div>
    </section>
  );
}

function TabAcessos({
  snapshot,
  activeInvites,
}: {
  snapshot: Awaited<ReturnType<ReturnType<typeof getPaymentRecoveryService>["getAdminPanelSnapshot"]>>;
  activeInvites: SellerInviteSnapshot[];
}) {
  return (
    <section className="grid gap-5 lg:grid-cols-2">
      <div className="space-y-5">
        <PlatformSurface className="p-5 sm:p-6">
          <SectionHeader
            eyebrow="Criar seller manualmente"
            title="Conta pronta sem depender de convite."
          />
          <form action={saveSellerUserAction} className="mt-4 space-y-3">
            <Field label="Nome" name="displayName" defaultValue="" />
            <Field label="Email" name="email" type="email" defaultValue="" />
            <Field
              label="Agente vinculado"
              name="agentName"
              defaultValue=""
              placeholder="Nome do agente que vai operar"
            />
            <Field
              label="Senha inicial"
              name="password"
              type="password"
              defaultValue=""
              placeholder="Obrigatória ao criar; opcional ao editar"
            />
            <ToggleField label="Seller ativo" name="active" defaultChecked />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-strong)]"
            >
              <KeyRound className="h-4 w-4" />
              Salvar acesso
            </button>
          </form>
        </PlatformSurface>

        <PlatformSurface className="p-5 sm:p-6">
          <SectionHeader
            eyebrow="Convidar seller"
            title="Gere um link para o seller preencher o próprio acesso."
          />
          <form action={createSellerInviteAction} className="mt-4 space-y-3">
            <Field label="Email" name="email" type="email" defaultValue="" />
            <Field
              label="Nome sugerido"
              name="suggestedDisplayName"
              defaultValue=""
              placeholder="Como o seller vai aparecer"
            />
            <Field
              label="Agente sugerido"
              name="agentName"
              defaultValue=""
              placeholder="Opcional; seller pode ajustar"
            />
            <Field
              label="Expira em (dias)"
              name="expiresInDays"
              type="number"
              defaultValue="7"
            />
            <label className="space-y-1">
              <span className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                Contexto do convite
              </span>
              <textarea
                name="note"
                rows={3}
                placeholder="Observação interna ou orientação para esse seller."
                className="w-full rounded-[1rem] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
              />
            </label>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-strong)]"
            >
              <KeyRound className="h-4 w-4" />
              Gerar convite
            </button>
          </form>
        </PlatformSurface>
      </div>

      <div className="space-y-5">
        <PlatformSurface className="p-5 sm:p-6">
          <div className="flex flex-col gap-3 border-b border-[var(--border)] pb-4 sm:flex-row sm:items-end sm:justify-between">
            <SectionHeader eyebrow="Acessos seller" title="Contas já persistidas." />
            <span className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--surface-strong)] px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
              {snapshot.sellerUsers.length} contas
            </span>
          </div>
          <div className="mt-4 space-y-3">
            {snapshot.sellerUsers.length === 0 ? (
              <PlatformInset className="p-4 text-center">
                <KeyRound className="mx-auto h-5 w-5 text-[var(--muted)]" />
                <p className="mt-2 text-sm text-[var(--muted)]">
                  Ainda não existem contas de seller persistidas.
                </p>
              </PlatformInset>
            ) : (
              snapshot.sellerUsers.map((seller) => (
                <AdminAccessRow key={seller.id} seller={seller} />
              ))
            )}
          </div>
        </PlatformSurface>

        <PlatformSurface className="p-5 sm:p-6">
          <div className="flex flex-col gap-3 border-b border-[var(--border)] pb-4 sm:flex-row sm:items-end sm:justify-between">
            <SectionHeader
              eyebrow="Convites ativos"
              title="Links prontos para o seller finalizar o acesso."
            />
            <span className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--surface-strong)] px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
              {activeInvites.length} pendentes
            </span>
          </div>
          <div className="mt-4 space-y-3">
            {activeInvites.length === 0 ? (
              <PlatformInset className="p-4 text-center">
                <KeyRound className="mx-auto h-5 w-5 text-[var(--muted)]" />
                <p className="mt-2 text-sm text-[var(--muted)]">
                  Nenhum convite gerado ainda.
                </p>
              </PlatformInset>
            ) : (
              activeInvites.slice(0, 8).map((invite) => (
                <SellerInviteRow key={invite.id} invite={invite} />
              ))
            )}
          </div>
        </PlatformSurface>
      </div>
    </section>
  );
}

function TabLeads({
  snapshot,
  quizLeads,
}: {
  snapshot: Awaited<ReturnType<ReturnType<typeof getPaymentRecoveryService>["getAdminPanelSnapshot"]>>;
  quizLeads: QuizLeadRecord[];
}) {
  return (
    <div className="space-y-5">
      <PlatformSurface className="p-5 sm:p-6">
        <div className="flex flex-col gap-3 border-b border-[var(--border)] pb-4 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeader
            eyebrow="Leads do quiz"
            title="Emails capturados pelo quiz da landing page."
          />
          <span className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--surface-strong)] px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
            {quizLeads.length} leads
          </span>
        </div>

        {quizLeads.length === 0 ? (
          <PlatformInset className="mt-4 p-6 text-center">
            <Mail className="mx-auto h-6 w-6 text-[var(--muted)]" />
            <p className="mt-3 text-sm font-medium text-[var(--foreground)]">
              Nenhum lead do quiz ainda.
            </p>
            <p className="mt-1.5 text-sm leading-6 text-[var(--muted)]">
              Quando visitantes completarem o quiz na landing page, os emails
              aparecem aqui para acompanhamento.
            </p>
          </PlatformInset>
        ) : (
          <div className="mt-4 space-y-3">
            {quizLeads.map((lead) => (
              <QuizLeadRow key={lead.id} lead={lead} />
            ))}
          </div>
        )}
      </PlatformSurface>

      <PlatformSurface className="p-5 sm:p-6">
        <div className="flex flex-col gap-3 border-b border-[var(--border)] pb-4 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeader
            eyebrow="Área de sellers"
            title="Lista de todos os sellers cadastrados."
          />
          <span className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--surface-strong)] px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
            {snapshot.sellerUsers.length} contas
          </span>
        </div>

        {snapshot.sellerUsers.length === 0 ? (
          <PlatformInset className="mt-4 p-6 text-center">
            <KeyRound className="mx-auto h-6 w-6 text-[var(--muted)]" />
            <p className="mt-3 text-sm font-medium text-[var(--foreground)]">
              Nenhum seller cadastrado ainda.
            </p>
            <p className="mt-1.5 text-sm leading-6 text-[var(--muted)]">
              Crie acessos manualmente ou envie convites para que os sellers finalizem o cadastro.
            </p>
          </PlatformInset>
        ) : (
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {snapshot.sellerUsers.map((seller) => {
              const operationalSeller =
                snapshot.sellers.find(
                  (entry) =>
                    entry.sellerEmail?.toLowerCase() === seller.email.toLowerCase() ||
                    entry.sellerName.toLowerCase() === seller.displayName.toLowerCase(),
                ) ?? null;

              return (
                <SellerAccountCard
                  key={seller.id}
                  seller={seller}
                  operationalSeller={operationalSeller}
                />
              );
            })}
          </div>
        )}
      </PlatformSurface>
    </div>
  );
}

function SellerControlCard({
  seller,
  query,
  whitelabelProfiles,
}: {
  seller: AdminSellerSnapshot;
  query: string;
  whitelabelProfiles: WhitelabelProfileRecord[];
}) {
  const aboveLimit = seller.activeLeads > seller.control.maxAssignedLeads;
  const closeHref = query ? `/admin?tab=sellers&query=${encodeURIComponent(query)}` : "/admin?tab=sellers";

  return (
    <PlatformSurface className="p-5 sm:p-6">
      <div className="grid gap-5 border-b border-[var(--border)] pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xl font-semibold tracking-tight text-[var(--foreground)]">
              {seller.sellerName}
            </p>
            <PlatformPill>{seller.control.active ? "ativo" : "pausado"}</PlatformPill>
          </div>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            {seller.sellerEmail || "sem email operacional"} · última movimentação{" "}
            {seller.lastActivityAt ? formatRelativeTime(seller.lastActivityAt) : "sem histórico"}
          </p>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            Taxa real {seller.realRecoveryRate.toFixed(1)}% · meta {seller.control.recoveryTargetPercent.toFixed(1)}% · autonomia {seller.control.autonomyMode}
            {aboveLimit ? " · acima do limite" : ""}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <PlatformPill>
              {seller.webhook.status === "healthy"
                ? "webhook recebendo"
                : seller.webhook.status === "attention"
                  ? "webhook com atenção"
                  : "webhook aguardando"}
            </PlatformPill>
            <PlatformPill>{seller.webhook.eventCount} eventos</PlatformPill>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-end">
            <Link
              href={closeHref}
              className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--muted)] transition-colors hover:bg-[var(--surface-strong)] hover:text-[var(--foreground)]"
            >
              Fechar detalhes
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <CompactMetric
              label="leads ativos"
              value={String(seller.activeLeads)}
              detail={`limite ${seller.control.maxAssignedLeads}`}
            />
            <CompactMetric
              label="aguardando cliente"
              value={String(seller.waitingCustomer)}
              detail="casos pendentes de retorno"
            />
            <CompactMetric
              label="recuperados"
              value={String(seller.recoveredCount)}
              detail={formatCurrency(seller.recoveredRevenue)}
            />
            <CompactMetric
              label="taxa plataforma"
              value={`${seller.platformRecoveryRate.toFixed(1)}%`}
              detail={
                seller.control.reportedRecoveryRatePercent !== undefined
                  ? `real informada ${seller.realRecoveryRate.toFixed(1)}%`
                  : "sem ajuste manual"
              }
            />
          </div>
          <div className="rounded-[1rem] border border-[var(--border)] bg-[var(--surface-strong)] p-3">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
              webhook do seller
            </p>
            <p className="mt-2 break-all text-sm leading-6 text-[var(--foreground)]">
              {seller.webhook.url}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <CopyButton value={seller.webhook.url} />
              <Link
                href={seller.webhook.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--foreground-secondary)] transition-colors hover:bg-[var(--surface-strong)] hover:text-[var(--foreground)]"
              >
                Ver endpoint
              </Link>
            </div>
          </div>
        </div>
      </div>

      <form action={saveSellerControlAction} className="mt-5 space-y-4">
        <input type="hidden" name="sellerKey" value={seller.sellerKey} />
        <input type="hidden" name="sellerName" value={seller.sellerName} />
        <input type="hidden" name="sellerEmail" value={seller.sellerEmail || ""} />

        <div className="grid gap-4 lg:grid-cols-3">
          <Field
            label="Meta de recuperação (%)"
            name="recoveryTargetPercent"
            type="number"
            defaultValue={String(seller.control.recoveryTargetPercent)}
            step="0.1"
          />
          <Field
            label="Taxa real recuperada (%)"
            name="reportedRecoveryRatePercent"
            type="number"
            defaultValue={
              seller.control.reportedRecoveryRatePercent !== undefined
                ? String(seller.control.reportedRecoveryRatePercent)
                : ""
            }
            step="0.1"
            placeholder="Se vier de outro sistema"
          />
          <Field
            label="Limite da carteira"
            name="maxAssignedLeads"
            type="number"
            defaultValue={String(seller.control.maxAssignedLeads)}
          />
          <PlatformInset className="p-4">
            <p className="text-[0.68rem] uppercase tracking-[0.16em] text-[var(--muted)]">
              saúde do webhook
            </p>
            <p className="mt-1 text-lg font-semibold text-[var(--foreground)]">
              {seller.webhook.status === "healthy"
                ? "recebendo"
                : seller.webhook.status === "attention"
                  ? "atenção"
                  : "aguardando"}
            </p>
            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
              {seller.webhook.lastReceivedAt
                ? `último ${seller.webhook.lastEventType ?? "evento"} ${formatRelativeTime(seller.webhook.lastReceivedAt)}`
                : "nenhum evento recebido ainda"}
            </p>
          </PlatformInset>
          <label className="space-y-1">
            <span className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
              Autonomia da IA
            </span>
            <select
              name="autonomyMode"
              defaultValue={seller.control.autonomyMode}
              className="w-full rounded-[0.95rem] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
            >
              <option value="assisted">Assistida</option>
              <option value="supervised">Supervisionada</option>
              <option value="autonomous">Autônoma</option>
            </select>
          </label>
          <label className="space-y-1 lg:col-span-2">
            <span className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
              Abordagem da mensagem
            </span>
            <div className="grid grid-cols-3 gap-2">
              {([
                {
                  value: "friendly",
                  label: "Amigavel",
                  desc: "Tom leve e acolhedor, como um amigo ajudando",
                },
                {
                  value: "professional",
                  label: "Profissional",
                  desc: "Direto e cordial, linguagem comercial",
                },
                {
                  value: "urgent",
                  label: "Urgente",
                  desc: "Assertivo, enfatiza prazo e escassez",
                },
              ] as const).map((opt) => (
                <label
                  key={opt.value}
                  className={[
                    "relative flex cursor-pointer flex-col rounded-[0.95rem] border px-3 py-2.5 text-sm transition",
                    seller.control.messagingApproach === opt.value
                      ? "border-[var(--accent)] bg-[var(--accent-soft)] ring-1 ring-[var(--accent)]"
                      : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)]",
                  ].join(" ")}
                >
                  <input
                    type="radio"
                    name="messagingApproach"
                    value={opt.value}
                    defaultChecked={seller.control.messagingApproach === opt.value}
                    className="peer sr-only"
                  />
                  <span className="font-semibold text-[var(--foreground)] peer-checked:text-[var(--accent)]">
                    {opt.label}
                  </span>
                  <span className="mt-0.5 text-xs leading-snug text-[var(--muted)]">
                    {opt.desc}
                  </span>
                </label>
              ))}
            </div>
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <ToggleField
            label="Seller ativo"
            name="active"
            defaultChecked={seller.control.active}
          />
          <ToggleField
            label="Liberar conversas"
            name="inboxEnabled"
            defaultChecked={seller.control.inboxEnabled}
          />
          <ToggleField
            label="Liberar automações"
            name="automationsEnabled"
            defaultChecked={seller.control.automationsEnabled}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Field
            label="Checkout URL do seller"
            name="checkoutUrl"
            type="url"
            defaultValue={seller.control.checkoutUrl || ""}
            placeholder="https://checkout.exemplo.com"
          />
          <Field
            label="Checkout API Key"
            name="checkoutApiKey"
            type="text"
            defaultValue={seller.control.checkoutApiKey || ""}
            placeholder="sk_live_..."
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <label className="space-y-1">
            <span className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
              Perfil whitelabel
            </span>
            <select
              name="whitelabelId"
              defaultValue={seller.control.whitelabelId || ""}
              className="w-full rounded-[0.95rem] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
            >
              <option value="">Nenhum (herda padrão)</option>
              {whitelabelProfiles.map((wp) => (
                <option key={wp.id} value={wp.id}>
                  {wp.name} ({wp.gatewayProvider})
                </option>
              ))}
            </select>
          </label>
          <Field
            label="Gateway API Key do seller"
            name="gatewayApiKey"
            type="text"
            defaultValue={seller.control.gatewayApiKey || ""}
            placeholder="key do gateway do seller"
          />
        </div>

        <label className="space-y-1">
          <span className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
            Observação do admin
          </span>
          <textarea
            name="notes"
            defaultValue={seller.control.notes || ""}
            placeholder="Diretriz, trava operacional ou contexto administrativo."
            rows={3}
            className="w-full rounded-[1rem] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
          />
        </label>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-4">
          <p className="text-sm text-[var(--muted)]">
            Atualizado {formatRelativeTime(seller.control.updatedAt)}
          </p>
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-strong)]"
          >
            Salvar controle
          </button>
        </div>
      </form>
    </PlatformSurface>
  );
}

function SellerListRow({
  seller,
  active,
  query,
}: {
  seller: AdminSellerSnapshot;
  active: boolean;
  query: string;
}) {
  return (
    <Link
      href={buildSellerHref(seller.sellerKey, query)}
      className={
        active
          ? "block rounded-xl border border-[var(--accent)]/20 bg-[var(--accent-soft)]/60 px-4 py-4 transition-colors"
          : "block rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-4 transition-colors hover:bg-[var(--surface)]"
      }
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-semibold text-[var(--foreground)]">
              {seller.sellerName}
            </p>
            <PlatformPill>{seller.control.active ? "ativo" : "pausado"}</PlatformPill>
            {seller.unreadConversations > 0 ? (
              <PlatformPill>{seller.unreadConversations} não lidas</PlatformPill>
            ) : null}
          </div>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
            {seller.sellerEmail || "sem email operacional"} ·{" "}
            {seller.lastActivityAt
              ? `última movimentação ${formatRelativeTime(seller.lastActivityAt)}`
              : "sem histórico recente"}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:min-w-[15rem]">
          <CompactMetric
            label="carteira"
            value={String(seller.activeLeads)}
            detail={`${seller.waitingCustomer} aguardando`}
          />
          <CompactMetric
            label="recuperado"
            value={formatCurrency(seller.recoveredRevenue)}
            detail={`${seller.recoveredCount} casos`}
          />
        </div>
      </div>
      <p className="mt-3 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
        {active ? "detalhe aberto" : "abrir detalhes"}
      </p>
      <p className="mt-1 text-xs text-[var(--muted)]">
        webhook:{" "}
        {seller.webhook.status === "healthy"
          ? "recebendo"
          : seller.webhook.status === "attention"
            ? "atenção"
            : "aguardando"}
        {" · "}
        {seller.webhook.eventCount} eventos
      </p>
    </Link>
  );
}

function matchesSellerQuery(seller: AdminSellerSnapshot, query: string) {
  if (!query) {
    return true;
  }

  const haystack = [
    seller.sellerName,
    seller.sellerEmail ?? "",
    seller.control.sellerName,
    seller.control.sellerEmail ?? "",
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(query.toLowerCase());
}

function buildSellerHref(sellerKey: string, query: string) {
  const params = new URLSearchParams();
  params.set("tab", "sellers");
  params.set("seller", sellerKey);
  if (query) {
    params.set("query", query);
  }
  return `/admin?${params.toString()}`;
}

function CompactMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <PlatformInset className="p-4">
      <p className="text-[0.68rem] uppercase tracking-[0.16em] text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-lg font-semibold text-[var(--foreground)]">{value}</p>
      <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{detail}</p>
    </PlatformInset>
  );
}

function AdminLine({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "ok" | "warn";
}) {
  return (
    <div className="flex items-center justify-between rounded-[1rem] border border-[var(--border)] bg-[var(--surface-strong)] px-3.5 py-3">
      <span className="text-sm text-[var(--foreground-secondary)]">{label}</span>
      <span
        className={
          tone === "warn"
            ? "text-sm font-semibold text-[var(--accent)]"
            : "text-sm font-semibold text-[var(--foreground)]"
        }
      >
        {value}
      </span>
    </div>
  );
}

function AdminAccessRow({
  seller,
}: {
  seller: {
    id: string;
    displayName: string;
    email: string;
    active: boolean;
    agentName: string;
  };
}) {
  return (
    <div className="rounded-[1rem] border border-[var(--border)] bg-[var(--surface-strong)] px-3.5 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--foreground)]">
            {seller.displayName}
          </p>
          <p className="mt-1 truncate text-xs text-[var(--muted)]">{seller.email}</p>
        </div>
        <span className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
          {seller.active ? "ativo" : "pausado"}
        </span>
      </div>
      <p className="mt-2 text-xs text-[var(--muted)]">Agente vinculado: {seller.agentName}</p>
    </div>
  );
}

function SellerInviteRow({
  invite,
}: {
  invite: SellerInviteSnapshot;
}) {
  const statusLabel =
    invite.status === "accepted"
      ? "aceito"
      : invite.status === "revoked"
        ? "revogado"
        : invite.expired
          ? "expirado"
          : "pendente";

  return (
    <div className="rounded-[1rem] border border-[var(--border)] bg-[var(--surface-strong)] px-3.5 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--foreground)]">
            {invite.suggestedDisplayName || invite.email}
          </p>
          <p className="mt-1 truncate text-xs text-[var(--muted)]">{invite.email}</p>
        </div>
        <PlatformPill>{statusLabel}</PlatformPill>
      </div>
      <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
        {invite.agentName ? `Agente sugerido: ${invite.agentName}. ` : ""}
        Expira {formatRelativeTime(invite.expiresAt)}.
      </p>
      {invite.note ? (
        <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{invite.note}</p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <CopyButton value={invite.inviteUrl} label="Copiar convite" />
        <Link
          href={invite.inviteUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--foreground-secondary)] transition-colors hover:bg-[var(--surface-strong)] hover:text-[var(--foreground)]"
        >
          Abrir convite
        </Link>
      </div>
    </div>
  );
}

function SellerAccountCard({
  seller,
  operationalSeller,
}: {
  seller: {
    id: string;
    displayName: string;
    email: string;
    active: boolean;
    agentName: string;
    lastLoginAt?: string;
  };
  operationalSeller: AdminSellerSnapshot | null;
}) {
  return (
    <PlatformInset className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-[var(--foreground)]">
            {seller.displayName}
          </p>
          <p className="mt-1 truncate text-sm text-[var(--muted)]">{seller.email}</p>
          <p className="mt-2 text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
            agente vinculado
          </p>
          <p className="mt-1 text-sm text-[var(--foreground-secondary)]">{seller.agentName}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <PlatformPill>{seller.active ? "ativo" : "pausado"}</PlatformPill>
          {operationalSeller ? <PlatformPill>operando</PlatformPill> : null}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <CompactMetric
          label="último login"
          value={seller.lastLoginAt ? formatRelativeTime(seller.lastLoginAt) : "sem login"}
          detail="atividade da conta"
        />
        <CompactMetric
          label="carteira"
          value={operationalSeller ? String(operationalSeller.activeLeads) : "0"}
          detail="leads ativos"
        />
        <CompactMetric
          label="recuperado"
          value={
            operationalSeller
              ? formatCurrency(operationalSeller.recoveredRevenue)
              : formatCurrency(0)
          }
          detail="resultado da carteira"
        />
      </div>
    </PlatformInset>
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
      <p className="text-xs uppercase tracking-[0.18em] text-[var(--accent)]">{eyebrow}</p>
      <h3
        className={
          compact
            ? "mt-2 text-base font-semibold tracking-tight text-[var(--foreground)]"
            : "mt-2 text-xl font-semibold tracking-tight text-[var(--foreground)]"
        }
      >
        {title}
      </h3>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  step,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue: string;
  type?: "text" | "number" | "email" | "password" | "url";
  step?: string;
  placeholder?: string;
}) {
  return (
    <label className="space-y-1">
      <span className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
        {label}
      </span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        step={step}
        placeholder={placeholder}
        className="w-full rounded-[0.95rem] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
      />
    </label>
  );
}

function ToggleField({
  label,
  name,
  defaultChecked,
}: {
  label: string;
  name: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex items-center gap-3 rounded-[1rem] border border-[var(--border)] bg-[var(--surface-strong)] px-3.5 py-3">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="h-4 w-4 rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)]"
      />
      <span className="text-sm font-medium text-[var(--foreground)]">{label}</span>
    </label>
  );
}

function QuizLeadRow({ lead }: { lead: QuizLeadRecord }) {
  const statusLabel =
    lead.status === "contacted"
      ? "contatado"
      : lead.status === "converted"
        ? "convertido"
        : "novo";

  return (
    <div className="rounded-[1rem] border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Mail className="h-4 w-4 text-[var(--accent)]" />
            <p className="text-sm font-semibold text-[var(--foreground)]">
              {lead.email}
            </p>
            <PlatformPill>{statusLabel}</PlatformPill>
          </div>
          <p className="mt-2 text-xs text-[var(--muted)]">
            Cadastro {formatRelativeTime(lead.createdAt)}
            {lead.whatsappSentAt
              ? ` · WhatsApp enviado ${formatRelativeTime(lead.whatsappSentAt)}`
              : ""}
          </p>
          {lead.answers.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {lead.answers.map((answer, idx) => (
                <span
                  key={idx}
                  className="inline-flex rounded-full border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5 text-[0.65rem] text-[var(--muted)]"
                >
                  {answer}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        {!lead.whatsappSentAt ? (
          <form
            action={sendQuizLeadWhatsAppAction}
            className="flex shrink-0 items-end gap-2"
          >
            <input type="hidden" name="leadId" value={lead.id} />
            <label className="space-y-1">
              <span className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                WhatsApp
              </span>
              <input
                name="phone"
                type="tel"
                placeholder="5511999999999"
                required
                className="w-36 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
              />
            </label>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[var(--accent-strong)]"
            >
              <Send className="h-3 w-3" />
              Enviar
            </button>
          </form>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-[var(--muted)]">
            <Send className="h-3 w-3" />
            Enviado
          </span>
        )}
      </div>
    </div>
  );
}
