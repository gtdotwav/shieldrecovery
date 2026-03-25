import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BookOpen,
  Bot,
  CalendarDays,
  Compass,
  FlaskConical,
  Inbox,
  Link2,
  LogOut,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

import { logoutAction } from "@/app/actions/auth-actions";
import { PlatformLogo } from "@/components/platform/platform-logo";
import { requireAuthenticatedSession } from "@/server/auth/session";
import { appEnv } from "@/server/recovery/config";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/server/auth/core";
import { platformBrand } from "@/lib/platform";

type PlatformRoute = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  kind: "marketing" | "app";
  allowedRoles?: UserRole[];
  devOnly?: boolean;
  experimental?: boolean;
};

export const platformRoutes: PlatformRoute[] = [
  {
    href: "/",
    label: "Home",
    description: platformBrand.name,
    icon: Compass,
    kind: "marketing",
  },
  {
    href: "/onboarding",
    label: "Guia",
    description: "Como usar a plataforma no dia a dia.",
    icon: BookOpen,
    kind: "app",
    allowedRoles: ["admin", "seller"],
  },
  {
    href: "/admin",
    label: "Admin",
    description: "Governanca dos sellers e da recuperacao.",
    icon: ShieldCheck,
    kind: "app",
    allowedRoles: ["admin"],
  },
  {
    href: "/dashboard",
    label: "Recuperacao",
    description: "O que precisa de acao agora.",
    icon: BarChart3,
    kind: "app",
    allowedRoles: ["admin"],
  },
  {
    href: "/connect",
    label: "Integracoes",
    description: "O que esta ativo e o que falta.",
    icon: Link2,
    kind: "app",
    allowedRoles: ["admin", "seller"],
  },
  {
    href: "/calendar",
    label: "Calendario",
    description: "Movimento, notas e automacoes por dia.",
    icon: CalendarDays,
    kind: "app",
    allowedRoles: ["admin", "seller"],
  },
  {
    href: "/leads",
    label: "CRM",
    description: "Qual caso mover agora.",
    icon: UsersRound,
    kind: "app",
    allowedRoles: ["admin", "seller"],
  },
  {
    href: "/inbox",
    label: "Conversas",
    description: "Quem precisa de resposta.",
    icon: Inbox,
    kind: "app",
    allowedRoles: ["admin", "seller"],
  },
  {
    href: "/ai",
    label: "Automacoes",
    description: "IA e automacoes da operacao.",
    icon: Bot,
    kind: "app",
    allowedRoles: ["admin", "seller"],
  },
  {
    href: "/test",
    label: "Testes",
    description: "Disparar eventos simulados.",
    icon: FlaskConical,
    kind: "app",
    allowedRoles: ["admin"],
  },
];

function getVisibleRoutes(role?: UserRole) {
  return platformRoutes.filter((route) => {
    if (route.devOnly) {
      return false;
    }

    if (route.experimental && !appEnv.experimentalPagesEnabled) {
      return false;
    }

    if (role && route.allowedRoles && !route.allowedRoles.includes(role)) {
      return false;
    }

    return true;
  });
}

/* ── Marketing / public shell ── */

export function PlatformPage({
  currentPath,
  action,
  children,
}: {
  currentPath: string;
  note?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const visibleRoutes = getVisibleRoutes();

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <main className="mx-auto max-w-[88rem] px-4 pb-20 pt-4 sm:px-6 sm:pt-6 lg:px-8">
        <header className="sticky top-4 z-40 mb-6">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--background)]/80 px-5 py-3.5 backdrop-blur-sm sm:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <PlatformLogo size="lg" emphasis="strong" className="max-sm:self-start" />

              <div className="flex flex-col gap-3 lg:items-end">
                <nav className="flex flex-wrap items-center gap-1.5">
                  {visibleRoutes.map((route) => {
                    const isActive = currentPath === route.href;

                    return (
                      <Link
                        key={route.href}
                        href={route.href}
                        className={cn(
                          "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                          isActive
                            ? "border-[rgba(30,215,96,0.18)] bg-[rgba(30,215,96,0.08)] text-[var(--accent)]"
                            : "border-[var(--border)] bg-transparent text-white/50 hover:bg-white/[0.03] hover:text-white/70",
                        )}
                      >
                        {route.label}
                      </Link>
                    );
                  })}
                </nav>

                {action ? <div className="flex flex-wrap gap-2">{action}</div> : null}
              </div>
            </div>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}

/* ── Authenticated app shell ── */

