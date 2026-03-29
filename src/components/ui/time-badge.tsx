import { hoursSince } from "@/lib/format";

export function TimeBadge({ updatedAt }: { updatedAt: string }) {
  const hours = hoursSince(updatedAt);

  if (hours <= 24) return null;

  const variant =
    hours > 48
      ? "border-[var(--danger-soft-border)] bg-[var(--danger-soft)] text-red-400"
      : "border-[var(--warning-soft-border)] bg-[var(--warning-soft)] text-amber-400";

  const label = hours > 48 ? `${Math.floor(hours / 24)}d parado` : ">24h";

  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-[0.6rem] font-medium uppercase tracking-[0.12em] transition-colors ${variant}`}
    >
      {label}
    </span>
  );
}
