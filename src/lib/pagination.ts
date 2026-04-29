/**
 * Server-side pagination helpers. Use in server components or server actions
 * to derive the page/pageSize from searchParams safely.
 */

export type PaginationParams = {
  page: number;
  pageSize: number;
  offset: number;
};

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

export function parsePaginationParams(
  searchParams: URLSearchParams | Record<string, string | string[] | undefined>,
  defaults?: { pageSize?: number },
): PaginationParams {
  const get = (key: string): string | undefined => {
    if (searchParams instanceof URLSearchParams) {
      return searchParams.get(key) ?? undefined;
    }
    const value = searchParams[key];
    if (Array.isArray(value)) return value[0];
    return value;
  };

  const requestedSize = Number(get("size") ?? defaults?.pageSize ?? DEFAULT_PAGE_SIZE);
  const requestedPage = Number(get("page") ?? 1);

  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number.isFinite(requestedSize) ? Math.floor(requestedSize) : DEFAULT_PAGE_SIZE),
  );
  const page = Math.max(1, Number.isFinite(requestedPage) ? Math.floor(requestedPage) : 1);

  return { page, pageSize, offset: (page - 1) * pageSize };
}

/**
 * Build a URL string for the next page that preserves all other params.
 *
 *   const buildHref = createHrefBuilder(req.nextUrl.pathname, searchParams);
 *   <Pagination buildHref={buildHref} … />
 */
export function createHrefBuilder(
  pathname: string,
  searchParams:
    | URLSearchParams
    | Record<string, string | string[] | undefined>,
): (page: number) => string {
  const carry = new URLSearchParams();
  if (searchParams instanceof URLSearchParams) {
    for (const [key, value] of searchParams) carry.set(key, value);
  } else {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value === undefined || value === null) continue;
      carry.set(key, Array.isArray(value) ? value[0] ?? "" : value);
    }
  }

  return (page: number) => {
    carry.set("page", String(page));
    return `${pathname}?${carry.toString()}`;
  };
}
