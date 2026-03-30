import { Clock, TrendingUp, Wallet } from "lucide-react";

import { requestPayoutAction, createPixAccountAction } from "@/app/actions/payout-actions";
import {
  PlatformAppPage,
  PlatformInset,
  PlatformMetricCard,
  PlatformPill,
  PlatformSurface,
} from "@/components/platform/platform-shell";
import { formatCurrency, formatRelativeTime } from "@/lib/format";
import { requireAuthenticatedSession } from "@/server/auth/session";
import { getSellerIdentityByEmail } from "@/server/auth/identities";
import { getStorageService } from "@/server/recovery/services/storage";
import {
  getSellerWallet,
  getSellerSplits,
  getSellerPayouts,
  getSellerPixAccounts,
} from "@/server/checkout";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Financeiro",
};

type PageProps = {
  searchParams?: Promise<{
    status?: string;
    saved?: string;
    message?: string;
  }>;
};

export default async function FinanceiroPage({ searchParams }: PageProps) {
  const session = await requireAuthenticatedSession(["admin", "seller"]);
  const params = (await searchParams) ?? {};

  // Resolve seller → checkout config
  const identity = await getSellerIdentityByEmail(session.email);
  const storage = getStorageService();

  let checkoutConfigured = false;
  let overrides: { baseUrl?: string; apiKey: string } | null = null;

  if (identity) {
    const controls = await storage.getSellerAdminControls(identity.agentName);
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

  // Fetch financial data in parallel
  let wallet: Record<string, number> | null = null;
  let splits: { entries: Record<string, unknown>[]; total: number } = { entries: [], total: 0 };
  let payouts: { payouts: Record<string, unknown>[] } = { payouts: [] };
  let pixAccounts: { accounts: Record<string, unknown>[] } = { accounts: [] };

  try {
    const results = await Promise.all([
      getSellerWallet(overrides!),
      getSellerSplits(1, overrides!),
      getSellerPayouts(overrides!),
      getSellerPixAccounts(overrides!),
    ]);
    wallet = results[0] as Record<string, number>;
    splits = results[1] as typeof splits;
    payouts = results[2] as typeof payouts;
    pixAccounts = results[3] as typeof pixAccounts;
  } catch {
    // Split system may not be deployed yet
  }

  const available = wallet?.available ?? 0;
  const pending = wallet?.pending ?? 0;
  const totalReceived = wallet?.totalReceived ?? 0;
  const totalFees = wallet?.totalFees ?? 0;

  return (
    <PlatformAppPage currentPath="/financeiro">
      {/* Status toast */}
      {params.status ? (
        <PlatformSurface className="mb-4">
          <div className="px-4 py-3">
            {params.status === "ok" ? (
              <p className="text-sm font-semibold text-green-600">Salvo com sucesso</p>
            ) : (
              <p className="text-sm font-semibold text-red-600">Erro</p>
            )}
            {params.message ? (
              <p className="mt-1 text-sm text-[var(--muted)]">{params.message}</p>
            ) : null}
          </div>
        </PlatformSurface>
      ) : null}

      {/* Balance cards */}
      <section className="grid gap-3 sm:grid-cols-3">
        <PlatformMetricCard
          icon={Wallet}
          label="disponivel"
          value={formatCurrency(available / 100)}
          subtitle="pronto para saque"
        />
        <PlatformMetricCard
          icon={Clock}
          label="pendente"
          value={formatCurrency(pending / 100)}
          subtitle="aguardando periodo de hold"
        />
        <PlatformMetricCard
          icon={TrendingUp}
          label="total liquido"
          value={formatCurrency((totalReceived - totalFees) / 100)}
          subtitle={`fee total: ${formatCurrency(totalFees / 100)}`}
        />
      </section>

      {/* Split history (extrato) */}
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
                      {formatCurrency((entry.grossAmount as number) / 100)}
                      <span className="ml-2 text-xs text-[var(--muted)]">
                        fee {entry.feePercent as number}% → liquido{" "}
                        {formatCurrency((entry.netAmount as number) / 100)}
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

      {/* Payouts history */}
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
                      {formatCurrency((p.amount as number) / 100)}
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

      {/* Register PIX account */}
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
    </PlatformAppPage>
  );
}
