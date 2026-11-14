import Link from "next/link";

export type PaginationItem = number | "ellipsis";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  basePath: string;
  pageParam?: string;
  queryParams?: Record<string, string | undefined>;
}

const CONTROL_BASE_CLASS =
  "inline-flex h-8 items-center justify-center rounded-lg border text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50";
const CONTROL_INTERACTIVE_CLASS = `${CONTROL_BASE_CLASS} border-border bg-surface text-foreground hover:bg-surface-subtle`;
const CONTROL_DISABLED_CLASS = `${CONTROL_BASE_CLASS} cursor-not-allowed border-border bg-surface text-muted opacity-50`;
const CONTROL_ACTIVE_CLASS = `${CONTROL_BASE_CLASS} border-primary bg-primary px-2 min-w-8 font-semibold text-primary-foreground`;

/** Computes compact page numbers with ellipsis gaps for large page counts. */
export function getPaginationItems(
  currentPage: number,
  totalPages: number,
): PaginationItem[] {
  if (totalPages <= 0) return [];
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const safeCurrent = Math.min(Math.max(1, currentPage), totalPages);
  const pages = new Set<number>([1, totalPages]);

  if (safeCurrent <= 3) {
    pages.add(2);
    pages.add(3);
    pages.add(4);
  } else if (safeCurrent >= totalPages - 2) {
    pages.add(totalPages - 3);
    pages.add(totalPages - 2);
    pages.add(totalPages - 1);
  } else {
    pages.add(safeCurrent - 1);
    pages.add(safeCurrent);
    pages.add(safeCurrent + 1);
  }

  const sorted = Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);

  const items: PaginationItem[] = [];
  for (const page of sorted) {
    const previous = items[items.length - 1];
    if (typeof previous === "number" && page - previous > 1) {
      items.push(page - previous === 2 ? previous + 1 : "ellipsis");
    }
    items.push(page);
  }

  return items;
}

function buildPageHref(
  basePath: string,
  pageParam: string,
  page: number,
  queryParams?: Record<string, string | undefined>,
): string {
  const query = new URLSearchParams();
  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (key !== pageParam && value) {
        query.set(key, value);
      }
    }
  }
  if (page > 1) {
    query.set(pageParam, String(page));
  }
  const queryString = query.toString();
  return queryString ? `${basePath}?${queryString}` : basePath;
}

function StepButton({
  label,
  ariaLabel,
  href,
}: {
  label: string;
  ariaLabel: string;
  href: string | null;
}) {
  if (!href) {
    return (
      <span aria-disabled="true" className={`${CONTROL_DISABLED_CLASS} px-2.5`}>
        {label}
      </span>
    );
  }

  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className={`${CONTROL_INTERACTIVE_CLASS} px-2.5`}
    >
      {label}
    </Link>
  );
}

/** Accessible pagination bar with range summary, Previous/Next controls, and page links. */
export function Pagination({
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  basePath,
  pageParam = "page",
  queryParams,
}: PaginationProps) {
  if (totalPages <= 0 || totalCount <= 0) return null;

  const safeCurrent = Math.min(Math.max(1, currentPage), totalPages);
  const startItem = (safeCurrent - 1) * pageSize + 1;
  const endItem = Math.min(safeCurrent * pageSize, totalCount);
  const items = getPaginationItems(safeCurrent, totalPages);

  return (
    <nav
      aria-label="Pagination"
      className="mt-4 flex flex-col items-center justify-between gap-3 border-t border-border pt-4 sm:flex-row"
    >
      <p className="text-xs text-muted">
        {startItem === endItem
          ? `Showing ${startItem} of ${totalCount}`
          : `Showing ${startItem}\u2013${endItem} of ${totalCount}`}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-1">
        <StepButton
          label="Previous"
          ariaLabel="Previous page"
          href={
            safeCurrent > 1
              ? buildPageHref(basePath, pageParam, safeCurrent - 1, queryParams)
              : null
          }
        />

        {items.map((item, index) =>
          item === "ellipsis" ? (
            <span
              key={`ellipsis-${index}`}
              aria-hidden="true"
              className="inline-flex h-8 min-w-6 items-center justify-center px-1 text-xs text-muted"
            >
              ...
            </span>
          ) : item === safeCurrent ? (
            <span
              key={item}
              aria-current="page"
              className={CONTROL_ACTIVE_CLASS}
            >
              {item}
            </span>
          ) : (
            <Link
              key={item}
              href={buildPageHref(basePath, pageParam, item, queryParams)}
              aria-label={`Page ${item}`}
              className={`${CONTROL_INTERACTIVE_CLASS} min-w-8 px-2`}
            >
              {item}
            </Link>
          ),
        )}

        <StepButton
          label="Next"
          ariaLabel="Next page"
          href={
            safeCurrent < totalPages
              ? buildPageHref(basePath, pageParam, safeCurrent + 1, queryParams)
              : null
          }
        />
      </div>
    </nav>
  );
}
