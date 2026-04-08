import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BookOpen,
  Bot,
  CalendarDays,
  ChevronRight,
  FlaskConical,
  LayoutDashboard,
  Link2,
  LogOut,
  Megaphone,
  MessageSquare,
  PhoneCall,
  Settings,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";

import { logoutAction } from "@/app/actions/auth-actions";
import { PlatformLogo } from "@/components/platform/platform-logo";
import { MobileMoreMenu } from "@/components/platform/mobile-more-menu";
import { ThemeToggle } from "@/components/ui/theme-toggle";
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
  external?: boolean;
};

export const platformRoutes: PlatformRoute[] = [
  {
    href: "/",
    label: "Home",
    description: platformBrand.name,
    icon: LayoutDashboard,
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
    allowedRoles: ["admin", "seller"],
  },
  {
    href: "/financeiro",
    label: "Financeiro",
    description: "Saldo, comissões e saques.",
    icon: Wallet,
    kind: "app",
    allowedRoles: ["admin", "seller"],
  },
  {
    href: "/connect",
    label: "Integrações",
    description: "O que está ativo e o que falta.",
    icon: Settings,
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
    icon: Users,
    kind: "app",
    allowedRoles: ["admin", "seller"],
  },
  {
    href: "/inbox",
    label: "Conversas",
    description: "Quem precisa de resposta.",
    icon: MessageSquare,
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
  {
    href: "/calling",
    label: "CallCenter",
    description: "Agente de voz IA para recuperação de clientes.",
    icon: PhoneCall,
    kind: "app",
    allowedRoles: ["admin", "seller"],
  },
  {
    href: "/marketing",
    label: "Marketing",
    description: "Painel de resultados e estratégias de captação.",
    icon: Megaphone,
    kind: "app",
    allowedRoles: ["admin", "market"],
  },
  {
    href: "/checkout/dashboard",
    label: "Checkout",
    description: "Plataforma de pagamentos e transações.",
    icon: Link2,
    kind: "app",
    external: true,
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

function getInitials(email: string) {
  const name = email.split("@")[0] ?? "";
  return name.slice(0, 2).toUpperCase();
}

function getRoleLabel(role: UserRole) {
  if (role === "admin") return "Admin";
  if (role === "market") return "PagRecovery";
  return "Seller";
}

function getDisplayName(email: string, role: UserRole) {
  if (role === "market") return "PagRecovery";
  return email.split("@")[0];
}

function getDisplayInitials(email: string, role: UserRole) {
  if (role === "market") return "PR";
  return getInitials(email);
}

/* ── Shield logo mark (3x3 dot grid) ── */

function ShieldMark() {
  return (
    <div className="mb-6 w-10 h-10 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center">
      <div className="grid grid-cols-3 gap-[3px] w-6 h-6">
        <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
        <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
        <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
        <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
        <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
        <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
        <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] opacity-50" />
        <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] opacity-50" />
        <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] opacity-50" />
      </div>
    </div>
  );
}

/* ── Marketing / public shell ── */

