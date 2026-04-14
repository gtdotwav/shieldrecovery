"use client";

import {
  BarChart3, HeartPulse, TrendingUp, Calendar,
  AlertTriangle, Zap, Layers, GitCompareArrows,
} from "lucide-react";
import { useCfo } from "./cfo-provider";

const chips = [
  { id: "daily_summary", label: "Resumo do dia", icon: BarChart3 },
  { id: "cash_health", label: "Saude do caixa", icon: HeartPulse },
  { id: "recovery_performance", label: "O que recuperamos?", icon: TrendingUp },
  { id: "week_forecast", label: "Previsao da semana", icon: Calendar },
  { id: "delinquency", label: "Inadimplencia atual", icon: AlertTriangle },
  { id: "urgent_actions", label: "Top acoes urgentes", icon: Zap },
  { id: "channel_performance", label: "Performance por canal", icon: Layers },
  { id: "month_comparison", label: "Comparar com mes passado", icon: GitCompareArrows },
] as const;

export function CfoQuickChips() {
  const { sendChip, isLoading } = useCfo();

  return (
    <div className="grid grid-cols-2 gap-2">
      {chips.map(chip => (
        <button
          key={chip.id}
          onClick={() => sendChip(chip.id, chip.label)}
          disabled={isLoading}
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-left transition-all hover:border-[var(--accent)]/30 hover:bg-[var(--accent)]/5 active:scale-[0.98] disabled:opacity-50"
        >
          <chip.icon className="w-4 h-4 text-[var(--accent)] shrink-0" />
          <span className="text-xs font-medium text-[var(--foreground)] leading-tight">{chip.label}</span>
        </button>
      ))}
    </div>
  );
}
