import { PlatformAppPage, PlatformSurface } from "@/components/platform/platform-shell";
import { Skeleton } from "@/components/ui/skeleton";

export default function LeadDetailLoading() {
  return (
    <PlatformAppPage currentPath="/leads">
      {/* Header */}
      <PlatformSurface className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div>
              <Skeleton className="h-5 w-32" />
              <div className="mt-1.5 flex gap-2">
                <Skeleton className="h-4 w-16 rounded-full" />
                <Skeleton className="h-4 w-12 rounded-full" />
              </div>
            </div>
          </div>
          <div className="text-right">
            <Skeleton className="h-7 w-24" />
            <Skeleton className="mt-1 h-3 w-20" />
          </div>
        </div>
      </PlatformSurface>

      {/* Content */}
      <section className="mt-5 grid gap-5 2xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-5">
          <PlatformSurface className="p-4 sm:p-5">
            <Skeleton className="h-3 w-20" />
            <div className="mt-3 flex gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-7 w-20 rounded-lg" />
              ))}
            </div>
            <Skeleton className="mt-4 h-16 w-full rounded-lg" />
          </PlatformSurface>

          <PlatformSurface className="p-4 sm:p-5">
            <Skeleton className="h-3 w-32" />
            <div className="mt-4 space-y-2.5">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-3/4 rounded-2xl" />
              ))}
            </div>
          </PlatformSurface>
        </div>

        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <PlatformSurface key={i} className="p-4">
              <Skeleton className="h-3 w-16" />
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
