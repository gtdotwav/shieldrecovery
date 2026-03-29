export default function Loading() {
  return (
    <div className="animate-pulse space-y-4 p-4 sm:p-6">
      {/* KPI cards skeleton */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#161616] p-5">
            <div className="h-3 w-20 rounded bg-gray-200 dark:bg-gray-800" />
            <div className="mt-3 h-7 w-16 rounded bg-gray-200 dark:bg-gray-800" />
            <div className="mt-2 h-2.5 w-28 rounded bg-gray-100 dark:bg-gray-800/50" />
          </div>
        ))}
      </div>

      {/* Content skeleton */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#161616] p-6">
        <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-800" />
        <div className="mt-6 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 rounded-lg bg-gray-100 dark:bg-gray-800/50" />
          ))}
        </div>
      </div>
    </div>
  );
}
