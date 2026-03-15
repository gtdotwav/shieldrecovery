import { PlatformAppPage } from "@/components/platform/platform-shell";
import { DashboardSkeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <PlatformAppPage currentPath="/dashboard">
      <DashboardSkeleton />
    </PlatformAppPage>
  );
}
