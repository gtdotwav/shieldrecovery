import { mapStageLabel, STAGE_STYLES } from "@/lib/stage";

export function StageBadge({ stage }: { stage: string }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-[0.65rem] font-medium uppercase tracking-[0.14em] ${STAGE_STYLES[stage] ?? "border-white/10 bg-white/5 text-[rgba(255,255,255,0.64)]"}`}
    >
      {mapStageLabel(stage)}
    </span>
  );
}
