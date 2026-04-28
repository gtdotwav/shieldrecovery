"use client";

import { useEffect, useState, useTransition } from "react";
import {
  ArrowDownRight,
  Banknote,
  Check,
  Clock,
  Key,
  Loader2,
  Plus,
  RefreshCw,
  Send,
  User,
  Wallet,
  X,
  XCircle,
} from "lucide-react";

import { formatCurrency, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  createWithdrawAction,
  cancelWithdrawAction,
  getBalanceAction,
  listWithdrawHistoryAction,
} from "@/app/actions/withdraw-actions";
import { getContactsForWithdrawAction } from "@/app/actions/crm-actions";

/* ── Types ── */

type Balance = { available: number; blocked: number; total: number };

interface WithdrawRecord {
  id: string;
  pagnet_withdraw_id: string | null;
  contact_id: string | null;
  amount: number;
  pix_key: string;
  pix_key_type: string;
  status: string;
  description: string | null;
  error_reason: string | null;
  created_at: string;
  pix_contacts: { name: string } | null;
}

interface ContactOption {
  id: string;
  name: string;
  document: string | null;
  pix_contact_keys: {
    id: string;
    pix_key: string;
    pix_key_type: string;
    label: string | null;
    is_default: boolean;
  }[];
}

const PIX_KEY_TYPES = [
  { value: "cpf", label: "CPF" },
  { value: "cnpj", label: "CNPJ" },
  { value: "email", label: "E-mail" },
  { value: "phone", label: "Telefone" },
  { value: "random_key", label: "Chave aleatória" },
];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  processing: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  cancelled: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  processing: "Processando",
  approved: "Aprovado",
  completed: "Concluído",
  failed: "Falhou",
  cancelled: "Cancelado",
};

