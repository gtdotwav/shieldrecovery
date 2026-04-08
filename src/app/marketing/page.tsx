"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  Eye,
  Megaphone,
  MessageSquare,
  Pencil,
  Phone,
  Plus,
  Save,
  Star,
  Target,
  Trash2,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";

import type { MarketingDataPoint } from "@/components/ui/marketing-chart";
import { MarketingChart } from "@/components/ui/marketing-chart";

/* ── Types ── */

type Highlight = {
  title: string;
  metric: string;
  description: string;
};

type AudienceSegment = {
  name: string;
  size: number;
  conversion_rate: number;
  description: string;
};

type Channels = {
  whatsapp?: number;
  email?: number;
  voice?: number;
  sms?: number;
};

type Scenario = {
  id?: string;
  name: string;
  description: string;
  is_active: boolean;
  chart_data: MarketingDataPoint[];
  total_recovered: number;
  total_revenue: number;
  recovery_rate: number;
  avg_recovery_time_hours: number;
  active_recoveries: number;
  highlights: Highlight[];
  channels: Channels;
  strategy_notes: string;
  audience_segments: AudienceSegment[];
};

const DEFAULT_MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"];

function defaultScenario(): Scenario {
  return {
    name: "Novo cenário",
    description: "",
    is_active: false,
    chart_data: DEFAULT_MONTHS.map((label) => ({
      label,
      recovered: 0,
      lost: 0,
      revenue: 0,
    })),
    total_recovered: 0,
    total_revenue: 0,
    recovery_rate: 0,
    avg_recovery_time_hours: 0,
    active_recoveries: 0,
    highlights: [
      { title: "Taxa de sucesso", metric: "0%", description: "Percentual de vendas recuperadas" },
      { title: "Tempo médio", metric: "0h", description: "Tempo até a recuperação" },
      { title: "ROI", metric: "0x", description: "Retorno sobre investimento" },
    ],
    channels: { whatsapp: 0, email: 0, voice: 0 },
    strategy_notes: "",
    audience_segments: [],
  };
}

/* ── Helper components ── */

function KpiCard({
  icon: Icon,
  label,
  value,
  subtitle,
  editable,
  onValueChange,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  subtitle?: string;
  editable?: boolean;
  onValueChange?: (value: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a1a1a] px-5 py-4 transition-colors duration-300">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <p className="text-[0.68rem] font-medium uppercase tracking-[0.08em] text-gray-400 dark:text-gray-500">
            {label}
          </p>
          {isEditing ? (
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={() => {
                setIsEditing(false);
                onValueChange?.(editValue);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setIsEditing(false);
                  onValueChange?.(editValue);
                }
              }}
              className="text-[1.85rem] font-semibold tracking-[-0.03em] text-gray-900 dark:text-white sm:text-[2rem] bg-transparent border-b-2 border-[var(--accent)] outline-none w-full"
              autoFocus
            />
          ) : (
            <p
              className={`text-[1.85rem] font-semibold tracking-[-0.03em] text-gray-900 dark:text-white sm:text-[2rem] ${editable ? "cursor-pointer hover:text-[var(--accent)] transition-colors" : ""}`}
              onClick={() => editable && setIsEditing(true)}
            >
              {value}
            </p>
          )}
          {subtitle ? (
            <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{subtitle}</p>
          ) : null}
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--accent)]/10 text-[var(--accent)]">
          <Icon className="h-[17px] w-[17px]" />
        </div>
      </div>
    </div>
  );
}

