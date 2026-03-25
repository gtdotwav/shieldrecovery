import { cn } from "@/lib/utils";

type BadgeVariant = "accent" | "neutral" | "success" | "warning";

const VARIANT_STYLES: Record<BadgeVariant, string> = {
  accent:
    "border-sky-200 bg-sky-50 text-sky-600",
  neutral: "border-black/10 bg-[#f5f5f7] text-[#717182]",
  success:
    "border-green-200 bg-green-50 text-green-600",
  warning:
    "border-amber-200 bg-amber-50 text-amber-600",
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
        "inline-flex rounded-full border px-2.5 py-0.5 text-[0.65rem] uppercase tracking-[0.14em]",
        VARIANT_STYLES[variant],
        className,
      )}
    >
      {label}
    </span>
  );
}
