export default function OnboardingLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-8">
      <div className="animate-pulse space-y-6">
        <div className="h-6 w-48 rounded-lg bg-gray-200 dark:bg-gray-800" />
        <div className="h-4 w-72 rounded bg-gray-100 dark:bg-gray-800/60" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-32 rounded-xl border border-gray-100 bg-white dark:border-gray-800 dark:bg-[#161616]"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
