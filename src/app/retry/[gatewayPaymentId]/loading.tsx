export default function RetryLoading() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl items-center px-6 py-16">
      <div
        className="grid w-full gap-6 rounded-[2rem] border border-black/[0.05] bg-white p-8 shadow-[0_26px_120px_rgba(15,23,42,0.06)] dark:bg-[var(--surface,_#0f0f0f)] lg:grid-cols-[minmax(0,0.95fr)_minmax(20rem,1.05fr)]"
        aria-busy
        aria-live="polite"
      >
        <section className="rounded-[1.5rem] border border-[var(--accent)]/15 bg-gradient-to-br from-[var(--accent)]/6 to-transparent p-6">
          <Pulse className="h-3 w-32 rounded-full" />
          <Pulse className="mt-4 h-9 w-3/4 rounded-xl" />
          <Pulse className="mt-3 h-3 w-full rounded-full" />
          <Pulse className="mt-2 h-3 w-5/6 rounded-full" />
          <div className="mt-5 rounded-[1.25rem] border border-[var(--accent)]/15 bg-white/60 p-4 dark:bg-black/40">
            <Pulse className="mx-auto h-64 w-64 rounded-2xl" />
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <div className="rounded-[1.25rem] border border-black/[0.06] bg-gray-50 p-4 dark:bg-[#111]">
            <Pulse className="h-2.5 w-20 rounded-full" />
            <Pulse className="mt-2 h-4 w-32 rounded-full" />
          </div>
          <div className="rounded-[1.25rem] border border-black/[0.06] bg-white p-4 dark:bg-[#111]">
            <Pulse className="h-2.5 w-32 rounded-full" />
            <Pulse className="mt-3 h-3 w-full rounded-full" />
            <Pulse className="mt-2 h-3 w-11/12 rounded-full" />
            <Pulse className="mt-2 h-3 w-9/12 rounded-full" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-[1.1rem] border border-black/[0.06] bg-gray-50 p-4 dark:bg-[#111]"
              >
                <Pulse className="h-2.5 w-20 rounded-full" />
                <Pulse className="mt-2 h-4 w-32 rounded-full" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function Pulse({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-gradient-to-r from-black/5 via-black/10 to-black/5 dark:from-white/5 dark:via-white/10 dark:to-white/5 ${className}`}
    />
  );
}
