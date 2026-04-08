import { Clock, Percent, TrendingUp, Wallet } from "lucide-react";

import {
  requestPayoutAction,
  createPixAccountAction,
  createCheckoutLinkAction,
} from "@/app/actions/payout-actions";
import {
  PlatformAppPage,
  PlatformInset,
  PlatformMetricCard,
  PlatformPill,
  PlatformSurface,
} from "@/components/platform/platform-shell";
import { formatCurrency, formatDateTime, formatRelativeTime } from "@/lib/format";
import { requireAuthenticatedSession } from "@/server/auth/session";
import { getSellerIdentityByEmail } from "@/server/auth/identities";
import { getStorageService } from "@/server/recovery/services/storage";
import {
  getSellerWallet,
  getSellerSplits,
  getSellerPayouts,
  getSellerPixAccounts,
  getSellerConfig,
  getSellerSessions,
} from "@/server/checkout";
import type { SellerFeeConfig, SellerSession } from "@/server/checkout";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Financeiro",
};

type PageProps = {
  searchParams?: Promise<{
    status?: string;
    saved?: string;
    message?: string;
    checkoutUrl?: string;
    tab?: string;
  }>;
};

const STATUS_LABELS: Record<string, string> = {
  open: "Aberto",
  method_selected: "Metodo selecionado",
  processing: "Processando",
  paid: "Pago",
  failed: "Falhou",
  expired: "Expirado",
  abandoned: "Abandonado",
};

const STATUS_COLORS: Record<string, string> = {
  paid: "bg-emerald-500/20 text-emerald-400",
  open: "bg-blue-500/20 text-blue-400",
  processing: "bg-yellow-500/20 text-yellow-400",
  failed: "bg-red-500/20 text-red-400",
  expired: "bg-gray-500/20 text-gray-400",
  abandoned: "bg-gray-500/20 text-gray-400",
};

