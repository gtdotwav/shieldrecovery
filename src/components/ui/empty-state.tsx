import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  /** Use a colourful gradient panel instead of the dashed-grey default */
  variant?: "default" | "highlight";
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  variant = "default",
}: EmptyStateProps) {
  const isHighlight = variant === "highlight";

  return (
    <div
      className={`animate-fade-in-up flex flex-col items-center justify-center rounded-2xl px-6 py-12 text-center ${
        isHighlight
          ? "border border-[var(--accent)]/15 bg-gradient-to-br from-[var(--accent)]/8 via-transparent to-transparent"
          : "border border-dashed border-gray-200 dark:border-gray-800"
      }`}
    >
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
          isHighlight
            ? "bg-[var(--accent)]/12 text-[var(--accent)]"
            : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500"
        }`}
      >
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <p className="mt-4 text-sm font-semibold text-gray-800 dark:text-gray-200">
        {title}
      </p>
      {description ? (
        <p className="mt-1 max-w-sm text-xs leading-5 text-gray-500 dark:text-gray-400">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