function ChannelBar({
  label,
  icon: Icon,
  count,
  total,
  color,
}: {
  label: string;
  icon: React.ElementType;
  count: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 text-gray-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{label}</span>
        </div>
        <span className="text-sm tabular-nums text-gray-500 dark:text-gray-400">
          {count} <span className="text-gray-400 dark:text-gray-500">({pct}%)</span>
        </span>
      </div>
      <div className="mt-1.5 h-1.5 rounded-full bg-gray-100 dark:bg-gray-800">
        <div
          className={`h-1.5 rounded-full transition-all duration-700 ease-out ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ── Main Page ── */

export default function MarketingPage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [active, setActive] = useState<Scenario | null>(null);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<"dashboard" | "highlights" | "audience" | "strategy">("dashboard");

  // Load scenarios on mount
  useEffect(() => {
    fetch("/api/marketing/scenarios")
      .then((r) => r.json())
      .then((data) => {
        const list = data.scenarios || [];
        setScenarios(list);
        const activeOne = list.find((s: Scenario) => s.is_active) || list[0];
        if (activeOne) setActive(activeOne);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const saveScenario = useCallback(
    async (scenario: Scenario) => {
      setSaving(true);
      try {
        const method = scenario.id ? "PUT" : "POST";
        const res = await fetch("/api/marketing/scenarios", {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(scenario),
        });
        const data = await res.json();
        if (data.scenario) {
          setScenarios((prev) => {
            const exists = prev.findIndex((s) => s.id === data.scenario.id);
            if (exists >= 0) {
              const updated = [...prev];
              updated[exists] = data.scenario;
              return updated;
            }
            return [data.scenario, ...prev];
          });
          setActive(data.scenario);
        }
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  const createNew = useCallback(() => {
    const s = defaultScenario();
    setActive(s);
  }, []);

  const deleteScenario = useCallback(
    async (id: string) => {
      await fetch(`/api/marketing/scenarios?id=${id}`, { method: "DELETE" });
      setScenarios((prev) => prev.filter((s) => s.id !== id));
      if (active?.id === id) {
        setActive(scenarios.find((s) => s.id !== id) || null);
      }
    },
    [active, scenarios],
  );

  const updateActive = useCallback(
    (patch: Partial<Scenario>) => {
      if (!active) return;
      setActive({ ...active, ...patch });
    },
    [active],
  );

  const recalcKpis = useCallback(
    (chartData: MarketingDataPoint[]) => {
      const totalRec = chartData.reduce((s, d) => s + d.recovered, 0);
      const totalLost = chartData.reduce((s, d) => s + d.lost, 0);
      const totalRev = chartData.reduce((s, d) => s + d.revenue, 0);
      const total = totalRec + totalLost;
      const rate = total > 0 ? (totalRec / total) * 100 : 0;
      updateActive({
        chart_data: chartData,
        total_recovered: totalRec,
        total_revenue: totalRev,
        recovery_rate: parseFloat(rate.toFixed(1)),
        active_recoveries: totalLost,
      });
    },
    [updateActive],
  );

  if (!loaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f5f5f7] dark:bg-[#0d0d0d]">
        <div className="animate-pulse text-gray-400">Carregando painel de marketing...</div>
      </div>
    );
  }

  const totalChannels =
    (active?.channels.whatsapp || 0) +
    (active?.channels.email || 0) +
    (active?.channels.voice || 0) +
    (active?.channels.sms || 0);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen bg-[#f5f5f7] dark:bg-[#0d0d0d] overflow-hidden transition-colors duration-300">
      {/* Sidebar — Scenarios */}
      <aside className="hidden lg:flex w-72 bg-white dark:bg-[#111111] border-r border-gray-200 dark:border-gray-800 flex-col h-screen sticky top-0 transition-colors duration-300">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center">
              <Megaphone className="w-4 h-4 text-[var(--accent)]" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-gray-900 dark:text-white">Marketing</h1>
              <p className="text-[0.65rem] text-gray-400">Cenários e estratégias</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {scenarios.map((s) => (
            <button
              key={s.id}
              onClick={() => setActive(s)}
              className={`w-full text-left rounded-lg px-3 py-2.5 transition-colors ${
                active?.id === s.id
                  ? "bg-[var(--accent)]/10 text-[var(--accent)]"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium truncate">{s.name}</span>
                {s.is_active && (
                  <span className="shrink-0 ml-2 w-2 h-2 rounded-full bg-[var(--accent)]" />
                )}
              </div>
              {s.description && (
                <p className="text-[0.65rem] text-gray-400 mt-0.5 truncate">{s.description}</p>
              )}
            </button>
          ))}
        </div>

        <div className="p-3 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={createNew}
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Novo cenário
          </button>
        </div>
      </aside>

      {/* Mobile header bar — visible only below lg */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white dark:bg-[#111111] border-b border-gray-200 dark:border-gray-800 px-4 py-2.5 transition-colors duration-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Abrir cenarios"
              aria-expanded={mobileMenuOpen}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {active?.name || "Marketing"}
              </p>
              {active?.description && (
                <p className="text-[0.65rem] text-gray-400 truncate">{active.description}</p>
              )}
            </div>
          </div>
          {active && (
            <button
              onClick={() => saveScenario(active)}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              {saving ? "..." : "Salvar"}
            </button>
          )}
        </div>

        {/* Mobile scenario dropdown */}
        {mobileMenuOpen && (
          <div className="mt-2 border-t border-gray-200 dark:border-gray-800 pt-2 max-h-60 overflow-y-auto">
            {scenarios.map((s) => (
              <button
                key={s.id}
                onClick={() => { setActive(s); setMobileMenuOpen(false); }}
                className={`w-full text-left rounded-lg px-3 py-2 transition-colors ${
                  active?.id === s.id
                    ? "bg-[var(--accent)]/10 text-[var(--accent)]"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium truncate">{s.name}</span>
                  {s.is_active && (
                    <span className="shrink-0 ml-2 w-2 h-2 rounded-full bg-[var(--accent)]" />
                  )}
                </div>
              </button>
            ))}
            <button
              onClick={() => { createNew(); setMobileMenuOpen(false); }}
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 px-3 py-2 mt-1 text-xs font-medium text-gray-500 dark:text-gray-400 hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Novo cenario
            </button>
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden lg:mt-0 mt-[52px]">
        {/* Header */}
        {active && (
          <header className="bg-white dark:bg-[#1a1a1a] border-b border-gray-200 dark:border-gray-800 px-6 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4 min-w-0">
              <input
                value={active.name}
                onChange={(e) => updateActive({ name: e.target.value })}
                className="text-lg font-semibold text-gray-900 dark:text-white bg-transparent border-none outline-none min-w-0"
                placeholder="Nome do cenário"
              />
              <input
                value={active.description}
                onChange={(e) => updateActive({ description: e.target.value })}
                className="text-sm text-gray-400 bg-transparent border-none outline-none min-w-0 hidden sm:block"
                placeholder="Descrição..."
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <label className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <input
                  type="checkbox"
                  checked={active.is_active}
                  onChange={(e) => updateActive({ is_active: e.target.checked })}
                  className="rounded accent-[var(--accent)]"
                />
                Ativo
              </label>
              {active.id && (
                <button
                  onClick={() => active.id && deleteScenario(active.id)}
                  className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={() => saveScenario(active)}
                disabled={saving}
                className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                <Save className="h-3.5 w-3.5" />
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </header>
        )}

        {/* Tabs */}
        {active && (
          <div className="bg-white dark:bg-[#1a1a1a] border-b border-gray-200 dark:border-gray-800 px-6 flex gap-1">
            {(
              [
                { key: "dashboard" as const, label: "Painel", icon: BarChart3 },
                { key: "highlights" as const, label: "Destaques", icon: Star },
                { key: "audience" as const, label: "Audiência", icon: Users },
                { key: "strategy" as const, label: "Estratégia", icon: Target },
              ] as const
            ).map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                  tab === t.key
                    ? "border-[var(--accent)] text-[var(--accent)]"
                    : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                }`}
              >
                <t.icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        <main className="flex-1 overflow-y-auto px-6 py-6 pb-20">
          {!active ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Megaphone className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Painel de Marketing</h2>
              <p className="mt-1 text-sm text-gray-400 max-w-sm">
                Crie cenários para visualizar e editar dados de recuperação. Use para estratégias de captação e apresentações.
              </p>
              <button
                onClick={createNew}
                className="mt-6 flex items-center gap-2 rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
              >
                <Plus className="h-4 w-4" />
                Criar primeiro cenário
              </button>
            </div>
          ) : tab === "dashboard" ? (
            <DashboardTab active={active} updateActive={updateActive} recalcKpis={recalcKpis} totalChannels={totalChannels} />
          ) : tab === "highlights" ? (
            <HighlightsTab active={active} updateActive={updateActive} />
          ) : tab === "audience" ? (
            <AudienceTab active={active} updateActive={updateActive} />
          ) : (
            <StrategyTab active={active} updateActive={updateActive} />
          )}
        </main>
      </div>
    </div>
  );
}

/* ── Dashboard Tab ── */

function DashboardTab({
  active,
  updateActive,
  recalcKpis,
  totalChannels,
}: {
  active: Scenario;
  updateActive: (patch: Partial<Scenario>) => void;
  recalcKpis: (chartData: MarketingDataPoint[]) => void;
  totalChannels: number;
}) {
  return (
    <div className="space-y-5">
      {/* KPIs */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={CreditCard}
          label="em recuperação"
          value={active.active_recoveries.toString()}
          subtitle="casos ativos"
          editable
          onValueChange={(v) => updateActive({ active_recoveries: parseInt(v) || 0 })}
        />
        <KpiCard
          icon={CheckCircle2}
          label="recuperados"
          value={active.total_recovered.toString()}
          subtitle={`R$ ${active.total_revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
          editable
          onValueChange={(v) => updateActive({ total_recovered: parseInt(v) || 0 })}
        />
        <KpiCard
          icon={TrendingUp}
          label="taxa de recuperação"
          value={`${active.recovery_rate}%`}
          subtitle="conversão de recuperação"
          editable
          onValueChange={(v) => updateActive({ recovery_rate: parseFloat(v.replace("%", "")) || 0 })}
        />
        <KpiCard
          icon={Clock}
          label="tempo médio"
          value={active.avg_recovery_time_hours > 24
            ? `${(active.avg_recovery_time_hours / 24).toFixed(1)}d`
            : `${active.avg_recovery_time_hours}h`
          }
          subtitle="até fechar recuperação"
          editable
          onValueChange={(v) => {
            const num = parseFloat(v.replace("d", "").replace("h", "")) || 0;
            updateActive({ avg_recovery_time_hours: v.includes("d") ? num * 24 : num });
          }}
        />
      </section>

      {/* Chart */}
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(17rem,0.85fr)]">
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a1a1a] p-5 sm:p-6 lg:p-7 transition-colors">
          <div className="flex flex-col gap-3 border-b border-gray-200 dark:border-gray-800 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[0.65rem] font-medium uppercase tracking-[0.08em] text-gray-400 dark:text-gray-500">
                Evolução mensal
              </p>
              <h3 className="mt-1.5 text-base font-semibold tracking-[-0.02em] text-gray-900 dark:text-white">
                Pagamentos recuperados
              </h3>
            </div>
            <div className="flex flex-wrap gap-2">
              <LegendPill color="bg-[var(--accent)]">recuperadas</LegendPill>
              <LegendPill color="bg-gray-400 opacity-50">abertas</LegendPill>
            </div>
          </div>
          <div className="mt-5 -mx-1">
            <MarketingChart
              data={active.chart_data}
              onDataChange={recalcKpis}
              editable
            />
          </div>
        </div>

        {/* Sidebar metrics */}
        <div className="space-y-5">
          {/* Revenue card */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a1a1a] p-5 transition-colors">
            <p className="text-[0.65rem] font-medium uppercase tracking-[0.08em] text-gray-400 dark:text-gray-500">
              Receita recuperada total
            </p>
            <p className="mt-2 text-2xl font-bold text-[var(--accent)] tabular-nums">
              R$ {active.total_revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
            <input
              type="number"
              value={active.total_revenue}
              onChange={(e) => updateActive({ total_revenue: parseFloat(e.target.value) || 0 })}
              className="mt-2 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#111] px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:border-[var(--accent)] focus:outline-none"
              step="0.01"
            />
          </div>

          {/* Channel mix */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a1a1a] p-5 transition-colors">
            <p className="text-[0.65rem] font-medium uppercase tracking-[0.08em] text-gray-400 dark:text-gray-500 mb-4">
              Canais de recuperação
            </p>
            <div className="space-y-3.5">
              <ChannelBar label="WhatsApp" icon={MessageSquare} count={active.channels.whatsapp || 0} total={totalChannels || 1} color="bg-[var(--accent)]" />
              <ChannelBar label="Email" icon={Zap} count={active.channels.email || 0} total={totalChannels || 1} color="bg-blue-500" />
              <ChannelBar label="Voz" icon={Phone} count={active.channels.voice || 0} total={totalChannels || 1} color="bg-purple-500" />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <label className="block">
                <span className="text-[0.6rem] text-gray-400">WhatsApp</span>
                <input
                  type="number" min="0"
                  value={active.channels.whatsapp || 0}
                  onChange={(e) => updateActive({ channels: { ...active.channels, whatsapp: parseInt(e.target.value) || 0 } })}
                  className="w-full rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#111] px-2 py-1 text-xs"
                />
              </label>
              <label className="block">
                <span className="text-[0.6rem] text-gray-400">Email</span>
                <input
                  type="number" min="0"
                  value={active.channels.email || 0}
                  onChange={(e) => updateActive({ channels: { ...active.channels, email: parseInt(e.target.value) || 0 } })}
                  className="w-full rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#111] px-2 py-1 text-xs"
                />
              </label>
              <label className="block">
                <span className="text-[0.6rem] text-gray-400">Voz</span>
                <input
                  type="number" min="0"
                  value={active.channels.voice || 0}
                  onChange={(e) => updateActive({ channels: { ...active.channels, voice: parseInt(e.target.value) || 0 } })}
                  className="w-full rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#111] px-2 py-1 text-xs"
                />
              </label>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ── Highlights Tab ── */

function HighlightsTab({
  active,
  updateActive,
}: {
  active: Scenario;
  updateActive: (patch: Partial<Scenario>) => void;
}) {
  const addHighlight = () => {
    updateActive({
      highlights: [
        ...active.highlights,
        { title: "Novo destaque", metric: "0", description: "" },
      ],
    });
  };

  const updateHighlight = (index: number, patch: Partial<Highlight>) => {
    const updated = [...active.highlights];
    updated[index] = { ...updated[index], ...patch };
    updateActive({ highlights: updated });
  };

  const removeHighlight = (index: number) => {
    updateActive({
      highlights: active.highlights.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Destaques para apresentação</h2>
          <p className="text-sm text-gray-400">Métricas-chave para usar em materiais de marketing e captação.</p>
        </div>
        <button
          onClick={addHighlight}
          className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white hover:opacity-90 transition-opacity"
        >
          <Plus className="h-3.5 w-3.5" />
          Adicionar
        </button>
      </div>

      {/* Preview cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {active.highlights.map((h, i) => (
          <div
            key={i}
            className="group relative rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a1a1a] p-6 transition-all hover:border-[var(--accent)]/30"
          >
            <button
              onClick={() => removeHighlight(i)}
              className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1 rounded text-gray-400 hover:text-red-500 transition-all"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>

            <div className="w-10 h-10 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center mb-4">
              <ArrowUpRight className="w-5 h-5 text-[var(--accent)]" />
            </div>

            <input
              value={h.metric}
              onChange={(e) => updateHighlight(i, { metric: e.target.value })}
              className="text-3xl font-bold text-gray-900 dark:text-white bg-transparent border-none outline-none w-full"
              placeholder="0%"
            />
            <input
              value={h.title}
              onChange={(e) => updateHighlight(i, { title: e.target.value })}
              className="mt-1 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-transparent border-none outline-none w-full"
              placeholder="Título"
            />
            <input
              value={h.description}
              onChange={(e) => updateHighlight(i, { description: e.target.value })}
              className="mt-1 text-xs text-gray-400 bg-transparent border-none outline-none w-full"
              placeholder="Descrição do destaque"
            />
          </div>
        ))}
      </div>

      {/* Marketing showcase preview */}
      {active.highlights.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <Eye className="h-4 w-4 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300">
              Preview — Como aparece para o público
            </h3>
          </div>
          <div className="rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 p-8 bg-gradient-to-br from-gray-50 to-white dark:from-[#111] dark:to-[#1a1a1a]">
            <div className="text-center mb-8">
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">
                Resultados comprovados
              </p>
              <h2 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                Recuperação inteligente de pagamentos
              </h2>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-3xl mx-auto">
              {active.highlights.map((h, i) => (
                <div key={i} className="text-center">
                  <p className="text-4xl font-black text-[var(--accent)]">{h.metric}</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{h.title}</p>
                  <p className="mt-0.5 text-xs text-gray-400">{h.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Audience Tab ── */

function AudienceTab({
  active,
  updateActive,
}: {
  active: Scenario;
  updateActive: (patch: Partial<Scenario>) => void;
}) {
  const addSegment = () => {
    updateActive({
      audience_segments: [
        ...active.audience_segments,
        { name: "Novo segmento", size: 0, conversion_rate: 0, description: "" },
      ],
    });
  };

  const updateSegment = (index: number, patch: Partial<AudienceSegment>) => {
    const updated = [...active.audience_segments];
    updated[index] = { ...updated[index], ...patch };
    updateActive({ audience_segments: updated });
  };

  const removeSegment = (index: number) => {
    updateActive({
      audience_segments: active.audience_segments.filter((_, i) => i !== index),
    });
  };

  const totalSize = active.audience_segments.reduce((s, seg) => s + seg.size, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Segmentos de audiência</h2>
          <p className="text-sm text-gray-400">Defina públicos-alvo para estratégias de captação.</p>
        </div>
        <button
          onClick={addSegment}
          className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white hover:opacity-90 transition-opacity"
        >
          <Plus className="h-3.5 w-3.5" />
          Segmento
        </button>
      </div>

      {active.audience_segments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-12 text-center">
          <Users className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-400">Nenhum segmento definido.</p>
          <p className="text-xs text-gray-400 mt-1">Adicione segmentos para mapear públicos potenciais.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Summary bar */}
          {totalSize > 0 && (
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a1a1a] p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-500">Composição total: {totalSize.toLocaleString()} empresas</span>
              </div>
              <div className="flex h-3 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800">
                {active.audience_segments.map((seg, i) => {
                  const pct = totalSize > 0 ? (seg.size / totalSize) * 100 : 0;
                  const colors = ["bg-[var(--accent)]", "bg-blue-500", "bg-purple-500", "bg-amber-500", "bg-rose-500"];
                  return (
                    <div
                      key={i}
                      className={`h-full ${colors[i % colors.length]} transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                      title={`${seg.name}: ${pct.toFixed(0)}%`}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Segment cards */}
          {active.audience_segments.map((seg, i) => {
            const colors = ["border-[var(--accent)]/30", "border-blue-500/30", "border-purple-500/30", "border-amber-500/30", "border-rose-500/30"];
            const bgColors = ["bg-[var(--accent)]/5", "bg-blue-500/5", "bg-purple-500/5", "bg-amber-500/5", "bg-rose-500/5"];
            return (
              <div
                key={i}
                className={`rounded-xl border ${colors[i % colors.length]} ${bgColors[i % bgColors.length]} p-5 transition-colors`}
              >
                <div className="flex items-start justify-between mb-3">
                  <input
                    value={seg.name}
                    onChange={(e) => updateSegment(i, { name: e.target.value })}
                    className="text-sm font-semibold text-gray-900 dark:text-white bg-transparent border-none outline-none"
                    placeholder="Nome do segmento"
                  />
                  <button
                    onClick={() => removeSegment(i)}
                    className="p-1 rounded text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <label className="block">
                    <span className="text-[0.6rem] font-medium uppercase tracking-wider text-gray-400">Tamanho</span>
                    <input
                      type="number" min="0"
                      value={seg.size}
                      onChange={(e) => updateSegment(i, { size: parseInt(e.target.value) || 0 })}
                      className="mt-0.5 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#111] px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[0.6rem] font-medium uppercase tracking-wider text-gray-400">Conversao %</span>
                    <input
                      type="number" min="0" max="100" step="0.1"
                      value={seg.conversion_rate}
                      onChange={(e) => updateSegment(i, { conversion_rate: parseFloat(e.target.value) || 0 })}
                      className="mt-0.5 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#111] px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[0.6rem] font-medium uppercase tracking-wider text-gray-400">Potencial</span>
                    <p className="mt-0.5 px-3 py-1.5 text-sm font-semibold text-[var(--accent)]">
                      {Math.round(seg.size * (seg.conversion_rate / 100))} clientes
                    </p>
                  </label>
                </div>
                <input
                  value={seg.description}
                  onChange={(e) => updateSegment(i, { description: e.target.value })}
                  className="mt-3 w-full text-xs text-gray-400 bg-transparent border-none outline-none"
                  placeholder="Descrição do segmento (ex: e-commerces com +1000 transações/mês)"
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Strategy Tab ── */

function StrategyTab({
  active,
  updateActive,
}: {
  active: Scenario;
  updateActive: (patch: Partial<Scenario>) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Notas de estratégia</h2>
        <p className="text-sm text-gray-400">Documente abordagens, roteiros e planos de captação.</p>
      </div>

      {/* Quick action cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StrategyCard
          icon={Target}
          title="Proposta de valor"
          description="O que diferencia a PagRecovery? Destaque a recuperação automática com IA."
        />
        <StrategyCard
          icon={DollarSign}
          title="Modelo de preço"
          description="Comissão sobre recuperado. Zero custo fixo. Zero risco para o cliente."
        />
        <StrategyCard
          icon={TrendingUp}
          title="Caso de sucesso"
          description="Use os dados do cenário como prova social. Mostre ROI concreto."
        />
      </div>

      {/* Strategy notes editor */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a1a1a] p-6 transition-colors">
        <div className="flex items-center gap-2 mb-4">
          <Pencil className="h-4 w-4 text-[var(--accent)]" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Notas e roteiro</h3>
        </div>
        <textarea
          value={active.strategy_notes}
          onChange={(e) => updateActive({ strategy_notes: e.target.value })}
          rows={16}
          className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#111] px-4 py-3 text-sm text-gray-900 dark:text-white resize-y focus:border-[var(--accent)] focus:outline-none font-mono leading-relaxed"
          placeholder={`# Roteiro de apresentação

## Abertura
- Apresentar o problema: X% das vendas falham no pagamento
- Mostrar o custo de não recuperar

## Solução PagRecovery
- Detecção automática de falhas
- Contato multicanal (WhatsApp, Email, Voz)
- IA que personaliza a abordagem

## Resultados
- Usar métricas do cenário ativo
- Destacar taxa de recuperação e ROI

## Modelo de negócio
- Sem custo fixo
- Comissão apenas sobre o que for recuperado
- Integração em minutos

## Próximos passos
- Demo ao vivo
- Período de teste gratuito`}
        />
      </div>
    </div>
  );
}

function StrategyCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a1a1a] p-5 transition-colors">
      <div className="w-9 h-9 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center mb-3">
        <Icon className="w-4 h-4 text-[var(--accent)]" />
      </div>
      <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h4>
      <p className="mt-1 text-xs text-gray-400 leading-relaxed">{description}</p>
    </div>
  );
}

function LegendPill({
  color,
  children,
}: {
  color: string;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#111] px-3 py-1.5 font-mono text-[0.65rem] font-medium uppercase tracking-[0.06em] text-gray-500 dark:text-gray-400">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      {children}
    </span>
  );
}
