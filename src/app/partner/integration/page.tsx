import {
  Activity,
  BookOpen,
  ChevronRight,
  Code,
  LogOut,
  Webhook,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { logoutAction } from "@/app/actions/auth-actions";
import {
  PlatformSurface,
  PlatformInset,
  PlatformSectionIntro,
} from "@/components/platform/platform-shell";
import { CopyButton } from "@/components/ui/copy-button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { platformBrand } from "@/lib/platform";
import { getAuthenticatedSession } from "@/server/auth/session";
import { getPartnerStorageService } from "@/server/recovery/services/partner-storage";

export const dynamic = "force-dynamic";

export const metadata = {
  title: `Integração | Portal do Parceiro | ${platformBrand.name}`,
};

const EXAMPLE_PAYLOAD = `{
  "event_type": "payment_failed",
  "payment": {
    "id": "pay_abc123",
    "order_id": "order-456",
    "amount": 9990,
    "currency": "BRL",
    "method": "pix",
    "status": "failed"
  },
  "customer": {
    "name": "João Silva",
    "email": "joao@email.com",
    "phone": "5511999999999",
    "document": "12345678900"
  },
  "metadata": {
    "product": "Curso XYZ",
    "paymentUrl": "https://checkout.exemplo.com/retry/abc",
    "pixCode": "00020126..."
  }
}`;

const CURL_EXAMPLE = `curl -X POST https://pagrecovery.com/api/partner/ingest \\
  -H "Authorization: Bearer sk_live_YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '${EXAMPLE_PAYLOAD.replace(/\n/g, "\\n")}'`;

export default async function PartnerIntegrationPage() {
  const session = await getAuthenticatedSession();

  if (!session || session.role !== "partner" || !session.partnerId) {
    redirect("/partner/login");
  }

  const partner = await getPartnerStorageService().getProfile(session.partnerId);

  if (!partner) {
    redirect("/partner/login");
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://pagrecovery.com";

  return (
    <div className="flex h-screen bg-[#f5f5f7] dark:bg-[#0d0d0d] overflow-hidden transition-colors duration-300">
      {/* Sidebar */}
      <aside className="hidden md:flex w-16 bg-white dark:bg-[#111111] border-r border-gray-200 dark:border-gray-800 flex-col items-center py-4 justify-between shrink-0 h-screen sticky top-0 transition-colors duration-300">
        <nav className="flex flex-col items-center gap-1">
          <div className="mb-6 w-10 h-10 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center">
            <Webhook className="h-5 w-5 text-[var(--accent)]" />
          </div>

          <SidebarLink href="/partner" icon={Activity} label="Dashboard" description="Visão geral" />
          <SidebarLink href="/partner/integration" icon={Webhook} label="Integração" description="API e webhooks" active />
        </nav>

        <div className="flex flex-col items-center gap-1">
          <form action={logoutAction}>
            <button type="submit" aria-label="Sair" className="relative group/tip w-10 h-10 rounded-lg flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-red-500 hover:bg-red-500/10 transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
          </form>
          <ThemeToggle />
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-[#111111] border-t border-gray-200 dark:border-gray-800 flex items-center justify-around px-1 py-2 safe-bottom transition-colors duration-300">
        <Link href="/partner" className="flex flex-col items-center gap-0.5 min-w-[3.25rem] min-h-[2.75rem] justify-center px-1 rounded-lg text-gray-400 dark:text-gray-500">
          <Activity className="w-5 h-5 shrink-0" />
          <span className="text-[0.55rem] leading-tight">Dashboard</span>
        </Link>
        <Link href="/partner/integration" className="flex flex-col items-center gap-0.5 min-w-[3.25rem] min-h-[2.75rem] justify-center px-1 rounded-lg text-[var(--accent)]" aria-current="page">
          <Webhook className="w-5 h-5 shrink-0" />
          <span className="text-[0.55rem] leading-tight">Integração</span>
        </Link>
        <form action={logoutAction}>
          <button type="submit" className="flex flex-col items-center gap-0.5 min-w-[3.25rem] min-h-[2.75rem] justify-center px-1 rounded-lg text-gray-400 dark:text-gray-500">
            <LogOut className="w-5 h-5 shrink-0" />
            <span className="text-[0.55rem] leading-tight">Sair</span>
          </button>
        </form>
      </nav>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-transparent px-4 md:px-6 h-12 md:h-14 flex items-center justify-between shrink-0 transition-colors duration-300">
          <nav className="flex items-center gap-1.5 text-xs md:text-sm text-gray-500 dark:text-gray-500">
            <Link href="/partner" className="hover:text-gray-700 dark:hover:text-gray-300">Parceiro</Link>
            <ChevronRight className="w-3 h-3 md:w-3.5 md:h-3.5" />
            <span className="text-gray-900 dark:text-white">Integração</span>
          </nav>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-300 hidden sm:inline">{partner.name}</span>
            <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-[var(--accent)] flex items-center justify-center text-white text-xs md:text-sm font-semibold">
              {partner.name.slice(0, 2).toUpperCase()}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 md:px-6 py-4 md:py-6 pb-16 md:pb-6 space-y-6">
          <PlatformSectionIntro
            eyebrow="Documentação"
            title="Integração via API"
            description="Envie eventos de pagamento para a PagRecovery processar e recuperar automaticamente."
          />

          {/* Endpoint */}
          <PlatformSurface className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Code className="h-5 w-5 text-[var(--accent)]" />
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Endpoint</h2>
            </div>

            <div className="rounded-lg bg-gray-900 dark:bg-[#0a0a0a] p-4 font-mono text-sm">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="text-green-400 font-semibold">POST</span>
                  <span className="text-gray-300 ml-2">{baseUrl}/api/partner/ingest</span>
                </div>
                <CopyButton value={`${baseUrl}/api/partner/ingest`} />
              </div>
            </div>

            <div className="rounded-lg bg-gray-900 dark:bg-[#0a0a0a] p-4 font-mono text-sm">
              <p className="text-gray-500 text-xs mb-2">Authorization Header</p>
              <div className="flex items-center justify-between gap-2">
                <span className="text-amber-400">Bearer sk_live_YOUR_API_KEY</span>
              </div>
            </div>
          </PlatformSurface>

          {/* Payload */}
          <PlatformSurface className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-[var(--accent)]" />
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">Payload</h2>
              </div>
              <CopyButton value={EXAMPLE_PAYLOAD} />
            </div>

            <pre className="rounded-lg bg-gray-900 dark:bg-[#0a0a0a] p-4 font-mono text-xs text-gray-300 overflow-x-auto leading-relaxed">
              {EXAMPLE_PAYLOAD}
            </pre>
          </PlatformSurface>

          {/* Event types */}
          <PlatformSurface className="p-5 space-y-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Eventos Suportados</h2>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { event: "payment_failed", desc: "Pagamento falhou", recoverable: true },
                { event: "payment_refused", desc: "Pagamento recusado", recoverable: true },
                { event: "payment_expired", desc: "Pagamento expirado", recoverable: true },
                { event: "payment_created", desc: "Pagamento criado", recoverable: false },
                { event: "payment_pending", desc: "Pagamento pendente", recoverable: false },
                { event: "payment_succeeded", desc: "Pagamento aprovado", recoverable: false },
                { event: "payment_refunded", desc: "Pagamento estornado", recoverable: false },
                { event: "payment_chargeback", desc: "Chargeback recebido", recoverable: false },
                { event: "payment_canceled", desc: "Pagamento cancelado", recoverable: false },
              ].map((item) => (
                <PlatformInset key={item.event} className="px-3 py-2.5 flex items-center justify-between gap-2">
                  <div>
                    <code className="text-xs text-[var(--accent)]">{item.event}</code>
                    <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                  </div>
                  {item.recoverable ? (
                    <span className="shrink-0 rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-[0.6rem] font-semibold text-green-700 dark:text-green-400">
                      Recuperável
                    </span>
                  ) : null}
                </PlatformInset>
              ))}
            </div>
          </PlatformSurface>

          {/* Fluxo */}
          <PlatformSurface className="p-5 space-y-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Fluxo de Recuperação
            </h2>

            <div className="space-y-3">
              {[
                { step: "1", title: "Envio", desc: "Seu gateway envia o evento de pagamento falho via API" },
                { step: "2", title: "Normalização", desc: "PagRecovery normaliza o payload e cria o lead" },
                { step: "3", title: "Contato", desc: "IA entra em contato com o cliente via WhatsApp/Email" },
                { step: "4", title: "Recuperação", desc: "Cliente realiza novo pagamento via link de retry" },
                { step: "5", title: "Confirmação", desc: "Pagamento confirmado, lead marcado como recuperado" },
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/10 text-xs font-bold text-[var(--accent)]">
                    {item.step}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{item.title}</p>
                    <p className="text-xs text-gray-500">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </PlatformSurface>
        </main>
      </div>
    </div>
  );
}

function SidebarLink({
  href,
  icon: Icon,
  label,
  description,
  active,
}: {
  href: string;
  icon: typeof Activity;
  label: string;
  description: string;
  active?: boolean;
}) {
  const cls = active
    ? "bg-[var(--accent)]/10 text-[var(--accent)]"
    : "text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800";

  return (
    <Link
      href={href}
      className={`relative group/tip w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${cls}`}
      {...(active ? { "aria-current": "page" as const } : {})}
    >
      <Icon className="w-5 h-5" />
      <span className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 w-max max-w-[12rem] rounded-lg bg-gray-900 dark:bg-gray-100 px-3 py-2 opacity-0 scale-95 transition-all duration-150 group-hover/tip:opacity-100 group-hover/tip:scale-100 z-50 shadow-lg">
        <span className="block text-xs font-semibold text-white dark:text-gray-900">{label}</span>
        <span className="block text-[0.65rem] leading-snug text-gray-300 dark:text-gray-500 mt-0.5">{description}</span>
      </span>
    </Link>
  );
}
