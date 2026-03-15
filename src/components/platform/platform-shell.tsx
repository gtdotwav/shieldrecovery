import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bot,
  Compass,
  FlaskConical,
  Inbox,
  Link2,
  UsersRound,
} from "lucide-react";

import { logoutAction } from "@/app/actions/auth-actions";
import { ShieldRecoveryLogo } from "@/components/platform/shield-recovery-logo";
import { requireAuthenticatedSession } from "@/server/auth/session";
import { appEnv } from "@/server/recovery/config";
import { cn } from "@/lib/utils";

type PlatformRoute = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  kind: "marketing" | "app";
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
    href: "/dashboard",
    label: "Recuperação",
    description: "O que precisa de ação agora.",
    icon: BarChart3,
    kind: "app",
  },
  {
    href: "/connect",
    label: "Integrações",
    description: "O que está ativo e o que falta.",
    icon: Link2,
    kind: "app",
  },
  {
    href: "/leads",
    label: "CRM",
    description: "Qual caso mover agora.",
    icon: UsersRound,
    kind: "app",
  },
  {
    href: "/inbox",
    label: "Conversas",
    description: "Quem precisa de resposta.",
    icon: Inbox,
    kind: "app",
  },
  {
    href: "/ai",
    label: "AI Engine",
    description: "Inteligência de recuperação.",
    icon: Bot,
    kind: "app",
    experimental: true,
  },
  {
    href: "/test",
    label: "Testes",
    description: "Disparar eventos simulados.",
    icon: FlaskConical,
    kind: "app",
  },
];

