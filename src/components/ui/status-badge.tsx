import { cn } from "@/lib/utils";

type BadgeVariant = "accent" | "neutral" | "success" | "warning";

const VARIANT_STYLES: Record<BadgeVariant, string> = {
  accent:
    "border-[rgba(30,215,96,0.18)] bg-[rgba(30,215,96,0.12)] text-[#9bf4be]",
  neutral:
    "border-white/10 bg-white/5 text-[rgba(255,255,255,0.64)]",
  success:
    "border-[rgba(30,215,96,0.2)] bg-[rgba(30,215,96,0.12)] text-[#8df0b1]",
  warning:
    "border-[rgba(248,210,106,0.18)] bg-[rgba(248,210,106,0.1)] text-[#f4dd93]",
};

export function StatusBadge({
  label,
  variant = "accent",
  className,
}: {
  label: string;
  variant?: BadgeVariant;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-0.5 text-[0.65rem] uppercase tracking-[0.18em]",
        VARIANT_STYLES[variant],
        className,
      )}
    >
      {label}
    </span>
  );
}
