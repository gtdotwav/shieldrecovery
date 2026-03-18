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
  ShieldCheck,
  UsersRound,
} from "lucide-react";

import { logoutAction } from "@/app/actions/auth-actions";
import { ShieldRecoveryLogo } from "@/components/platform/shield-recovery-logo";
import { requireAuthenticatedSession } from "@/server/auth/session";
import { appEnv } from "@/server/recovery/config";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/server/auth/core";

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
    description: "Shield Recovery",
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
    description: "Governança dos sellers e da recuperação.",
    icon: ShieldCheck,
    kind: "app",
    allowedRoles: ["admin"],
  },
  {
    href: "/dashboard",
    label: "Recuperação",
    description: "O que precisa de ação agora.",
    icon: BarChart3,
    kind: "app",
    allowedRoles: ["admin"],
  },
  {
    href: "/connect",
    label: "Integrações",
    description: "O que está ativo e o que falta.",
    icon: Link2,
    kind: "app",
    allowedRoles: ["admin", "seller"],
  },
  {
    href: "/calendar",
    label: "Calendário",
    description: "Movimento, notas e automações por dia.",
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
    label: "Automações",
    description: "IA e automações da operação.",
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

/* ═══════════════════════════════════════════
   Marketing page shell (Landing)
   ═══════════════════════════════════════════ */

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
    <div className="min-h-screen bg-[#f5f6f8]">
      <main className="mx-auto max-w-[84rem] px-4 pb-20 pt-3 sm:px-6 sm:pt-5 lg:px-8">
        {/* Top nav */}
        <header className="sticky top-3 z-40 mb-6 sm:mb-10">
          <div className="rounded-[1.2rem] border border-black/[0.06] bg-white px-4 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:rounded-[1.35rem] sm:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <ShieldRecoveryLogo
                size="lg"
                emphasis="strong"
                className="max-sm:self-start"
                textClassName="max-sm:h-10"
              />

              <div className="flex flex-col gap-3 lg:items-end">
                <nav className="no-scrollbar flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
                  {visibleRoutes.map((route) => {
                    const isActive = currentPath === route.href;

                    return (
                      <Link
                        key={route.href}
                        href={route.href}
                        className={cn(
                          "shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors sm:px-3.5 sm:text-sm",
                          isActive
                            ? "bg-orange-500 text-white"
                            : "text-[#717182] hover:bg-[#f5f5f7] hover:text-[#1a1a2e]",
                        )}
                      >
                        {route.label}
                      </Link>
                    );
                  })}
                </nav>

                {action ? <div className="flex flex-wrap gap-2 sm:gap-3">{action}</div> : null}
              </div>
            </div>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}

