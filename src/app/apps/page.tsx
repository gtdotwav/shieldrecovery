import Link from "next/link";
import {
  PlatformAppPage,
  platformRoutes,
} from "@/components/platform/platform-shell";
import { requireAuthenticatedSession } from "@/server/auth/session";
import { appEnv } from "@/server/recovery/config";
import { cn } from "@/lib/utils";

const groupLabels: Record<string, string> = {
  overview: "Visao Geral",
  communication: "Comunicacao",
  monetization: "Monetizacao",
  sales: "Vendas",
  operations: "Operacoes",
  admin: "Administracao",
};

const groupOrder = [
  "overview",
  "communication",
  "monetization",
  "sales",
  "operations",
  "admin",
] as const;

export default async function AppsPage() {
  const session = await requireAuthenticatedSession();

  const appRoutes = platformRoutes.filter((route) => {
    if (route.kind !== "app") return false;
    if (route.devOnly) return false;
    if (route.experimental && !appEnv.experimentalPagesEnabled) return false;
    if (route.allowedRoles && !route.allowedRoles.includes(session.role))
      return false;
    return true;
  });

  const grouped = new Map<string, typeof appRoutes>();
  for (const route of appRoutes) {
    const g = route.group ?? "overview";
    if (!grouped.has(g)) grouped.set(g, []);
    grouped.get(g)!.push(route);
  }

  return (
    <PlatformAppPage currentPath="/apps">
      <div className="space-y-8">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            Todos os modulos
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Acesse todas as ferramentas e funcionalidades da plataforma.
          </p>
        </div>

        {groupOrder.map((group) => {
          const routes = grouped.get(group);
          if (!routes?.length) return null;

          return (
            <section key={group}>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
                {groupLabels[group]}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {routes.map((route) => {
                  const card = (
                    <div
                      className={cn(
                        "rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a1a1a] p-4",
                        "hover:border-[var(--accent)]/40 hover:shadow-sm transition-all cursor-pointer group",
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0 group-hover:bg-[var(--accent)]/10 transition-colors">
                          <route.icon className="w-[18px] h-[18px] text-gray-500 dark:text-gray-400 group-hover:text-[var(--accent)] transition-colors" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {route.label}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                            {route.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  );

                  return route.external ? (
                    <a
                      key={route.href}
                      href={route.href}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {card}
                    </a>
                  ) : (
                    <Link key={route.href} href={route.href}>
                      {card}
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </PlatformAppPage>
  );
}