export function WithdrawPanel() {
  const [balance, setBalance] = useState<Balance | null>(null);
  const [history, setHistory] = useState<WithdrawRecord[]>([]);
  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedContact, setSelectedContact] = useState<string>("");
  const [selectedKey, setSelectedKey] = useState<string>("");
  const [pixKey, setPixKey] = useState("");
  const [pixKeyType, setPixKeyType] = useState("cpf");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [useManualKey, setUseManualKey] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      const [balRes, histRes, ctRes] = await Promise.all([
        getBalanceAction(),
        listWithdrawHistoryAction(),
        getContactsForWithdrawAction(),
      ]);
      if (balRes.ok) setBalance(balRes.data);
      if (histRes.ok) setHistory(histRes.data as WithdrawRecord[]);
      if (ctRes.ok) setContacts(ctRes.data as ContactOption[]);
    } catch {
      // silent
    }
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  // When contact changes, update PIX key options
  useEffect(() => {
    if (!selectedContact) {
      setSelectedKey("");
      return;
    }
    const contact = contacts.find((c) => c.id === selectedContact);
    if (contact?.pix_contact_keys?.length) {
      const defaultKey = contact.pix_contact_keys.find((k) => k.is_default) ?? contact.pix_contact_keys[0];
      setSelectedKey(defaultKey.id);
      setPixKey(defaultKey.pix_key);
      setPixKeyType(defaultKey.pix_key_type);
    }
  }, [selectedContact, contacts]);

  // When selected key changes
  useEffect(() => {
    if (!selectedKey || !selectedContact) return;
    const contact = contacts.find((c) => c.id === selectedContact);
    const key = contact?.pix_contact_keys?.find((k) => k.id === selectedKey);
    if (key) {
      setPixKey(key.pix_key);
      setPixKeyType(key.pix_key_type);
    }
  }, [selectedKey, selectedContact, contacts]);

  function handleSubmit() {
    setError("");
    setSuccess("");

    if (!amount || !pixKey || !pixKeyType) {
      setError("Preencha todos os campos obrigatórios");
      return;
    }

    const fd = new FormData();
    fd.set("amount", amount);
    fd.set("pixKey", pixKey);
    fd.set("pixKeyType", pixKeyType);
    if (description) fd.set("description", description);
    if (selectedContact && !useManualKey) fd.set("contactId", selectedContact);

    startTransition(async () => {
      const res = await createWithdrawAction(fd);
      if (res.ok) {
        setSuccess("Saque criado com sucesso!");
        setShowForm(false);
        setAmount("");
        setDescription("");
        setPixKey("");
        setSelectedContact("");
        refresh();
      } else {
        setError(res.error);
      }
    });
  }

  function handleCancel(pagnetId: string, localId: string) {
    startTransition(async () => {
      const res = await cancelWithdrawAction(pagnetId, localId);
      if (res.ok) {
        setSuccess("Saque cancelado");
        refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* ── Balance cards ── */}
      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard
          icon={Wallet}
          label="Saldo disponível"
          value={balance ? formatCurrency(balance.available) : "—"}
          loading={loading}
        />
        <MetricCard
          icon={Clock}
          label="Saldo bloqueado"
          value={balance ? formatCurrency(balance.blocked) : "—"}
          loading={loading}
        />
        <MetricCard
          icon={Banknote}
          label="Saldo total"
          value={balance ? formatCurrency(balance.total) : "—"}
          loading={loading}
        />
      </div>

      {/* ── Messages ── */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          <XCircle className="h-4 w-4 shrink-0" />
          {error}
          <button type="button" onClick={() => setError("")} className="ml-auto">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400">
          <Check className="h-4 w-4 shrink-0" />
          {success}
          <button type="button" onClick={() => setSuccess("")} className="ml-auto">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Actions bar ── */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-opacity"
        >
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? "Cancelar" : "Novo Saque"}
        </button>
        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          Atualizar
        </button>
      </div>

      {/* ── New withdraw form ── */}
      {showForm && (
        <PlatformSurface className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Send className="h-5 w-5 text-[var(--accent)]" />
            Realizar Saque PIX
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Contact selector */}
            <div className="sm:col-span-2">
              <div className="flex items-center gap-3 mb-3">
                <button
                  type="button"
                  onClick={() => setUseManualKey(false)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors",
                    !useManualKey
                      ? "border-[var(--accent)]/30 bg-[var(--accent)]/10 text-[var(--accent)]"
                      : "border-gray-200 dark:border-gray-700 text-gray-500",
                  )}
                >
                  <User className="h-3.5 w-3.5 inline mr-1.5" />
                  Contato do CRM
                </button>
                <button
                  type="button"
                  onClick={() => { setUseManualKey(true); setSelectedContact(""); }}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors",
                    useManualKey
                      ? "border-[var(--accent)]/30 bg-[var(--accent)]/10 text-[var(--accent)]"
                      : "border-gray-200 dark:border-gray-700 text-gray-500",
                  )}
                >
                  <Key className="h-3.5 w-3.5 inline mr-1.5" />
                  Chave manual
                </button>
              </div>

              {!useManualKey && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                      Contato
                    </label>
                    <select
                      value={selectedContact}
                      onChange={(e) => setSelectedContact(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#111] px-3 py-2.5 text-sm text-gray-900 dark:text-white"
                    >
                      <option value="">Selecione um contato...</option>
                      {contacts.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.document ? `(${c.document})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedContact && (
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                        Chave PIX
                      </label>
                      <select
                        value={selectedKey}
                        onChange={(e) => setSelectedKey(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#111] px-3 py-2.5 text-sm text-gray-900 dark:text-white"
                      >
                        {contacts
                          .find((c) => c.id === selectedContact)
                          ?.pix_contact_keys?.map((k) => (
                            <option key={k.id} value={k.id}>
                              {k.label ?? PIX_KEY_TYPES.find((t) => t.value === k.pix_key_type)?.label ?? k.pix_key_type}: {k.pix_key}
                              {k.is_default ? " (padrão)" : ""}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {useManualKey && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                      Tipo de Chave
                    </label>
                    <select
                      value={pixKeyType}
                      onChange={(e) => setPixKeyType(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#111] px-3 py-2.5 text-sm text-gray-900 dark:text-white"
                    >
                      {PIX_KEY_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                      Chave PIX
                    </label>
                    <input
                      type="text"
                      value={pixKey}
                      onChange={(e) => setPixKey(e.target.value)}
                      placeholder="CPF, e-mail, telefone ou chave aleatória"
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#111] px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Amount */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                Valor (R$)
              </label>
              <input
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="100,00"
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#111] px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                Descrição (opcional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Pagamento fornecedor"
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#111] px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400"
              />
            </div>

            {/* Selected key preview */}
            {pixKey && (
              <div className="sm:col-span-2 rounded-lg border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#111] p-3">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Key className="h-4 w-4 text-[var(--accent)]" />
                  <span className="font-medium">
                    {PIX_KEY_TYPES.find((t) => t.value === pixKeyType)?.label}:
                  </span>
                  <span className="font-mono">{pixKey}</span>
                  {amount && (
                    <>
                      <span className="mx-2 text-gray-300 dark:text-gray-600">|</span>
                      <Banknote className="h-4 w-4 text-green-500" />
                      <span className="font-semibold text-green-600 dark:text-green-400">
                        R$ {amount}
                      </span>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Submit */}
            <div className="sm:col-span-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isPending || !amount || !pixKey}
                className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Confirmar Saque
              </button>
            </div>
          </div>
        </PlatformSurface>
      )}

      {/* ── Withdraw history ── */}
      <PlatformSurface className="overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <ArrowDownRight className="h-4 w-4 text-[var(--accent)]" />
            Histórico de Saques
            <span className="text-xs font-normal text-gray-400 ml-1">
              ({history.length})
            </span>
          </h3>
        </div>

        {loading && !history.length ? (
          <div className="flex items-center justify-center py-12 text-gray-400">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Carregando...
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <Wallet className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-sm">Nenhum saque realizado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  <th className="px-5 py-3">Data</th>
                  <th className="px-5 py-3">Destinatário</th>
                  <th className="px-5 py-3">Chave PIX</th>
                  <th className="px-5 py-3">Valor</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Descrição</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {history.map((w) => (
                  <tr
                    key={w.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <td className="px-5 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {formatDateTime(w.created_at)}
                    </td>
                    <td className="px-5 py-3 text-gray-900 dark:text-white font-medium">
                      {w.pix_contacts?.name ?? "—"}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[0.65rem] font-medium uppercase text-gray-400 bg-gray-100 dark:bg-gray-800 dark:text-gray-500 px-1.5 py-0.5 rounded">
                          {w.pix_key_type}
                        </span>
                        <span className="font-mono text-xs text-gray-600 dark:text-gray-400">
                          {w.pix_key}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3 font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                      {formatCurrency(w.amount)}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-[0.65rem] font-medium",
                          STATUS_COLORS[w.status] ?? STATUS_COLORS.pending,
                        )}
                      >
                        {STATUS_LABELS[w.status] ?? w.status}
                      </span>
                      {w.error_reason && (
                        <p className="mt-1 text-[0.65rem] text-red-500 max-w-[12rem] truncate" title={w.error_reason}>
                          {w.error_reason}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-500 dark:text-gray-400 text-xs max-w-[10rem] truncate">
                      {w.description ?? "—"}
                    </td>
                    <td className="px-5 py-3">
                      {(w.status === "pending" || w.status === "processing") && w.pagnet_withdraw_id && (
                        <button
                          type="button"
                          onClick={() => handleCancel(w.pagnet_withdraw_id!, w.id)}
                          disabled={isPending}
                          className="inline-flex items-center gap-1 rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-2 py-1 text-xs text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Cancelar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PlatformSurface>
    </div>
  );
}

/* ── Metric card wrapper ── */

function MetricCard({
  icon: Icon,
  label,
  value,
  loading,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  loading?: boolean;
}) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a1a1a] px-5 py-4 transition-colors duration-300">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-[0.68rem] font-medium uppercase tracking-[0.08em] text-gray-400 dark:text-gray-500">
            {label}
          </p>
          {loading ? (
            <div className="h-9 w-24 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ) : (
            <p className="text-[1.85rem] font-semibold tracking-[-0.03em] text-gray-900 dark:text-white sm:text-[2rem]">
              {value}
            </p>
          )}
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--accent)]/10 text-[var(--accent)]">
          <Icon className="h-[17px] w-[17px]" />
        </div>
      </div>
    </div>
  );
}

/* ── Reexported surface for forms ── */

function PlatformSurface({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a1a1a] transition-colors duration-300",
        className,
      )}
    >
      {children}
    </div>
  );
}
