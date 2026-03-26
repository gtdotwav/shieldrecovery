import { cn } from "@/lib/utils";

type BadgeVariant = "accent" | "neutral" | "success" | "warning";

const VARIANT_STYLES: Record<BadgeVariant, string> = {
  accent:
    "border-[var(--accent)]/20 bg-[var(--accent)]/10 text-[var(--accent-strong)] dark:text-[var(--accent)]",
  neutral:
    "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400",
  success:
    "border-[var(--accent)]/20 bg-[var(--accent)]/10 text-[var(--accent-strong)] dark:text-[var(--accent)]",
  warning:
    "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400",
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
      role="status"
      aria-label={`${label}`}
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
