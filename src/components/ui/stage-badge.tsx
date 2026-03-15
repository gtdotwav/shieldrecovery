import { mapStageLabel, STAGE_STYLES } from "@/lib/stage";

export function StageBadge({ stage }: { stage: string }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-[0.65rem] font-medium ${STAGE_STYLES[stage] ?? "border-gray-200 bg-gray-50 text-[#717182]"}`}
    >
      {mapStageLabel(stage)}
    </span>
  );
}
