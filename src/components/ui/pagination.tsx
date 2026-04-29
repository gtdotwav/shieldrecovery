import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

type PaginationProps = {
  /** Total record count (server-side) */
  total: number;
  /** Current page (1-indexed) */
  page: number;
  /** Records per page */
  pageSize: number;
  /** Build the URL for a given page — keeps existing query params intact */
  buildHref: (page: number) => string;
  /** Optional aria-label for the nav landmark */
  ariaLabel?: string;
};

/**
 * Server-rendered pagination control. Pure links (no client JS) so it
 * cooperates with Next.js streaming and search-engine crawling. Highlights
 * adjacent pages plus boundaries; falls back gracefully on small datasets.
 */
export function Pagination({
  total,
  page,
  pageSize,
  buildHref,
  ariaLabel = "Paginação",
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  const safePage = Math.min(Math.max(1, Math.floor(page || 1)), totalPages);
  const window = collectPages(safePage, totalPages);

  const start = (safePage - 1) * pageSize + 1;
  const end = Math.min(total, safePage * pageSize);

  return (
    <nav aria-label={ariaLabel} className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs text-[var(--muted)]">
        Mostrando <strong>{start}</strong>–<strong>{end}</strong> de{" "}
        <strong>{total}</strong>
      </p>
      <ul className="flex items-center gap-1">
        <PageLink
          href={safePage > 1 ? buildHref(safePage - 1) : null}
          ariaLabel="Página anterior"
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
        </PageLink>
        {window.map((entry, idx) =>
          entry === "ellipsis" ? (
            <li
              key={`ellipsis-${idx}`}
              className="px-2 text-xs text-[var(--muted)]"
              aria-hidden
            >
              …
            </li>
          ) : (
            <PageLink
              key={entry}
              href={buildHref(entry)}
              ariaLabel={`Página ${entry}`}
              ariaCurrent={entry === safePage ? "page" : undefined}
              active={entry === safePage}
            >
              {entry}
            </PageLink>
          ),
        )}
        <PageLink
          href={safePage < totalPages ? buildHref(safePage + 1) : null}
          ariaLabel="Próxima página"
        >
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        </PageLink>
      </ul>
    </nav>
  );
}

function PageLink({
  href,
  children,
  ariaLabel,
  ariaCurrent,
  active,
}: {
  href: string | null;
  children: React.ReactNode;
  ariaLabel?: string;
  ariaCurrent?: "page";
  active?: boolean;
}) {
  const className = `inline-flex h-8 min-w-[2rem] items-center justify-center rounded-lg border px-2 text-xs font-medium transition-colors ${
    active
      ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
      : "border-[var(--border,_#e4e4e7)] text-[var(--foreground)] hover:bg-[var(--accent)]/8"
  } ${href ? "" : "pointer-events-none opacity-40"}`;

  return (
    <li>
      {href ? (
        <Link href={href} aria-label={ariaLabel} aria-current={ariaCurrent} className={className}>
          {children}
        </Link>
      ) : (
        <span className={className} aria-disabled aria-label={ariaLabel}>
          {children}
        </span>
      )}
    </li>
  );
}

type WindowEntry = number | "ellipsis";

function collectPages(current: number, total: number): WindowEntry[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const set = new Set<number>([1, 2, total - 1, total, current - 1, current, current + 1]);
  const sorted = Array.from(set)
    .filter((n) => n >= 1 && n <= total)
    .sort((a, b) => a - b);

  const result: WindowEntry[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const value = sorted[i];
    if (i > 0 && value - sorted[i - 1] > 1) {
      result.push("ellipsis");
    }
    result.push(value);
  }
  return result;
}
