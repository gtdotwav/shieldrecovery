import { PlatformAppPage } from "@/components/platform/platform-shell";
import { DashboardSkeleton } from "@/components/ui/skeleton";

export default function FinanceiroLoading() {
  return (
    <PlatformAppPage currentPath="/financeiro">
      <DashboardSkeleton />
    </PlatformAppPage>
  );
}