export async function PlatformAppPage({
  currentPath,
  action,
  children,
}: {
  currentPath: string;
  note?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const session = await requireAuthenticatedSession();
  const visibleRoutes = getVisibleRoutes(session.role);
  const currentRoute =
    visibleRoutes.find((route) => route.href === currentPath) ??
    visibleRoutes.find((route) => route.kind === "app") ??
    visibleRoutes[0];
  const appRoutes = visibleRoutes.filter((route) => route.kind === "app");

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* ─── Desktop sidebar ─── */}
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-[14.5rem] flex-col border-r border-[var(--border)] bg-[var(--background)] xl:flex">
        {/* Brand */}
        <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-[var(--border)] px-4">
          <PlatformLogo mode="icon" size="sm" className="scale-[0.68]" />
          <span className="text-[0.82rem] font-semibold tracking-[-0.02em] text-white/90">
            {platformBrand.name}
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-3">
          <p className="mb-1.5 px-3 text-[0.58rem] font-medium uppercase tracking-[0.1em] text-white/25">
            Menu
          </p>
          <div className="space-y-0.5">
            {appRoutes.map((route) => {
              const isActive = currentPath === route.href;

              return (
                <Link
                  key={route.href}
                  href={route.href}
                  title={route.description}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-[0.45rem] text-[0.8rem] font-medium transition-colors",
                    isActive
                      ? "bg-[rgba(30,215,96,0.07)] text-[var(--accent)]"
                      : "text-white/45 hover:bg-white/[0.03] hover:text-white/70",
                  )}
                >
                  <route.icon className="h-[15px] w-[15px] shrink-0" />
                  {route.label}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="shrink-0 border-t border-[var(--border)] px-2.5 py-2.5">
          <div className="mb-1.5 px-3">
            <span className="rounded bg-white/[0.05] px-1.5 py-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.06em] text-white/35">
              {session.role}
            </span>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-[0.45rem] text-[0.8rem] font-medium text-white/35 transition-colors hover:bg-white/[0.03] hover:text-white/55"
            >
              <LogOut className="h-[15px] w-[15px]" />
              Sair
            </button>
          </form>
        </div>
      </aside>

      {/* ─── Main content ─── */}
      <div className="min-w-0 flex-1 xl:pl-[14.5rem]">
        {/* Header */}
        <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-sm">
          <div className="flex items-center justify-between px-5 py-3.5 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <div className="xl:hidden">
                <PlatformLogo mode="icon" size="sm" className="scale-[0.7]" />
              </div>
              <div>
                <nav className="hidden items-center gap-1.5 text-xs sm:flex">
                  <Link
                    href="/"
                    className="text-white/30 transition-colors hover:text-white/50"
                  >
                    {platformBrand.name}
                  </Link>
                  <span className="text-white/15">/</span>
                  <span className="font-medium text-white/60">
                    {currentRoute.label}
                  </span>
                </nav>
                <h1 className="text-[0.95rem] font-semibold tracking-[-0.02em] text-white sm:mt-0.5 sm:text-lg">
                  {currentRoute.label}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              {action}
              <form action={logoutAction} className="xl:hidden">
                <button
                  type="submit"
                  className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-white/45 transition-colors hover:bg-white/[0.03]"
                >
                  Sair
                </button>
              </form>
            </div>
          </div>
        </header>

        {/* Mobile bottom nav */}
        <div className="xl:hidden">
          <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[var(--background)]">
            <div className="flex items-stretch gap-0.5 overflow-x-auto px-2 py-1.5 pb-[calc(env(safe-area-inset-bottom)+0.375rem)]">
              {appRoutes.map((route) => {
                const isActive = currentPath === route.href;

                return (
                  <Link
                    key={route.href}
                    href={route.href}
                    className={cn(
                      "flex shrink-0 flex-col items-center gap-0.5 rounded-lg px-3 py-2 transition-colors",
                      isActive
                        ? "text-[var(--accent)]"
                        : "text-white/35 hover:text-white/55",
                    )}
                  >
                    <route.icon className="h-4 w-4" />
                    <span className="text-[0.6rem] font-medium leading-none">
                      {route.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>

        {/* Page content */}
        <main className="mx-auto max-w-[86rem] px-5 py-5 pb-24 sm:px-6 sm:py-6 lg:px-8 xl:pb-8">
          {children}
        </main>
      </div>
    </div>
  );
}

/* ── Reusable components ── */

export function PlatformSurface({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--border)] bg-white/[0.025]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PlatformInset({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-white/[0.05] bg-white/[0.02]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PlatformSectionIntro({
  eyebrow,
  title,
  description,
  className,
  titleTag = "h2",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  className?: string;
  titleTag?: "h1" | "h2";
}) {
  const TitleTag = titleTag;

  return (
    <div className={className}>
      {eyebrow ? (
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-[var(--accent)]/55">
          {eyebrow}
        </p>
      ) : null}
      <TitleTag
        className={cn(
          "max-w-[28ch] text-xl font-semibold tracking-[-0.02em] text-white sm:text-2xl",
          eyebrow && "mt-2",
        )}
      >
        {title}
      </TitleTag>
      {description ? (
        <p className="mt-2 max-w-xl text-sm leading-6 text-white/48">
          {description}
        </p>
      ) : null}
    </div>
  );
}

export function PlatformMetricCard({
  icon: Icon,
  label,
  value,
  subtitle,
  className,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  subtitle?: string;
  detail?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--border)] bg-white/[0.025] px-5 py-4",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-[0.68rem] font-medium uppercase tracking-[0.08em] text-white/38">
            {label}
          </p>
          <p className="text-[1.85rem] font-semibold tracking-[-0.03em] text-white sm:text-[2rem]">
            {value}
          </p>
          {subtitle ? (
            <p className="mt-0.5 text-xs text-white/42">{subtitle}</p>
          ) : null}
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[rgba(30,215,96,0.06)] text-[var(--accent)]/60">
          <Icon className="h-[17px] w-[17px]" />
        </div>
      </div>
    </div>
  );
}

export function PlatformPill({
  children,
  icon: Icon,
  className,
}: {
  children: React.ReactNode;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-white/[0.025] px-2.5 py-1 text-[0.68rem] font-medium text-white/50",
        className,
      )}
    >
      {Icon ? <Icon className="h-3 w-3 text-[var(--accent)]/50" /> : null}
      {children}
    </div>
  );
}