export function PlatformPage({
  currentPath,
  action,
  children,
}: {
  currentPath: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const visibleRoutes = getVisibleRoutes();

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <main className="mx-auto max-w-[88rem] px-4 pb-20 pt-4 sm:px-6 sm:pt-6 lg:px-8">
        <header className="sticky top-4 z-40 mb-6">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)]/95 px-5 py-3.5 backdrop-blur-sm sm:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <PlatformLogo size="lg" emphasis="strong" className="max-sm:self-start" />

              <div className="flex flex-col gap-3 lg:items-end">
                <nav className="flex flex-wrap items-center gap-1.5">
                  {visibleRoutes.map((route) => {
                    const isActive = !route.external && currentPath === route.href;
                    const cls = cn(
                      "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                      isActive
                        ? "border-[var(--accent)]/20 bg-[var(--accent)]/10 text-[var(--accent)]"
                        : "border-[var(--border)] bg-transparent text-[var(--muted)] hover:bg-[var(--surface-strong)] hover:text-[var(--foreground)]",
                    );

                    return route.external ? (
                      <a key={route.href} href={route.href} className={cls}>
                        {route.label}
                      </a>
                    ) : (
                      <Link key={route.href} href={route.href} className={cls}>
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
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const session = await requireAuthenticatedSession();
  const visibleRoutes = platformRoutes.filter((route) => {
    if ("devOnly" in route && route.devOnly) return false;
    if ("experimental" in route && route.experimental && !appEnv.experimentalPagesEnabled) return false;
    if (route.allowedRoles && !route.allowedRoles.includes(session.role)) return false;
    return true;
  });
  const currentRoute =
    visibleRoutes.find((route) => !route.external && route.href === currentPath) ??
    visibleRoutes.find((route) => route.kind === "app") ??
    visibleRoutes[0];
  const appRoutes = visibleRoutes.filter((route) => route.kind === "app");
  const initials = getDisplayInitials(session.email, session.role);
  const roleLabel = getRoleLabel(session.role);
  const displayName = getDisplayName(session.email, session.role);

  return (
    <div className="flex h-screen bg-[#f5f5f7] dark:bg-[#0d0d0d] overflow-hidden transition-colors duration-300">
      {/* ─── Desktop sidebar (icon-only, w-16) ─── */}
      <aside className="hidden md:flex w-16 bg-white dark:bg-[#111111] border-r border-gray-200 dark:border-gray-800 flex-col items-center py-4 justify-between shrink-0 h-screen sticky top-0 transition-colors duration-300">
        <nav aria-label="Navegação principal" className="flex flex-col items-center gap-1">
          <ShieldMark />

          {appRoutes.map((route) => {
            const isActive = !route.external && currentPath === route.href;
            const linkClass = cn(
              "relative group/tip w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
              isActive
                ? "bg-[var(--accent)]/10 text-[var(--accent)]"
                : "text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800",
            );

            const tooltip = (
              <span className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 w-max max-w-[12rem] rounded-lg bg-gray-900 dark:bg-gray-100 px-3 py-2 opacity-0 scale-95 transition-all duration-150 group-hover/tip:opacity-100 group-hover/tip:scale-100 z-50 shadow-lg">
                <span className="block text-xs font-semibold text-white dark:text-gray-900">{route.label}</span>
                <span className="block text-[0.65rem] leading-snug text-gray-300 dark:text-gray-500 mt-0.5">{route.description}</span>
              </span>
            );

            return route.external ? (
              <a
                key={route.href}
                href={route.href}
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
              >
                <route.icon className="w-5 h-5" />
                {tooltip}
              </a>
            ) : (
              <Link
                key={route.href}
                href={route.href}
                className={linkClass}
                {...(isActive ? { "aria-current": "page" as const } : {})}
              >
                <route.icon className="w-5 h-5" />
                {tooltip}
              </Link>
            );
          })}
        </nav>

        <div className="flex flex-col items-center gap-1">
          <form action={logoutAction}>
            <button
              type="submit"
              aria-label="Sair"
              className="relative group/tip w-10 h-10 rounded-lg flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-red-500 hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 w-max max-w-[12rem] rounded-lg bg-gray-900 dark:bg-gray-100 px-3 py-2 opacity-0 scale-95 transition-all duration-150 group-hover/tip:opacity-100 group-hover/tip:scale-100 z-50 shadow-lg">
                <span className="block text-xs font-semibold text-white dark:text-gray-900">Sair</span>
                <span className="block text-[0.65rem] leading-snug text-gray-300 dark:text-gray-500 mt-0.5">Encerrar sessão e voltar ao login.</span>
              </span>
            </button>
          </form>
          <ThemeToggle />
        </div>
      </aside>

      {/* ─── Mobile bottom nav ─── */}
      <nav aria-label="Navegação mobile" className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-[#111111] border-t border-gray-200 dark:border-gray-800 flex items-center justify-around px-1 py-2 safe-bottom transition-colors duration-300">
        {appRoutes.slice(0, 4).map((route) => {
          const isActive = !route.external && currentPath === route.href;
          const cls = cn(
            "flex flex-col items-center gap-0.5 min-w-[3.25rem] min-h-[2.75rem] justify-center px-1 rounded-lg transition-colors",
            isActive
              ? "text-[var(--accent)]"
              : "text-gray-400 dark:text-gray-500",
          );

          return route.external ? (
            <a key={route.href} href={route.href} className={cls}>
              <route.icon className="w-5 h-5 shrink-0" />
              <span className="text-[0.55rem] leading-tight truncate max-w-[4.5rem] sm:text-[0.6rem]">{route.label}</span>
            </a>
          ) : (
            <Link key={route.href} href={route.href} className={cls} {...(isActive ? { "aria-current": "page" as const } : {})}>
              <route.icon className="w-5 h-5 shrink-0" />
              <span className="text-[0.55rem] leading-tight truncate max-w-[4.5rem] sm:text-[0.6rem]">{route.label}</span>
            </Link>
          );
        })}
        <MobileMoreMenu
          routes={appRoutes.slice(4).map((r) => ({
            href: r.href,
            label: r.label,
            icon: <r.icon className="w-4 h-4" />,
            external: r.external,
          }))}
          currentPath={currentPath}
        />
      </nav>

      {/* ─── Main area ─── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-transparent px-4 md:px-6 h-12 md:h-14 flex items-center justify-between shrink-0 transition-colors duration-300">
          <nav className="flex items-center gap-1.5 text-xs md:text-sm text-gray-500 dark:text-gray-500">
            <Link
              href="/"
              className="hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer"
            >
              Home
            </Link>
            <ChevronRight className="w-3 h-3 md:w-3.5 md:h-3.5" />
            <span className="hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer hidden sm:inline">
              {roleLabel}
            </span>
            <ChevronRight className="w-3 h-3 md:w-3.5 md:h-3.5 hidden sm:block" />
            <span className="text-gray-900 dark:text-white">
              {currentRoute.label}
            </span>
          </nav>

          <div className="flex items-center gap-2">
            {action}
            <span className="text-sm text-gray-600 dark:text-gray-300 hidden sm:inline">
              {displayName}
            </span>
            <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-[var(--accent)] flex items-center justify-center text-white text-xs md:text-sm font-semibold">
              {initials}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main id="main-content" className="flex-1 overflow-y-auto px-4 md:px-6 py-4 md:py-6 pb-16 md:pb-6">
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
        "rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a1a1a] transition-colors duration-300",
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
        "rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#111111]",
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
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-[var(--accent)]/70">
          {eyebrow}
        </p>
      ) : null}
      <div className="flex items-center gap-2.5">
        <div className="w-1 h-7 bg-[var(--accent)] rounded-full" />
        <TitleTag
          className={cn(
            "text-gray-900 dark:text-white text-xl font-semibold tracking-[-0.02em] sm:text-2xl",
            eyebrow && "mt-2",
          )}
        >
          {title}
        </TitleTag>
      </div>
      {description ? (
        <p className="mt-1 ml-3.5 text-xs sm:text-sm text-gray-400 dark:text-gray-500">
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
        "rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a1a1a] px-5 py-4 transition-colors duration-300",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-[0.68rem] font-medium uppercase tracking-[0.08em] text-gray-400 dark:text-gray-500">
            {label}
          </p>
          <p className="text-[1.85rem] font-semibold tracking-[-0.03em] text-gray-900 dark:text-white sm:text-[2rem]">
            {value}
          </p>
          {subtitle ? (
            <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{subtitle}</p>
          ) : null}
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--accent)]/10 text-[var(--accent)]">
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
        "inline-flex items-center gap-1.5 rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a1a1a] px-2.5 py-1 text-[0.68rem] font-medium text-gray-500 dark:text-gray-400",
        className,
      )}
    >
      {Icon ? <Icon className="h-3 w-3 text-[var(--accent)]/60" /> : null}
      {children}
    </div>
  );
}
