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
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <AmbientCanvas />
      <main className="mx-auto max-w-[88rem] px-4 pb-20 pt-4 sm:px-6 sm:pt-6 lg:px-8">
        <header className="sticky top-4 z-40 mb-6">
          <div className="glass-panel qr-panel rounded-[1.65rem] px-4 py-4 sm:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <PlatformLogo size="lg" emphasis="strong" className="max-sm:self-start" />

              <div className="flex flex-col gap-3 lg:items-end">
                <nav className="flex flex-wrap items-center gap-2">
                  {visibleRoutes.map((route) => {
                    const isActive = currentPath === route.href;

                    return (
                      <Link
                        key={route.href}
                        href={route.href}
                        className={cn(
                          "glass-button-secondary px-3.5 py-2 text-xs font-semibold tracking-[0.14em] uppercase",
                          isActive &&
                            "border-[rgba(30,215,96,0.22)] bg-[rgba(30,215,96,0.14)] text-[var(--accent)] shadow-[0_0_0_1px_rgba(30,215,96,0.08)]",
                        )}
                      >
                        {route.label}
                      </Link>
                    );
                  })}
                </nav>

                {action ? <div className="flex flex-wrap gap-2.5">{action}</div> : null}
              </div>
            </div>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}

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
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <AmbientCanvas />
      <div className="flex min-h-screen">
        <aside className="fixed inset-y-0 left-0 z-50 hidden w-[5.35rem] flex-col items-center border-r border-white/6 bg-[rgba(2,14,11,0.72)] px-3 py-4 backdrop-blur-[30px] xl:flex">
          <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-[1.45rem] border border-white/8 bg-[rgba(255,255,255,0.03)] shadow-[0_20px_44px_rgba(0,0,0,0.28)]">
            <PlatformLogo mode="icon" size="lg" />
          </div>

          <nav className="flex flex-1 flex-col items-center gap-2.5">
            {visibleRoutes.map((route) => {
              const isActive = currentPath === route.href;

              return (
                <Link
                  key={route.href}
                  href={route.href}
                  aria-label={`${route.label} - ${route.description}`}
                  className={cn(
                    "group relative flex h-11 w-11 items-center justify-center rounded-[1rem] border transition-all duration-300",
                    isActive
                      ? "border-[rgba(30,215,96,0.26)] bg-[linear-gradient(180deg,rgba(30,215,96,0.26),rgba(15,164,122,0.16))] text-[var(--accent)] shadow-[0_18px_34px_rgba(9,43,29,0.42)]"
                      : "border-transparent bg-transparent text-[rgba(255,255,255,0.44)] hover:border-white/8 hover:bg-white/6 hover:text-white",
                  )}
                >
                  <route.icon className="h-[18px] w-[18px]" />
                  <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-4 hidden w-56 -translate-y-1/2 rounded-[1.15rem] border border-white/8 bg-[rgba(7,22,17,0.88)] px-4 py-3 text-left shadow-[0_24px_48px_rgba(0,0,0,0.42)] backdrop-blur-[26px] group-hover:block group-focus-visible:block">
                    <span className="block font-mono text-[0.6rem] uppercase tracking-[0.28em] text-[var(--accent)]">
                      {route.label}
                    </span>
                    <span className="mt-1.5 block text-sm leading-5 text-[rgba(255,255,255,0.66)]">
                      {route.description}
                    </span>
                  </span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="min-w-0 flex-1 xl:pl-[5.35rem]">
          <header className="sticky top-0 z-40 px-4 pt-4 sm:px-6 lg:px-8">
            <div className="glass-panel qr-panel rounded-[1.5rem] px-4 py-4 sm:px-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-start gap-3 sm:items-center">
                  <div className="xl:hidden">
                    <PlatformLogo mode="icon" size="sm" />
                  </div>
                  <div className="min-w-0">
                    <nav className="hidden items-center gap-1.5 text-sm sm:flex">
                      <Link href="/" className="text-[rgba(255,255,255,0.42)] transition-colors hover:text-[rgba(255,255,255,0.72)]">
                        Home
                      </Link>
                      <span className="text-[rgba(255,255,255,0.16)]">›</span>
                      <span className="font-medium text-[rgba(255,255,255,0.88)]">
                        {currentRoute.label}
                      </span>
                    </nav>
                    <div className="flex flex-wrap items-center gap-2 sm:mt-1">
                      <h1 className="text-base font-semibold tracking-[-0.05em] text-white sm:text-[1.45rem]">
                        {currentRoute.label}
                      </h1>
                      <span className="success-pill inline-flex items-center rounded-full px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.18em]">
                        {session.role === "admin" ? "admin" : "seller"}
                      </span>
                    </div>
                    <p className="mt-1 max-w-2xl text-xs text-[rgba(255,255,255,0.58)] sm:text-sm">
                      {currentRoute.description}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                  <div className="contents">{action}</div>
                  <form action={logoutAction} className="sm:contents">
                    <button
                      type="submit"
                      className="glass-button-secondary px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[rgba(255,255,255,0.74)]"
                    >
                      Sair
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </header>

          <div className="xl:hidden">
            <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/8 bg-[rgba(5,18,14,0.92)] px-3 py-2 backdrop-blur-[26px]">
              <div className="flex items-stretch gap-2 overflow-x-auto pb-[calc(env(safe-area-inset-bottom)+0.25rem)]">
                {mobileRoutes.map((route) => {
                  const isActive = currentPath === route.href;

                  return (
                    <Link
                      key={route.href}
                      href={route.href}
                      className={cn(
                        "shrink-0 min-w-[5.1rem] rounded-[1rem] border px-3 py-2.5 transition-all",
                        isActive
                          ? "border-[rgba(30,215,96,0.24)] bg-[rgba(30,215,96,0.12)] text-[var(--accent)]"
                          : "border-white/6 bg-[rgba(255,255,255,0.03)] text-[rgba(255,255,255,0.56)] hover:text-white",
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

          <main className="mx-auto max-w-[90rem] px-4 py-5 pb-24 sm:px-6 sm:py-6 sm:pb-8 lg:px-8 xl:pb-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

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
        "glass-panel qr-panel soft-vignette rounded-[1.45rem]",
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
        "glass-inset rounded-[1.15rem]",
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
        <p className="font-mono text-[0.66rem] font-semibold uppercase tracking-[0.32em] text-[var(--accent)]">
          {eyebrow}
        </p>
      ) : null}
      <TitleTag
        className={cn(
          "max-w-[20ch] text-balance text-3xl font-semibold tracking-[-0.06em] text-white sm:text-[2.65rem]",
          eyebrow && "mt-3",
        )}
      >
        {title}
      </TitleTag>
      {description ? (
        <p className="mt-3 max-w-2xl text-base leading-7 text-[rgba(255,255,255,0.64)]">
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
        "glass-panel qr-panel glass-hover rounded-[1.4rem] px-4 py-4 sm:px-5 sm:py-5",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="font-mono text-[0.68rem] font-medium uppercase tracking-[0.24em] text-[rgba(255,255,255,0.5)]">
            {label}
          </p>
          <p className="text-xl font-semibold tracking-[-0.05em] text-[var(--accent)] sm:text-[2rem]">
            {value}
          </p>
          {subtitle ? (
            <p className="mt-0.5 text-xs text-[rgba(255,255,255,0.54)]">{subtitle}</p>
          ) : null}
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[rgba(30,215,96,0.18)] bg-[rgba(30,215,96,0.14)] shadow-[0_14px_34px_rgba(9,43,29,0.28)]">
          <Icon className="h-5 w-5 text-[var(--accent)]" />
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
        "muted-pill inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.7rem] font-medium uppercase tracking-[0.14em]",
        className,
      )}
    >
      {Icon ? <Icon className="h-3.5 w-3.5 text-[var(--accent)]" /> : null}
      {children}
    </div>
  );
}

function AmbientCanvas() {
  return (
    <>
      <div className="glow-orb left-[-9rem] top-8 h-[18rem] w-[18rem] bg-[rgba(30,215,96,0.14)]" />
      <div className="glow-orb right-[-8rem] top-24 h-[16rem] w-[16rem] bg-[rgba(15,164,122,0.14)]" />
      <div className="pointer-events-none absolute inset-0 surface-grid opacity-20" />
    </>
  );
}
