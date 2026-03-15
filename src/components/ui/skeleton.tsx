import { cn } from "@/lib/utils";

export function Skeleton({
  className,
}: {
  className?: string;
}) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-lg bg-white/[0.06]",
        className,
      )}
    />
  );
}

export function MetricCardSkeleton() {
  return (
    <div className="rounded-xl border border-white/10 bg-[#111316] px-4 py-3.5">
      <div className="flex items-center gap-3">
        <Skeleton className="h-4 w-4 rounded" />
        <Skeleton className="h-3 w-16" />
      </div>
      <Skeleton className="mt-2.5 h-7 w-20" />
    </div>
  );
}

export function LeadCardSkeleton() {
  return (
    <div className="rounded-xl border border-white/8 bg-[#111316] p-3">
      <div className="flex items-start justify-between gap-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-16" />
      </div>
      <div className="mt-2 flex items-center gap-2">
        <Skeleton className="h-3 w-14" />
        <Skeleton className="h-3 w-12" />
      </div>
      <Skeleton className="mt-3 h-7 w-full rounded-lg" />
    </div>
  );
}

export function ConversationRowSkeleton() {
  return (
    <div className="rounded-lg px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-5 w-5 rounded-full" />
      </div>
      <Skeleton className="mt-1.5 h-3 w-36" />
      <Skeleton className="mt-1 h-2 w-16" />
    </div>
  );
}

export function PriorityRowSkeleton() {
  return (
    <div className="rounded-xl bg-white/[0.03] p-3.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
        <Skeleton className="h-4 w-16" />
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-10" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <MetricCardSkeleton key={i} />
        ))}
      </section>

      <section className="mt-5 grid gap-5 2xl:grid-cols-[minmax(0,1.4fr)_18rem]">
        <div className="rounded-2xl border border-white/10 bg-[#111316] p-4 sm:p-5">
          <div className="flex items-center justify-between pb-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3 w-12" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <PriorityRowSkeleton key={i} />
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#111316] p-4">
          <Skeleton className="h-3 w-20" />
          <div className="mt-3 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i}>
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-6" />
                </div>
                <Skeleton className="mt-1.5 h-1.5 w-full rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

export function LeadsSkeleton() {
  return (
    <>
      <section className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <MetricCardSkeleton key={i} />
        ))}
      </section>

      <section className="mt-5 grid gap-5 2xl:grid-cols-[minmax(0,1.4fr)_19rem]">
        <div className="rounded-2xl border border-white/10 bg-[#111316] p-4 sm:p-5">
          <div className="grid gap-4 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
                <div className="flex items-center justify-between pb-3">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-6 rounded-full" />
                </div>
                <div className="space-y-2">
                  {Array.from({ length: 2 }).map((_, j) => (
                    <LeadCardSkeleton key={j} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#111316] p-4">
          <Skeleton className="h-3 w-20" />
          <div className="mt-3 space-y-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-6 w-20" />
            <div className="flex gap-1.5">
              <Skeleton className="h-5 w-14 rounded-full" />
              <Skeleton className="h-5 w-10 rounded-full" />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export function InboxSkeleton() {
  return (
    <>
      <section className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <MetricCardSkeleton key={i} />
        ))}
      </section>

      <section className="mt-5 grid gap-4 2xl:grid-cols-[16rem_minmax(0,1fr)_17rem]">
        <div className="rounded-2xl border border-white/10 bg-[#111316] p-3">
          <Skeleton className="mx-1 mb-3 h-3 w-16" />
          <div className="space-y-1.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <ConversationRowSkeleton key={i} />
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#111316] flex items-center justify-center p-8">
          <Skeleton className="h-4 w-40" />
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#111316] p-4">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-3 h-4 w-28" />
          <Skeleton className="mt-2 h-3 w-20" />
        </div>
      </section>
    </>
  );
}