function getVisibleRoutes() {
  return platformRoutes.filter((route) => {
    if (route.devOnly) {
      return false;
    }

    if (route.experimental && !appEnv.experimentalPagesEnabled) {
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
    <div className="min-h-screen bg-[linear-gradient(180deg,#fffdfb_0%,#ffffff_14%,#fbfbfc_100%)]">
      <main className="mx-auto max-w-[88rem] px-4 pb-24 pt-4 sm:px-6 sm:pt-6 lg:px-8">
        {/* Top nav */}
        <header className="sticky top-3 z-40 mb-8 sm:mb-10">
          <div className="rounded-[1.4rem] border border-black/[0.05] bg-white/88 px-4 py-3 shadow-[0_16px_42px_rgba(15,23,42,0.05)] backdrop-blur-xl sm:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <ShieldRecoveryLogo />

              <div className="flex flex-col gap-3 lg:items-end">
                <nav className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
                  {visibleRoutes.map((route) => {
                    const isActive = currentPath === route.href;

                    return (
                      <Link
                        key={route.href}
                        href={route.href}
                        className={cn(
                          "shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
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

                {action ? <div className="flex flex-wrap gap-3">{action}</div> : null}
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
  await requireAuthenticatedSession();
  const visibleRoutes = getVisibleRoutes();
  const currentRoute =
    visibleRoutes.find((route) => route.href === currentPath) ?? visibleRoutes[1];

  return (
    <div className="min-h-screen overflow-x-hidden bg-[linear-gradient(180deg,#fafafa_0%,#f4f5f7_100%)]">
      <div className="flex">
        {/* Icon sidebar */}
        <aside className="fixed top-0 left-0 z-50 hidden h-screen w-16 flex-col items-center border-r border-black/[0.05] bg-white/96 py-4 backdrop-blur xl:flex">
          <div className="mb-6">
            <ShieldRecoveryLogo mode="icon" />
          </div>

          <nav className="flex flex-1 flex-col items-center gap-1">
            {visibleRoutes.map((route) => {
              const isActive = currentPath === route.href;

              return (
                <Link
                  key={route.href}
                  href={route.href}
                  title={route.label}
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-[10px] transition-colors",
                    isActive
                      ? "bg-[rgba(249,115,22,0.1)] text-orange-500"
                      : "text-[#9ca3af] hover:bg-[#f5f5f7] hover:text-[#717182]",
                  )}
                >
                  <route.icon className="h-[18px] w-[18px]" />
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main content area */}
        <div className="min-w-0 flex-1 xl:pl-16">
          {/* Top header with breadcrumb + action */}
          <header className="sticky top-0 z-40 border-b border-black/[0.05] bg-white/92 px-4 py-3 backdrop-blur sm:px-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="xl:hidden">
                  <ShieldRecoveryLogo mode="icon" />
                </div>

                {/* Breadcrumb */}
                <nav className="hidden sm:flex items-center gap-1.5 text-sm">
                  <Link href="/" className="text-[#9ca3af] hover:text-[#717182] transition-colors">Home</Link>
                  <span className="text-[#d1d5db]">›</span>
                  <Link href="/dashboard" className="text-[#9ca3af] hover:text-[#717182] transition-colors">Plataforma</Link>
                  <span className="text-[#d1d5db]">›</span>
                  <span className="font-medium text-[#1a1a2e]">{currentRoute.label}</span>
                </nav>

                <h1 className="sm:hidden text-lg font-semibold text-[#1a1a2e]">
                  {currentRoute.label}
                </h1>
              </div>

              <div className="flex flex-col gap-3 lg:items-end">
                {/* Mobile nav */}
                <div className="flex gap-1.5 overflow-x-auto pb-1 xl:hidden">
                  {visibleRoutes.filter((route) => route.kind === "app").map((route) => {
                    const isActive = currentPath === route.href;

                    return (
                      <Link
                        key={route.href}
                        href={route.href}
                        className={cn(
                          "shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                          isActive
                            ? "bg-orange-500 text-white"
                            : "text-[#717182] hover:bg-[#f5f5f7]",
                        )}
                      >
                        {route.label}
                      </Link>
                    );
                  })}
                </div>
                {action}
                <form action={logoutAction}>
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

          {/* Page content */}
          <main className="mx-auto max-w-[88rem] px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
            {/* Page title with orange left border */}
            <div className="mb-5 flex items-center justify-between sm:mb-6">
              <div className="flex items-center gap-3">
                <div className="h-6 w-1 rounded-full bg-orange-500" />
                <h2 className="text-xl font-semibold text-[#1a1a2e]">{currentRoute.label}</h2>
              </div>
            </div>

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
        "rounded-[1.35rem] border border-black/[0.05] bg-white shadow-[0_14px_34px_rgba(15,23,42,0.04)]",
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
        "rounded-[1.1rem] border border-black/[0.04] bg-[#f7f7f8]",
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
        <p className="text-xs uppercase tracking-wider text-orange-500">
          {eyebrow}
        </p>
      ) : null}
      <TitleTag className={cn("max-w-[20ch] text-balance text-3xl font-semibold tracking-tight text-[#1a1a2e] sm:text-4xl", eyebrow && "mt-3")}>
        {title}
      </TitleTag>
      {description ? (
        <p className="mt-3 max-w-2xl text-base leading-7 text-[#717182]">
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
    <div className={cn("rounded-[1.25rem] border border-black/[0.05] bg-white px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.035)] sm:px-5 sm:py-5", className)}>
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium text-[#9ca3af]">{label}</p>
          <p className="text-xl font-bold tracking-tight text-[#1a1a2e] sm:text-2xl">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-[#9ca3af] mt-0.5">{subtitle}</p>
          )}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(249,115,22,0.08)]">
          <Icon className="h-5 w-5 text-orange-500" />
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
        "inline-flex items-center gap-1.5 rounded-full border border-black/[0.05] bg-[#f7f7f8] px-2.5 py-1.5 text-[0.65rem] uppercase tracking-wider text-[#717182]",
        className,
      )}
    >
      {Icon ? <Icon className="h-3 w-3 text-orange-500" /> : null}
      {children}
    </div>
  );
}
