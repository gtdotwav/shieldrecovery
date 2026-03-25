import { hoursSince } from "@/lib/format";

export function TimeBadge({ updatedAt }: { updatedAt: string }) {
  const hours = hoursSince(updatedAt);

  if (hours <= 24) return null;

  const variant =
    hours > 48
      ? "border-[rgba(255,122,116,0.18)] bg-[rgba(255,122,116,0.1)] text-[#ffb5af]"
      : "border-[rgba(248,210,106,0.18)] bg-[rgba(248,210,106,0.1)] text-[#f4dd93]";

  const label = hours > 48 ? `${Math.floor(hours / 24)}d parado` : ">24h";

  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-[0.6rem] font-medium uppercase tracking-[0.12em] ${variant}`}
    >
      {label}
    </span>
  );
}
