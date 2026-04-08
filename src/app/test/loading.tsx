import { PlatformAppPage } from "@/components/platform/platform-shell";
import { DashboardSkeleton } from "@/components/ui/skeleton";

export default function TestLoading() {
  return (
    <PlatformAppPage currentPath="/test">
      <DashboardSkeleton />
    </PlatformAppPage>
  );
}