export default async function FinanceiroPage({ searchParams }: PageProps) {
  const session = await requireAuthenticatedSession(["admin", "seller", "market"]);
  const params = (await searchParams) ?? {};
  const activeTab = params.tab ?? "resumo";

  // Resolve seller -> checkout config
  const identity = await getSellerIdentityByEmail(session.email);
  const storage = getStorageService();

  let checkoutConfigured = false;
  let overrides: { baseUrl?: string; apiKey: string } | null = null;

  if (identity) {
    const allControls = await storage.getSellerAdminControls();
    const controls = allControls.find((c) => c.sellerKey === identity.agentName);
    if (controls?.checkoutApiKey) {
      checkoutConfigured = true;
      overrides = {
        baseUrl: controls.checkoutUrl || undefined,
        apiKey: controls.checkoutApiKey,
      };
    }
  }

  if (!checkoutConfigured) {
    return (
      <PlatformAppPage currentPath="/financeiro">
        <PlatformSurface>
          <div className="px-5 py-8 text-center">
            <Wallet className="mx-auto h-10 w-10 text-[var(--muted)]" />
            <p className="mt-3 text-sm font-semibold text-[var(--foreground)]">
              Financeiro nao configurado
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Entre em contato com o admin para configurar o checkout e habilitar o financeiro.
            </p>
          </div>
        </PlatformSurface>
      </PlatformAppPage>
    );
  }

  // Fetch all data in parallel
  let wallet: Record<string, number> | null = null;
  let splits: { entries: Record<string, unknown>[]; total: number } = { entries: [], total: 0 };
  let payouts: { payouts: Record<string, unknown>[] } = { payouts: [] };
  let pixAccounts: { accounts: Record<string, unknown>[] } = { accounts: [] };
  let feeConfig: SellerFeeConfig | null = null;
  let sessions: { sessions: SellerSession[]; count: number } = { sessions: [], count: 0 };

  try {
    const results = await Promise.all([
      getSellerWallet(overrides!),
      getSellerSplits(1, overrides!),
      getSellerPayouts(overrides!),
      getSellerPixAccounts(overrides!),
      getSellerConfig(overrides!).catch(() => null),
      getSellerSessions({ limit: 20 }, overrides!).catch(() => ({ sessions: [], count: 0 })),
    ]);
    wallet = results[0] as Record<string, number>;
    splits = results[1] as typeof splits;
    payouts = results[2] as typeof payouts;
    pixAccounts = results[3] as typeof pixAccounts;
    feeConfig = results[4] as SellerFeeConfig | null;
    sessions = results[5] as typeof sessions;
  } catch {
    // Split system may not be deployed yet
  }

  const available = wallet?.available ?? 0;
  const pending = wallet?.pending ?? 0;
  const totalReceived = wallet?.totalReceived ?? 0;
  const totalFees = wallet?.totalFees ?? 0;

  const tabs = [
    { key: "resumo", label: "Resumo" },
    { key: "links", label: "Links de Pagamento" },
    { key: "extrato", label: "Extrato" },
    { key: "saques", label: "Saques" },
    { key: "contas", label: "Contas PIX" },
  ];

  return (
    <PlatformAppPage currentPath="/financeiro">
      {/* Status toast */}
      {params.status ? (
        <PlatformSurface className="mb-4">
          <div className="px-4 py-3">
            {params.status === "ok" ? (
              <p className="text-sm font-semibold text-green-600">
                {params.saved === "link-created" ? "Link de pagamento criado!" : "Salvo com sucesso"}
              </p>
            ) : (
              <p className="text-sm font-semibold text-red-600">Erro</p>
            )}
            {params.message ? (
              <p className="mt-1 text-sm text-[var(--muted)]">{params.message}</p>
            ) : null}
            {params.checkoutUrl ? (
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={params.checkoutUrl}
                  className="flex-1 rounded-[0.95rem] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 font-mono text-xs text-[var(--foreground)]"
                />
              </div>
            ) : null}
          </div>
        </PlatformSurface>
      ) : null}

      {/* Metric cards */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <PlatformMetricCard
          icon={Wallet}
          label="disponivel"
          value={formatCurrency(available)}
          subtitle="pronto para saque"
        />
        <PlatformMetricCard
          icon={Clock}
          label="pendente"
          value={formatCurrency(pending)}
          subtitle={feeConfig ? `hold ${feeConfig.holdPeriodDays}d` : "aguardando hold"}
        />
        <PlatformMetricCard
          icon={TrendingUp}
          label="total liquido"
          value={formatCurrency(totalReceived - totalFees)}
          subtitle={`fee total: ${formatCurrency(totalFees)}`}
        />
        <PlatformMetricCard
          icon={Percent}
          label="sua taxa"
          value={feeConfig ? `${feeConfig.feePercent}%` : "--"}
          subtitle={feeConfig ? `por transacao · hold ${feeConfig.holdPeriodDays}d` : "carregando..."}
        />
      </section>

      {/* Tabs */}
      <div className="mt-5 flex gap-1 overflow-x-auto rounded-[1rem] border border-[var(--border)] bg-[var(--surface-strong)] p-1">
        {tabs.map((t) => (
          <a
            key={t.key}
            href={`/financeiro${t.key === "resumo" ? "" : `?tab=${t.key}`}`}
            className={`whitespace-nowrap rounded-[0.75rem] px-4 py-2 text-xs font-semibold transition-colors ${
              activeTab === t.key
                ? "bg-[var(--accent)] text-white"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            {t.label}
          </a>
        ))}
      </div>

      {/* Tab: Resumo */}
      {activeTab === "resumo" && (
        <>
          {/* Recent sessions */}
          <PlatformSurface className="mt-5">
            <div className="px-5 py-4">
              <div className="flex items-center justify-between">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                  Ultimas Transacoes ({sessions.count})
                </p>
                <a
                  href="/financeiro?tab=links"
                  className="text-xs font-semibold text-[var(--accent)] hover:underline"
                >
                  Ver todos
                </a>
              </div>
              {sessions.sessions.length === 0 ? (
                <p className="mt-3 text-sm text-[var(--muted)]">Nenhuma transacao ainda.</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {sessions.sessions.slice(0, 5).map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between rounded-[1rem] border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[var(--foreground)]">
                          {formatCurrency(s.amount)}
                          <span className="ml-2 text-xs font-normal text-[var(--muted)]">
                            {s.description}
                          </span>
                        </p>
                        <p className="text-xs text-[var(--muted)]">
                          {s.customerName || s.customerEmail || "Sem cliente"} · {formatRelativeTime(s.createdAt)}
                        </p>
                      </div>
                      <PlatformPill className={STATUS_COLORS[s.status] ?? ""}>
                        {STATUS_LABELS[s.status] ?? s.status}
                      </PlatformPill>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </PlatformSurface>

          {/* Recent splits */}
          <PlatformSurface className="mt-5">
            <div className="px-5 py-4">
              <div className="flex items-center justify-between">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                  Extrato Recente ({splits.total})
                </p>
                <a
                  href="/financeiro?tab=extrato"
                  className="text-xs font-semibold text-[var(--accent)] hover:underline"
                >
                  Ver todos
                </a>
              </div>
              {splits.entries.length === 0 ? (
                <p className="mt-3 text-sm text-[var(--muted)]">Nenhuma transacao ainda.</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {splits.entries.slice(0, 5).map((entry) => (
                    <div
                      key={entry.id as string}
                      className="flex items-center justify-between rounded-[1rem] border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-semibold text-[var(--foreground)]">
                          {formatCurrency(entry.grossAmount as number)}
                          <span className="ml-2 text-xs text-[var(--muted)]">
                            fee {entry.feePercent as number}% → liquido{" "}
                            {formatCurrency(entry.netAmount as number)}
                          </span>
                        </p>
                        <p className="text-xs text-[var(--muted)]">
                          {formatRelativeTime(entry.createdAt as string)}
                          {(entry.entryType as string) === "refund" ? " (estorno)" : ""}
                        </p>
                      </div>
                      <PlatformPill>
                        {(entry.status as string) === "pending"
                          ? "pendente"
                          : (entry.status as string) === "available"
                            ? "disponivel"
                            : (entry.status as string) === "paid_out"
                              ? "pago"
                              : (entry.status as string)}
                      </PlatformPill>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </PlatformSurface>
        </>
      )}

      {/* Tab: Links de Pagamento */}
      {activeTab === "links" && (
        <>
          {/* Create checkout link form */}
          <PlatformSurface className="mt-5">
            <div className="px-5 py-4">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                Criar Link de Pagamento
              </p>
              <form action={createCheckoutLinkAction} className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                    Valor (R$)
                  </span>
                  <input
                    name="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="99.90"
                    className="w-full rounded-[0.95rem] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                    Descricao
                  </span>
                  <input
                    name="description"
                    type="text"
                    required
                    placeholder="Produto ou servico"
                    className="w-full rounded-[0.95rem] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                    Nome do cliente (opcional)
                  </span>
                  <input
                    name="customerName"
                    type="text"
                    placeholder="Joao Silva"
                    className="w-full rounded-[0.95rem] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                    Email do cliente (opcional)
                  </span>
                  <input
                    name="customerEmail"
                    type="email"
                    placeholder="joao@email.com"
                    className="w-full rounded-[0.95rem] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                    Telefone (opcional)
                  </span>
                  <input
                    name="customerPhone"
                    type="text"
                    placeholder="11999999999"
                    className="w-full rounded-[0.95rem] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
                  />
                </label>
                <div className="flex items-end">
                  <button
                    type="submit"
                    className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-strong)]"
                  >
                    Criar Link
                  </button>
                </div>
              </form>
            </div>
          </PlatformSurface>

          {/* Sessions list */}
          <PlatformSurface className="mt-5">
            <div className="px-5 py-4">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                Links de Pagamento ({sessions.count})
              </p>
              {sessions.sessions.length === 0 ? (
                <p className="mt-3 text-sm text-[var(--muted)]">Nenhum link criado ainda.</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {sessions.sessions.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between rounded-[1rem] border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-[var(--foreground)]">
                            {formatCurrency(s.amount)}
                          </p>
                          <PlatformPill className={STATUS_COLORS[s.status] ?? ""}>
                            {STATUS_LABELS[s.status] ?? s.status}
                          </PlatformPill>
                        </div>
                        <p className="text-xs text-[var(--muted)]">
                          {s.description}
                          {s.customerName ? ` · ${s.customerName}` : ""}
                          {s.customerEmail ? ` · ${s.customerEmail}` : ""}
                        </p>
                        <p className="text-xs text-[var(--muted)]">
                          Criado {formatDateTime(s.createdAt)}
                          {s.paidAt ? ` · Pago ${formatDateTime(s.paidAt)}` : ""}
                          {s.status === "open" ? ` · Expira ${formatDateTime(s.expiresAt)}` : ""}
                        </p>
                      </div>
                      <div className="ml-3 flex items-center gap-2">
                        <span className="font-mono text-xs text-[var(--muted)]">{s.shortId}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </PlatformSurface>
        </>
      )}

      {/* Tab: Extrato */}
      {activeTab === "extrato" && (
        <PlatformSurface className="mt-5">
          <div className="px-5 py-4">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
              Extrato ({splits.total})
            </p>
            {splits.entries.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--muted)]">Nenhuma transacao ainda.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {splits.entries.map((entry) => (
                  <div
                    key={entry.id as string}
                    className="flex items-center justify-between rounded-[1rem] border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[var(--foreground)]">
                        {formatCurrency(entry.grossAmount as number)}
                        <span className="ml-2 text-xs text-[var(--muted)]">
                          fee {entry.feePercent as number}% → liquido{" "}
                          {formatCurrency(entry.netAmount as number)}
                        </span>
                      </p>
                      <p className="text-xs text-[var(--muted)]">
                        {formatRelativeTime(entry.createdAt as string)}
                        {(entry.entryType as string) === "refund" ? " (estorno)" : ""}
                      </p>
                    </div>
                    <PlatformPill>
                      {(entry.status as string) === "pending"
                        ? "pendente"
                        : (entry.status as string) === "available"
                          ? "disponivel"
                          : (entry.status as string) === "paid_out"
                            ? "pago"
                            : (entry.status as string)}
                    </PlatformPill>
                  </div>
                ))}
              </div>
            )}
          </div>
        </PlatformSurface>
      )}

      {/* Tab: Saques */}
      {activeTab === "saques" && (
        <>
          <PlatformSurface className="mt-5">
            <div className="px-5 py-4">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                Saques
              </p>
              {payouts.payouts.length === 0 ? (
                <p className="mt-3 text-sm text-[var(--muted)]">Nenhum saque solicitado.</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {payouts.payouts.map((p) => (
                    <div
                      key={p.id as string}
                      className="flex items-center justify-between rounded-[1rem] border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-semibold text-[var(--foreground)]">
                          {formatCurrency(p.amount as number)}
                        </p>
                        <p className="text-xs text-[var(--muted)]">
                          {formatRelativeTime(p.requestedAt as string)}
                          {(p.pixTransferId as string) ? ` · ${p.pixTransferId}` : ""}
                        </p>
                      </div>
                      <PlatformPill>
                        {(p.status as string) === "requested"
                          ? "solicitado"
                          : (p.status as string) === "approved"
                            ? "aprovado"
                            : (p.status as string) === "completed"
                              ? "concluido"
                              : (p.status as string) === "failed"
                                ? "falhou"
                                : (p.status as string)}
                      </PlatformPill>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </PlatformSurface>

          {/* Request payout form */}
          {available > 0 ? (
            <PlatformSurface className="mt-5">
              <div className="px-5 py-4">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                  Solicitar Saque
                </p>
                {feeConfig && feeConfig.minPayoutAmount > 0 ? (
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    Valor minimo: {formatCurrency(feeConfig.minPayoutAmount)}
                  </p>
                ) : null}
                <form action={requestPayoutAction} className="mt-3 flex flex-wrap items-end gap-3">
                  <label className="space-y-1">
                    <span className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                      Valor (centavos)
                    </span>
                    <input
                      name="amount"
                      type="number"
                      defaultValue={available}
                      min={1}
                      max={available}
                      required
                      className="w-40 rounded-[0.95rem] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                      Conta PIX
                    </span>
                    <select
                      name="pixAccountId"
                      required
                      className="w-56 rounded-[0.95rem] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
                    >
                      {pixAccounts.accounts.map((acc) => (
                        <option key={acc.id as string} value={acc.id as string}>
                          {acc.pixKeyType as string}: {acc.pixKey as string} ({acc.holderName as string})
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="submit"
                    className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-strong)]"
                  >
                    Solicitar Saque
                  </button>
                </form>
              </div>
            </PlatformSurface>
          ) : null}
        </>
      )}

      {/* Tab: Contas PIX */}
      {activeTab === "contas" && (
        <PlatformSurface className="mt-5">
          <div className="px-5 py-4">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
              Contas PIX Cadastradas ({pixAccounts.accounts.length})
            </p>
            {pixAccounts.accounts.length > 0 ? (
              <div className="mt-3 space-y-2">
                {pixAccounts.accounts.map((acc) => (
                  <div
                    key={acc.id as string}
                    className="flex items-center justify-between rounded-[1rem] border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[var(--foreground)]">
                        {acc.holderName as string}
                      </p>
                      <p className="text-xs text-[var(--muted)]">
                        {acc.pixKeyType as string}: {acc.pixKey as string}
                        {acc.bankName ? ` · ${acc.bankName}` : ""}
                      </p>
                    </div>
                    {(acc.isPrimary as boolean) ? <PlatformPill>principal</PlatformPill> : null}
                  </div>
                ))}
              </div>
            ) : null}

            <PlatformInset className="mt-4">
              <div className="px-4 py-3">
                <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                  Cadastrar Nova Conta PIX
                </p>
                <form action={createPixAccountAction} className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1">
                    <span className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                      Tipo de Chave
                    </span>
                    <select
                      name="pixKeyType"
                      required
                      className="w-full rounded-[0.95rem] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
                    >
                      <option value="cpf">CPF</option>
                      <option value="cnpj">CNPJ</option>
                      <option value="email">Email</option>
                      <option value="phone">Telefone</option>
                      <option value="random">Aleatoria</option>
                    </select>
                  </label>
                  <label className="space-y-1">
                    <span className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                      Chave PIX
                    </span>
                    <input
                      name="pixKey"
                      type="text"
                      required
                      placeholder="123.456.789-00"
                      className="w-full rounded-[0.95rem] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                      Nome do Titular
                    </span>
                    <input
                      name="holderName"
                      type="text"
                      required
                      className="w-full rounded-[0.95rem] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                      Documento (CPF/CNPJ)
                    </span>
                    <input
                      name="holderDocument"
                      type="text"
                      required
                      className="w-full rounded-[0.95rem] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
                    />
                  </label>
                  <div className="sm:col-span-2">
                    <button
                      type="submit"
                      className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-strong)]"
                    >
                      Cadastrar Conta PIX
                    </button>
                  </div>
                </form>
              </div>
            </PlatformInset>
          </div>
        </PlatformSurface>
      )}
    </PlatformAppPage>
  );
}
