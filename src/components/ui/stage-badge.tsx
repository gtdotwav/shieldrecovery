import { mapStageLabel, STAGE_STYLES } from "@/lib/stage";

export function StageBadge({ stage }: { stage: string }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-[0.65rem] font-medium uppercase tracking-[0.14em] transition-colors ${STAGE_STYLES[stage] ?? "border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400"}`}
    >
      {mapStageLabel(stage)}
    </span>
  );
}
