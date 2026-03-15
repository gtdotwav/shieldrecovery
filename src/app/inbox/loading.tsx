import { PlatformAppPage } from "@/components/platform/platform-shell";
import { InboxSkeleton } from "@/components/ui/skeleton";

export default function InboxLoading() {
  return (
    <PlatformAppPage currentPath="/inbox">
      <InboxSkeleton />
    </PlatformAppPage>
  );
}
