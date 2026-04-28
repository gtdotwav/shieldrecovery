import {
  PlatformAppPage,
  PlatformSectionIntro,
} from "@/components/platform/platform-shell";
import { requireAuthenticatedSession } from "@/server/auth/session";

import { CrmPanel } from "./crm-panel";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "CRM PIX",
};

export default async function CrmPage() {
  await requireAuthenticatedSession(["admin"]);

  return (
    <PlatformAppPage currentPath="/admin/crm">
      <PlatformSectionIntro
        eyebrow="Gestão"
        title="CRM de Contatos PIX"
        description="Gerencie contatos, chaves PIX e histórico de interações."
      />
      <div className="mt-6">
        <CrmPanel />
      </div>
    </PlatformAppPage>
  );
}
