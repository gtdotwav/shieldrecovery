import { PlatformAppPage } from "@/components/platform/platform-shell";
import { LeadsSkeleton } from "@/components/ui/skeleton";

export default function LeadsLoading() {
  return (
    <PlatformAppPage currentPath="/leads">
      <LeadsSkeleton />
    </PlatformAppPage>
  );
}
