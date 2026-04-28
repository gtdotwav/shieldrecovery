import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  Clock,
  Key,
  Loader2,
  Plus,
  Search,
  Send,
  User,
  Wallet,
  X,
  XCircle,
} from "lucide-react";

import {
  PlatformAppPage,
  PlatformMetricCard,
  PlatformSectionIntro,
  PlatformSurface,
} from "@/components/platform/platform-shell";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { requireAuthenticatedSession } from "@/server/auth/session";

import { WithdrawPanel } from "./withdraw-panel";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Saques",
};

export default async function WithdrawPage() {
  await requireAuthenticatedSession(["admin"]);

  return (
    <PlatformAppPage currentPath="/admin/withdraw">
      <PlatformSectionIntro
        eyebrow="Financeiro"
        title="Painel de Saques"
        description="Saldo, saques PIX e histórico de transações."
      />
      <div className="mt-6">
        <WithdrawPanel />
      </div>
    </PlatformAppPage>
  );
}
