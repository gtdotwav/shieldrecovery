import { redirect } from "next/navigation";
import {
  ArrowUpRight,
  CheckCircle2,
  Clock,
  MessageSquare,
  TrendingUp,
  AlertCircle,
  Wifi,
  WifiOff,
} from "lucide-react";

import { verifyEmbedToken } from "@/server/auth/embed-tokens";
import { getStorageService } from "@/server/recovery/services/storage";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ t?: string }>;
};

export default async function EmbedRecoveryPage({ searchParams }: Props) {
  const { t: token } = await searchParams;
  if (!token) redirect("/login");

  const payload = await verifyEmbedToken(token);
  if (!payload) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-semibold">Token expirado</h2>
          <p className="text-sm text-gray-500 mt-1">
            Gere um novo token de embed para continuar.
          </p>
        </div>
      </div>
    );
  }

  const storage = getStorageService();
  const controls = await storage.getSellerAdminControls();
  const control = controls.find((c) => c.sellerKey === payload.sellerKey);

  if (!control) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertCircle className="w-10 h-10 text-yellow-500 mx-auto mb-3" />
          <h2 className="text-lg font-semibold">Seller nao encontrado</h2>
        </div>
      </div>
    );
  }

  const [analytics, contacts, conversations] = await Promise.all([
    storage.getAnalytics(control.sellerName),
    storage.getFollowUpContacts(control.sellerName),
    storage.getInboxConversations(control.sellerName),
  ]);

  const whatsappStatus = control.whatsappInstanceStatus ?? "disconnected";
  const whatsappPhone = control.whatsappInstancePhone;

  const stats = [
    {
      label: "Pagamentos Falhos",
      value: analytics.total_failed_payments,
      icon: AlertCircle,
      color: "text-red-500",
      bg: "bg-red-500/10",
    },
    {
      label: "Recuperados",
      value: analytics.recovered_payments,
      icon: CheckCircle2,
      color: "text-green-500",
      bg: "bg-green-500/10",
    },
    {
      label: "Taxa de Recuperacao",
      value: `${analytics.recovery_rate}%`,
      icon: TrendingUp,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      label: "Receita Recuperada",
      value: formatCurrency(analytics.recovered_revenue),
      icon: ArrowUpRight,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Leads Ativos",
      value: analytics.active_recoveries,
      icon: Clock,
      color: "text-orange-500",
      bg: "bg-orange-500/10",
    },
    {
      label: "Tempo Medio (h)",
      value: analytics.average_recovery_time_hours ?? "-",
      icon: Clock,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
  ];

  const recentLeads = contacts.slice(0, 10);
  const recentConversations = conversations.slice(0, 5);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">I.A Recovery</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {control.sellerName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {whatsappStatus === "connected" ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-green-500/10 text-green-600 dark:text-green-400">
              <Wifi className="w-3.5 h-3.5" />
              WhatsApp {whatsappPhone ?? "conectado"}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-500">
              <WifiOff className="w-3.5 h-3.5" />
              WhatsApp desconectado
            </span>
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a1a1a] p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-7 h-7 rounded-lg ${s.bg} flex items-center justify-center`}>
                <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
              </div>
            </div>
            <p className="text-xl font-bold tracking-tight">{s.value}</p>
            <p className="text-[0.65rem] text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
              {s.label}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Leads table */}
        <div className="lg:col-span-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a1a1a] overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-sm font-semibold">Leads recentes</h2>
          </div>
          {recentLeads.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              Nenhum lead de recuperacao ainda.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400">
                    <th className="text-left px-4 py-2.5 font-medium">Cliente</th>
                    <th className="text-left px-4 py-2.5 font-medium">Produto</th>
                    <th className="text-right px-4 py-2.5 font-medium">Valor</th>
                    <th className="text-left px-4 py-2.5 font-medium">Status</th>
                    <th className="text-left px-4 py-2.5 font-medium">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLeads.map((c) => (
                    <tr
                      key={c.lead_id}
                      className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30"
                    >
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-gray-900 dark:text-white truncate max-w-[10rem]">
                          {c.customer_name || "—"}
                        </p>
                        <p className="text-[0.6rem] text-gray-400 truncate max-w-[10rem]">
                          {c.phone || c.email || "—"}
                        </p>
                      </td>
                      <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300 truncate max-w-[8rem]">
                        {c.product || "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium text-gray-900 dark:text-white">
                        {formatCurrency(c.payment_value)}
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusBadge status={c.lead_status} />
                      </td>
                      <td className="px-4 py-2.5 text-gray-400">
                        {formatDate(c.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Conversations */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a1a1a] overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-sm font-semibold">Conversas</h2>
          </div>
          {recentConversations.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              Nenhuma conversa ainda.
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {recentConversations.map((c) => (
                <div key={c.conversation_id} className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                      <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium truncate">
                          {c.customer_name || c.contact_value}
                        </p>
                        {c.unread_count > 0 && (
                          <span className="shrink-0 w-4.5 h-4.5 rounded-full bg-blue-500 text-white text-[0.55rem] flex items-center justify-center font-bold">
                            {c.unread_count}
                          </span>
                        )}
                      </div>
                      <p className="text-[0.65rem] text-gray-400 truncate mt-0.5">
                        {c.last_message_preview || "Sem mensagens"}
                      </p>
                      <p className="text-[0.6rem] text-gray-400 mt-1">
                        {formatDate(c.last_message_at)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center pt-2 pb-4">
        <p className="text-[0.6rem] text-gray-400">
          Powered by PagRecovery — Recuperacao inteligente de pagamentos
        </p>
      </div>
    </div>
  );
}

// ─── Helpers ───

function formatCurrency(value?: number | null): string {
  if (value == null) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(date?: string | null): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

function StatusBadge({ status }: { status?: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    new: { label: "Novo", cls: "bg-blue-500/10 text-blue-600" },
    contacted: { label: "Contatado", cls: "bg-yellow-500/10 text-yellow-600" },
    negotiating: { label: "Negociando", cls: "bg-orange-500/10 text-orange-600" },
    recovered: { label: "Recuperado", cls: "bg-green-500/10 text-green-600" },
    lost: { label: "Perdido", cls: "bg-red-500/10 text-red-600" },
  };

  const entry = map[status ?? ""] ?? { label: status ?? "—", cls: "bg-gray-100 text-gray-500" };

  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[0.6rem] font-medium ${entry.cls}`}>
      {entry.label}
    </span>
  );
}
