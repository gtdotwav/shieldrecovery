import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
}) {
  return (
    <div className="animate-fade-in-up flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 dark:border-gray-800 px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800">
        <Icon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
      </div>
      <p className="mt-4 text-sm font-medium text-gray-700 dark:text-gray-300">{title}</p>
      {description ? (
        <p className="mt-1 max-w-xs text-xs text-gray-400 dark:text-gray-500">{description}</p>
      ) : null}
    </div>
  );
}