/* ═══════════════════════════════════════════
   App page shell (Dashboard, CRM, etc.)
   ═══════════════════════════════════════════ */

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
  const mobileRoutes = visibleRoutes.filter((route) => route.kind === "app");

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f5f6f8]">
      <div className="flex">
        {/* Icon sidebar */}
        <aside className="fixed top-0 left-0 z-50 hidden h-screen w-[4.5rem] flex-col items-center border-r border-black/[0.05] bg-white py-4 xl:flex">
          <div className="mb-6">
            <ShieldRecoveryLogo mode="icon" size="lg" />
          </div>

          <nav className="flex flex-1 flex-col items-center gap-1.5">
            {visibleRoutes.map((route) => {
              const isActive = currentPath === route.href;

              return (
                <Link
                  key={route.href}
                  href={route.href}
                  aria-label={`${route.label} - ${route.description}`}
                  className={cn(
                    "group relative flex h-10 w-10 items-center justify-center rounded-[12px] transition-all",
                    isActive
                      ? "bg-[rgba(249,115,22,0.12)] text-orange-500 shadow-[inset_0_0_0_1px_rgba(249,115,22,0.18)]"
                      : "text-[#9ca3af] hover:bg-[#f5f5f7] hover:text-[#4b5563]",
                  )}
                >
                  <route.icon className="h-[18px] w-[18px]" />
                  <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 hidden w-52 -translate-y-1/2 rounded-[0.95rem] border border-black/[0.08] bg-white px-3.5 py-3 text-left shadow-[0_10px_28px_rgba(15,23,42,0.08)] group-hover:block group-focus-visible:block">
                    <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-orange-500">
                      {route.label}
                    </span>
                    <span className="mt-1 block text-sm leading-5 text-[#6b7280]">
                      {route.description}
                    </span>
                  </span>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main content area */}
        <div className="min-w-0 flex-1 xl:pl-[4.5rem]">
          {/* Top header with breadcrumb + action */}
          <header className="sticky top-0 z-40 border-b border-black/[0.05] bg-white/94 px-4 py-3 backdrop-blur-md sm:px-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-start gap-3 sm:items-center">
                <div className="xl:hidden">
                  <ShieldRecoveryLogo mode="icon" size="sm" />
                </div>

                <div className="min-w-0">
                  <nav className="hidden items-center gap-1.5 text-sm sm:flex">
                    <Link href="/" className="text-[#9ca3af] transition-colors hover:text-[#717182]">Home</Link>
                    <span className="text-[#d1d5db]">›</span>
                    <span className="font-medium text-[#1a1a2e]">{currentRoute.label}</span>
                  </nav>
                  <div className="flex flex-wrap items-center gap-2 sm:mt-1">
                    <h1 className="text-base font-semibold tracking-tight text-[#111827] sm:text-[1.35rem]">
                      {currentRoute.label}
                    </h1>
                    <span className="inline-flex items-center rounded-full border border-black/[0.06] bg-[#f7f8fa] px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
                      {session.role === "admin" ? "admin" : "seller"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[#6b7280] sm:text-sm">
                    {currentRoute.description}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                <div className="contents">{action}</div>
                <form action={logoutAction} className="sm:contents">
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center rounded-full border border-black/[0.08] bg-white px-3 py-1.5 text-xs font-medium text-[#6b7280] transition-colors hover:bg-[#f5f5f7] hover:text-[#111827]"
                  >
                    Sair
                  </button>
                </form>
              </div>
            </div>
          </header>

          <div className="xl:hidden">
            <nav className="no-scrollbar fixed inset-x-0 bottom-0 z-40 border-t border-black/[0.06] bg-white/96 px-3 py-2 backdrop-blur-md">
              <div className="no-scrollbar flex items-stretch gap-2 overflow-x-auto pb-[calc(env(safe-area-inset-bottom)+0.25rem)]">
                {mobileRoutes.map((route) => {
                  const isActive = currentPath === route.href;

                  return (
                    <Link
                      key={route.href}
                      href={route.href}
                      className={cn(
                        "shrink-0 rounded-[1rem] border px-3 py-2.5 transition-colors min-w-[4.9rem]",
                        isActive
                          ? "border-orange-200 bg-orange-50 text-orange-600"
                          : "border-black/[0.06] bg-white text-[#6b7280] hover:bg-[#f5f5f7] hover:text-[#111827]",
                      )}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <route.icon className="h-4 w-4" />
                        <span className="text-[0.65rem] font-medium leading-none">
                          {route.label}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </nav>
          </div>

          {/* Page content */}
          <main className="mx-auto max-w-[84rem] px-4 py-5 pb-24 sm:px-6 sm:py-6 sm:pb-8 lg:px-8 xl:pb-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Shared UI primitives
   ═══════════════════════════════════════════ */

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
        "rounded-[1.3rem] border border-black/[0.06] bg-white shadow-[0_6px_18px_rgba(15,23,42,0.025)]",
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
        "rounded-[1.05rem] border border-black/[0.05] bg-[#f8f9fb]",
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
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-orange-500">
          {eyebrow}
        </p>
      ) : null}
      <TitleTag className={cn("max-w-[20ch] text-balance text-3xl font-semibold tracking-tight text-[#111827] sm:text-[2.6rem]", eyebrow && "mt-3")}>
        {title}
      </TitleTag>
      {description ? (
        <p className="mt-3 max-w-2xl text-base leading-7 text-[#6b7280]">
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
    <div className={cn("rounded-[1.2rem] border border-black/[0.06] bg-white px-4 py-4 shadow-[0_4px_14px_rgba(15,23,42,0.025)] sm:px-5 sm:py-5", className)}>
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-[0.68rem] font-medium uppercase tracking-[0.16em] text-[#9ca3af]">{label}</p>
          <p className="text-xl font-semibold tracking-tight text-[#111827] sm:text-2xl">
            {value}
          </p>
          {subtitle && (
            <p className="mt-0.5 text-xs text-[#9ca3af]">{subtitle}</p>
          )}
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(249,115,22,0.08)]">
          <Icon className="h-4.5 w-4.5 text-orange-500" />
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
        "inline-flex items-center gap-1.5 rounded-full border border-black/[0.06] bg-[#f7f8fa] px-2.5 py-1.5 text-[0.68rem] font-medium text-[#6b7280]",
        className,
      )}
    >
      {Icon ? <Icon className="h-3 w-3 text-orange-500" /> : null}
      {children}
    </div>
  );
}
