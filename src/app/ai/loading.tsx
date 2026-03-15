import { PlatformAppPage, PlatformSurface } from "@/components/platform/platform-shell";
import { Skeleton, MetricCardSkeleton, PriorityRowSkeleton } from "@/components/ui/skeleton";

export default function AILoading() {
  return (
    <PlatformAppPage currentPath="/ai">
      {/* Metrics row 1 */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <MetricCardSkeleton key={i} />
        ))}
      </section>

      {/* Metrics row 2 */}
      <section className="mt-3 grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <MetricCardSkeleton key={i} />
        ))}
      </section>

      {/* Main grid */}
      <section className="mt-5 grid gap-5 2xl:grid-cols-[minmax(0,1.4fr)_20rem]">
        <div className="space-y-5">
          {/* Activity feed */}
          <PlatformSurface className="p-4 sm:p-5">
            <div className="flex items-center justify-between pb-3">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-16" />
            </div>
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3 px-3 py-2">
                  <Skeleton className="h-5 w-5 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-3 w-48" />
                    <Skeleton className="mt-1 h-2 w-24" />
                  </div>
                </div>
              ))}
            </div>
          </PlatformSurface>

          {/* Intelligence panel */}
          <PlatformSurface className="p-4 sm:p-5">
            <div className="flex items-center justify-between pb-3">
              <Skeleton className="h-4 w-36" />
              <div className="flex gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-5 w-12 rounded-full" />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <PriorityRowSkeleton key={i} />
              ))}
            </div>
          </PlatformSurface>

          {/* Strategy engine */}
          <PlatformSurface className="p-4 sm:p-5">
            <Skeleton className="h-4 w-28" />
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-white/8 bg-white/[0.02] p-3.5">
                  <Skeleton className="h-3 w-24" />
                  <div className="mt-2.5 space-y-1.5">
                    {Array.from({ length: 3 }).map((_, j) => (
                      <Skeleton key={j} className="h-3 w-full" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </PlatformSurface>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <PlatformSurface key={i} className="p-4">
              <Skeleton className="h-3 w-20" />
              <div className="mt-3 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </PlatformSurface>
          ))}
        </div>
      </section>
    </PlatformAppPage>
  );
}
