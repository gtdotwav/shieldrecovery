import Link from "next/link";
import {
  ArrowRight,
  KeyRound,
  MessageCircle,
  Search,
  ShieldCheck,
  Target,
  UsersRound,
  Wallet,
} from "lucide-react";

import {
  createSellerInviteAction,
  saveSellerControlAction,
  saveSellerUserAction,
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
import { requireAuthenticatedSession } from "@/server/auth/session";
import { getPaymentRecoveryService } from "@/server/recovery/services/payment-recovery-service";
import type {
  AdminSellerSnapshot,
  SellerInviteSnapshot,
} from "@/server/recovery/types";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin | PagRecovery",
};

type AdminPageProps = {
  searchParams?: Promise<{
    status?: string;
    saved?: string;
    message?: string;
    query?: string;
    seller?: string;
  }>;
};

export default async function AdminPage({ searchParams }: AdminPageProps) {
  await requireAuthenticatedSession(["admin"]);
  const params = (await searchParams) ?? {};
  const snapshot = await getPaymentRecoveryService().getAdminPanelSnapshot();
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

  return (
    <PlatformAppPage
      currentPath="/admin"
      action={
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 rounded-full bg-sky-500 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-sky-600"
        >
          Abrir recuperação
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      }
    >
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

      <PlatformSurface className="mt-5 p-5 sm:p-6">
        <div className="grid gap-5 border-b border-black/[0.06] pb-5 lg:grid-cols-[minmax(0,1.2fr)_18rem] lg:items-end">
          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-sky-500">
              Governança da operação
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#111827] sm:text-[1.95rem]">
              Um painel para ver sellers, carteira e autonomia sem perder controle.
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#6b7280]">
              O admin acompanha carteira, recuperação, fila e autonomia dos sellers
              em um só lugar.
            </p>
          </div>

          <div className="rounded-xl border border-black/[0.06] bg-[#fbfbfc] px-4 py-4 text-sm leading-6 text-[#6b7280]">
            {snapshot.totalSellers} sellers mapeados, {snapshot.pendingInvites} convites
            pendentes, {snapshot.unassignedLeads} leads sem dono e{" "}
            {sellersWithWebhookTraffic.length} sellers com tráfego no webhook.
          </div>
        </div>
      </PlatformSurface>

      {params.status ? (
        <PlatformSurface className="mt-5 p-4">
          <p className="text-sm font-medium text-[#1a1a2e]">
            {params.status === "ok"
              ? "Controle do seller atualizado com sucesso."
              : "Nao foi possivel salvar o controle do seller."}
          </p>
          {params.saved ? (
            <p className="mt-1 text-sm text-[#717182]">Registro: {params.saved}</p>
          ) : null}
          {params.message ? (
            <p className="mt-1 text-sm text-[#717182]">{params.message}</p>
          ) : null}
        </PlatformSurface>
      ) : null}

      <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_22rem]">
        <div className="space-y-5">
          <PlatformSurface className="p-4 sm:p-5">
            <div className="flex flex-col gap-3 border-b border-black/[0.06] pb-4 sm:flex-row sm:items-end sm:justify-between">
              <SectionHeader
                eyebrow="Sellers da operação"
                title="Localize um seller pela lista ou pela busca."
              />

              <form className="w-full sm:max-w-xs">
                <label className="relative block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3af]" />
                  <input
                    type="search"
                    name="query"
                    defaultValue={query}
                    placeholder="Buscar por nome, email ou agente"
                    className="w-full rounded-full border border-black/[0.08] bg-white px-10 py-2.5 text-sm text-[#111827] outline-none transition focus:border-sky-400"
                  />
                </label>
              </form>
            </div>

            {snapshot.sellers.length === 0 ? (
              <div className="pt-4">
                <p className="text-lg font-semibold text-[#111827]">
                  Nenhum seller/agente operacional apareceu ainda.
                </p>
                <p className="mt-2 text-sm leading-6 text-[#6b7280]">
                  Assim que a operação atribuir leads ou conversar com clientes,
                  os sellers entram aqui automaticamente para controle administrativo.
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-2">
                {filteredSellers.length === 0 ? (
                  <PlatformInset className="p-4">
                    <p className="text-sm font-medium text-[#111827]">
                      Nenhum seller encontrado para essa busca.
                    </p>
                    <p className="mt-1 text-sm leading-6 text-[#6b7280]">
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

          {selectedSeller ? (
            <SellerControlCard seller={selectedSeller} query={query} />
          ) : filteredSellers.length > 0 ? (
            <PlatformSurface className="p-6">
              <p className="text-lg font-semibold text-[#111827]">
                Abra um seller para ver detalhes, percentuais e controles.
              </p>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6b7280]">
                A lista funciona como índice. Os dados densos ficam escondidos até
                você abrir um seller, o que deixa a navegação mais leve.
              </p>
            </PlatformSurface>
          ) : null}
        </div>

        <div className="space-y-4">
          <PlatformSurface className="p-4">
            <SectionHeader eyebrow="Gargalos do admin" title="Pontos que pedem ação." compact />
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

          <PlatformSurface className="p-4">
            <SectionHeader eyebrow="Worker e fila" title="Leitura rápida da automação." compact />
            <div className="mt-4 space-y-3">
              <AdminLine
                label="jobs agendados"
                value={String(snapshot.worker.scheduled)}
                tone={snapshot.worker.scheduled > 0 ? "ok" : "ok"}
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
            <div className="mt-4 space-y-2">
              {snapshot.worker.recentJobs.slice(0, 6).map((job) => (
                <div
                  key={job.id}
                  className="rounded-[1rem] border border-black/[0.06] bg-[#fbfbfc] px-3 py-3"
                >
                  <p className="text-sm font-medium text-[#111827]">{job.jobType}</p>
                  <p className="mt-1 text-xs text-[#6b7280]">
                    {job.status} · {formatRelativeTime(job.runAt)}
                  </p>
                </div>
              ))}
            </div>
            {snapshot.worker.recentEvents.length > 0 ? (
              <div className="mt-4 space-y-2 border-t border-black/[0.06] pt-4">
                {snapshot.worker.recentEvents.slice(0, 4).map((event) => (
                  <div key={event.id} className="text-xs leading-5 text-[#6b7280]">
                    <span className="font-medium text-[#111827]">{event.eventType}</span>{" "}
                    · {formatRelativeTime(event.createdAt)}
                  </div>
                ))}
              </div>
            ) : null}
          </PlatformSurface>

          <PlatformSurface className="p-4">
            <SectionHeader eyebrow="Acessos seller" title="Contas já persistidas." compact />
            <div className="mt-4 space-y-3">
              {snapshot.sellerUsers.length === 0 ? (
                <p className="text-sm leading-6 text-[#6b7280]">
                  Ainda não existem contas de seller persistidas.
                </p>
              ) : (
                snapshot.sellerUsers.map((seller) => (
                  <AdminAccessRow key={seller.id} seller={seller} />
                ))
              )}
            </div>
          </PlatformSurface>

          <PlatformSurface className="p-4">
            <SectionHeader
              eyebrow="Criar seller manualmente"
              title="Conta pronta sem depender de convite."
              compact
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
                className="inline-flex items-center gap-1.5 rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-600"
              >
                <KeyRound className="h-4 w-4" />
                Salvar acesso
              </button>
            </form>
          </PlatformSurface>

          <PlatformSurface className="p-4">
            <SectionHeader
              eyebrow="Convidar seller"
              title="Gere um link para o seller preencher o próprio acesso."
              compact
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
                <span className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#9ca3af]">
                  Contexto do convite
                </span>
                <textarea
                  name="note"
                  rows={3}
                  placeholder="Observação interna ou orientação para esse seller."
                  className="w-full rounded-[1rem] border border-black/[0.08] bg-white px-3 py-2.5 text-sm text-[#111827] outline-none transition focus:border-sky-400"
                />
              </label>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-600"
              >
                <KeyRound className="h-4 w-4" />
                Gerar convite
              </button>
            </form>
          </PlatformSurface>

          <PlatformSurface className="p-4">
            <SectionHeader
              eyebrow="Convites ativos"
              title="Links prontos para o seller finalizar o acesso."
              compact
            />
            <div className="mt-4 space-y-3">
              {activeInvites.length === 0 ? (
                <p className="text-sm leading-6 text-[#6b7280]">
                  Nenhum convite gerado ainda.
                </p>
              ) : (
                activeInvites.slice(0, 8).map((invite) => (
                  <SellerInviteRow key={invite.id} invite={invite} />
                ))
              )}
            </div>
          </PlatformSurface>
        </div>
      </section>

      <PlatformSurface className="mt-5 p-5 sm:p-6">
        <div className="flex flex-col gap-3 border-b border-black/[0.06] pb-4 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeader
            eyebrow="Área de sellers"
            title="Lista de todos os sellers cadastrados."
          />
          <span className="inline-flex items-center rounded-full border border-black/[0.06] bg-[#f7f8fa] px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
            {snapshot.sellerUsers.length} contas
          </span>
        </div>

        {snapshot.sellerUsers.length === 0 ? (
          <PlatformInset className="mt-4 p-5">
            <p className="text-sm font-medium text-[#111827]">
              Nenhum seller cadastrado ainda.
            </p>
            <p className="mt-1 text-sm leading-6 text-[#6b7280]">
              Assim que você criar os acessos, a lista completa aparece aqui.
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
    </PlatformAppPage>
  );
}

function SellerControlCard({
  seller,
  query,
}: {
  seller: AdminSellerSnapshot;
  query: string;
}) {
  const aboveLimit = seller.activeLeads > seller.control.maxAssignedLeads;
  const closeHref = query ? `/admin?query=${encodeURIComponent(query)}` : "/admin";

  return (
    <PlatformSurface className="p-5 sm:p-6">
      <div className="grid gap-5 border-b border-black/[0.06] pb-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xl font-semibold tracking-tight text-[#111827]">
              {seller.sellerName}
            </p>
            <PlatformPill>{seller.control.active ? "ativo" : "pausado"}</PlatformPill>
          </div>
          <p className="mt-2 text-sm leading-6 text-[#6b7280]">
            {seller.sellerEmail || "sem email operacional"} · última movimentação{" "}
            {seller.lastActivityAt ? formatRelativeTime(seller.lastActivityAt) : "sem histórico"}
          </p>
          <p className="mt-3 text-sm leading-6 text-[#6b7280]">
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
              className="inline-flex items-center rounded-full border border-black/[0.08] bg-white px-3 py-1.5 text-xs font-medium text-[#6b7280] transition-colors hover:bg-[#f5f5f7] hover:text-[#111827]"
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
          <div className="rounded-[1rem] border border-black/[0.06] bg-[#fbfbfc] p-3">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#9ca3af]">
              webhook do seller
            </p>
            <p className="mt-2 break-all text-sm leading-6 text-[#111827]">
              {seller.webhook.url}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <CopyButton value={seller.webhook.url} />
              <Link
                href={seller.webhook.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.08] bg-white px-3 py-1.5 text-xs font-medium text-[#4b5563] transition-colors hover:bg-[#f5f5f7] hover:text-[#111827]"
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
            <p className="text-[0.68rem] uppercase tracking-[0.16em] text-[#9ca3af]">
              saúde do webhook
            </p>
            <p className="mt-1 text-lg font-semibold text-[#111827]">
              {seller.webhook.status === "healthy"
                ? "recebendo"
                : seller.webhook.status === "attention"
                  ? "atenção"
                  : "aguardando"}
            </p>
            <p className="mt-1 text-sm leading-6 text-[#6b7280]">
              {seller.webhook.lastReceivedAt
                ? `último ${seller.webhook.lastEventType ?? "evento"} ${formatRelativeTime(seller.webhook.lastReceivedAt)}`
                : "nenhum evento recebido ainda"}
            </p>
          </PlatformInset>
          <label className="space-y-1 lg:col-span-3">
            <span className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#9ca3af]">
              Autonomia da IA
            </span>
            <select
              name="autonomyMode"
              defaultValue={seller.control.autonomyMode}
              className="w-full rounded-[0.95rem] border border-black/[0.08] bg-white px-3 py-2.5 text-sm text-[#111827] outline-none transition focus:border-sky-400"
            >
              <option value="assisted">Assistida</option>
              <option value="supervised">Supervisionada</option>
              <option value="autonomous">Autônoma</option>
            </select>
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

        <label className="space-y-1">
          <span className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#9ca3af]">
            Observação do admin
          </span>
          <textarea
            name="notes"
            defaultValue={seller.control.notes || ""}
            placeholder="Diretriz, trava operacional ou contexto administrativo."
            rows={3}
            className="w-full rounded-[1rem] border border-black/[0.08] bg-white px-3 py-2.5 text-sm text-[#111827] outline-none transition focus:border-sky-400"
          />
        </label>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/[0.06] pt-4">
          <p className="text-sm text-[#6b7280]">
            Atualizado {formatRelativeTime(seller.control.updatedAt)}
          </p>
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-600"
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
          ? "block rounded-xl border border-sky-200 bg-sky-50/60 px-4 py-4 transition-colors"
          : "block rounded-xl border border-black/[0.06] bg-[#fafafa] px-4 py-4 transition-colors hover:bg-white"
      }
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-semibold text-[#111827]">
              {seller.sellerName}
            </p>
            <PlatformPill>{seller.control.active ? "ativo" : "pausado"}</PlatformPill>
            {seller.unreadConversations > 0 ? (
              <PlatformPill>{seller.unreadConversations} não lidas</PlatformPill>
            ) : null}
          </div>
          <p className="mt-1 text-sm leading-6 text-[#6b7280]">
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
      <p className="mt-3 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[#9ca3af]">
        {active ? "detalhe aberto" : "abrir detalhes"}
      </p>
      <p className="mt-1 text-xs text-[#6b7280]">
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
      <p className="text-[0.68rem] uppercase tracking-[0.16em] text-[#9ca3af]">{label}</p>
      <p className="mt-1 text-lg font-semibold text-[#111827]">{value}</p>
      <p className="mt-1 text-sm leading-6 text-[#6b7280]">{detail}</p>
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
    <div className="flex items-center justify-between rounded-[1rem] border border-black/[0.06] bg-[#fafafa] px-3.5 py-3">
      <span className="text-sm text-[#4b5563]">{label}</span>
      <span
        className={
          tone === "warn"
            ? "text-sm font-semibold text-sky-600"
            : "text-sm font-semibold text-[#111827]"
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
    <div className="rounded-[1rem] border border-black/[0.06] bg-[#fbfbfc] px-3.5 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[#111827]">
            {seller.displayName}
          </p>
          <p className="mt-1 truncate text-xs text-[#6b7280]">{seller.email}</p>
        </div>
        <span className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[#9ca3af]">
          {seller.active ? "ativo" : "pausado"}
        </span>
      </div>
      <p className="mt-2 text-xs text-[#6b7280]">Agente vinculado: {seller.agentName}</p>
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
    <div className="rounded-[1rem] border border-black/[0.06] bg-[#fbfbfc] px-3.5 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[#111827]">
            {invite.suggestedDisplayName || invite.email}
          </p>
          <p className="mt-1 truncate text-xs text-[#6b7280]">{invite.email}</p>
        </div>
        <PlatformPill>{statusLabel}</PlatformPill>
      </div>
      <p className="mt-2 text-xs leading-5 text-[#6b7280]">
        {invite.agentName ? `Agente sugerido: ${invite.agentName}. ` : ""}
        Expira {formatRelativeTime(invite.expiresAt)}.
      </p>
      {invite.note ? (
        <p className="mt-2 text-xs leading-5 text-[#6b7280]">{invite.note}</p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <CopyButton value={invite.inviteUrl} label="Copiar convite" />
        <Link
          href={invite.inviteUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.08] bg-white px-3 py-1.5 text-xs font-medium text-[#4b5563] transition-colors hover:bg-[#f5f5f7] hover:text-[#111827]"
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
          <p className="truncate text-base font-semibold text-[#111827]">
            {seller.displayName}
          </p>
          <p className="mt-1 truncate text-sm text-[#6b7280]">{seller.email}</p>
          <p className="mt-2 text-xs uppercase tracking-[0.14em] text-[#9ca3af]">
            agente vinculado
          </p>
          <p className="mt-1 text-sm text-[#374151]">{seller.agentName}</p>
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
      <p className="text-xs uppercase tracking-[0.18em] text-sky-500">{eyebrow}</p>
      <h3
        className={
          compact
            ? "mt-2 text-base font-semibold tracking-tight text-[#111827]"
            : "mt-2 text-xl font-semibold tracking-tight text-[#111827]"
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
  type?: "text" | "number" | "email" | "password";
  step?: string;
  placeholder?: string;
}) {
  return (
    <label className="space-y-1">
      <span className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#9ca3af]">
        {label}
      </span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        step={step}
        placeholder={placeholder}
        className="w-full rounded-[0.95rem] border border-black/[0.08] bg-white px-3 py-2.5 text-sm text-[#111827] outline-none transition focus:border-sky-400"
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
    <label className="flex items-center gap-3 rounded-[1rem] border border-black/[0.06] bg-[#fafafa] px-3.5 py-3">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="h-4 w-4 rounded border-black/15 text-sky-500 focus:ring-sky-400"
      />
      <span className="text-sm font-medium text-[#111827]">{label}</span>
    </label>
  );
}
