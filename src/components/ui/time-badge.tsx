import { hoursSince } from "@/lib/format";

export function TimeBadge({ updatedAt }: { updatedAt: string }) {
  const hours = hoursSince(updatedAt);

  if (hours <= 24) return null;

  const variant =
    hours > 48
      ? "border-red-200 bg-red-50 text-red-500"
      : "border-amber-200 bg-amber-50 text-amber-600";

  const label = hours > 48 ? `${Math.floor(hours / 24)}d parado` : ">24h";

  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-[0.6rem] font-medium ${variant}`}
    >
      {label}
    </span>
  );
}
