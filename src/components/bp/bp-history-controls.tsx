"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useId, useOptimistic, useState, useTransition } from "react";
import {
  buildHistoryHref,
  countActiveHistoryFilters,
  DEFAULT_HISTORY_FILTERS,
  HISTORY_IMAGE_OPTIONS,
  HISTORY_SORT_OPTIONS,
  HISTORY_STATUS_OPTIONS,
  hasActiveHistoryFilters,
  hasNonDefaultHistorySort,
  parseHistorySearchParams,
  type HistoryFilters,
  type HistoryImageFilter,
  type HistorySort,
  type HistorySortBy,
  type HistorySortDir,
  type HistoryStatusFilter,
} from "@/lib/bp/history-query";

interface OptionItem<T extends string> {
  value: T;
  label: string;
}

function SegmentedOptionGroup<T extends string>({
  legend,
  options,
  value,
  onChange,
  columnsClass,
}: {
  legend: string;
  options: readonly OptionItem<T>[];
  value: T;
  onChange: (next: T) => void;
  columnsClass: string;
}) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="text-xs font-medium text-muted">{legend}</legend>
      <div className={`grid gap-1.5 ${columnsClass}`}>
        {options.map((option) => {
          const isSelected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onChange(option.value)}
              className={`cursor-pointer rounded-lg border px-2.5 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                isSelected
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-background text-foreground hover:bg-surface-subtle"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function FilterIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      className="h-4 w-4 shrink-0 text-muted"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 5h14M6 10h8M8.5 15h3"
      />
    </svg>
  );
}

function ChevronIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      className={`h-4 w-4 shrink-0 text-muted transition-transform duration-150 ${
        isOpen ? "rotate-180" : ""
      }`}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m5 7.5 5 5 5-5"
      />
    </svg>
  );
}

function formatSortSummary(sort: HistorySort): string {
  const fieldLabel =
    HISTORY_SORT_OPTIONS.find((item) => item.value === sort.sort)?.label ??
    "Date";
  if (sort.sort === "date") {
    return `${fieldLabel} (${sort.dir === "desc" ? "Newest" : "Oldest"})`;
  }
  return `${fieldLabel} (${sort.dir === "desc" ? "High–Low" : "Low–High"})`;
}

/** Collapsible inline filter and sort controls synchronized with `/history` URL query params. */
export function BpHistoryControls() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const panelId = useId();
  const [isPending, startTransition] = useTransition();

  const { filters: urlFilters, sort: urlSort } =
    parseHistorySearchParams(searchParams);
  const [optimisticQuery, setOptimisticQuery] = useOptimistic(
    { filters: urlFilters, sort: urlSort },
    (_current, next: { filters: HistoryFilters; sort: HistorySort }) => next,
  );
  const { filters, sort } = optimisticQuery;

  const hasFilters = hasActiveHistoryFilters(filters);
  const activeFilterCount = countActiveHistoryFilters(filters);
  const hasCustomSort = hasNonDefaultHistorySort(sort);

  const [isOpen, setIsOpen] = useState(() => hasFilters || hasCustomSort);

  function navigateWithQuery(
    nextFilters: HistoryFilters,
    nextSort: HistorySort,
  ) {
    const href = buildHistoryHref({
      page: 1,
      filters: nextFilters,
      sort: nextSort,
    });
    startTransition(() => {
      setOptimisticQuery({ filters: nextFilters, sort: nextSort });
      router.push(href, { scroll: false });
    });
  }

  function handleStatusChange(nextStatus: HistoryStatusFilter) {
    if (nextStatus === filters.status) return;
    navigateWithQuery({ ...filters, status: nextStatus }, sort);
  }

  function handleImageChange(nextImage: HistoryImageFilter) {
    if (nextImage === filters.image) return;
    navigateWithQuery({ ...filters, image: nextImage }, sort);
  }

  function handleDateChange(bound: "from" | "to", nextValue: string) {
    let nextFrom = bound === "from" ? nextValue : filters.from;
    let nextTo = bound === "to" ? nextValue : filters.to;

    if (nextFrom && nextTo && nextFrom > nextTo) {
      if (bound === "from") {
        nextTo = nextFrom;
      } else {
        nextFrom = nextTo;
      }
    }

    const hasDateRange = Boolean(nextFrom || nextTo);
    navigateWithQuery(
      {
        ...filters,
        from: nextFrom,
        to: nextTo,
        tzOffsetMinutes: hasDateRange
          ? new Date().getTimezoneOffset()
          : undefined,
      },
      sort,
    );
  }

  function handleClearFilters() {
    if (!hasFilters) return;
    navigateWithQuery(DEFAULT_HISTORY_FILTERS, sort);
  }

  function handleSortFieldChange(nextSortBy: HistorySortBy) {
    if (nextSortBy === sort.sort) return;
    navigateWithQuery(filters, { ...sort, sort: nextSortBy });
  }

  function handleSortDirChange(nextDir: HistorySortDir) {
    if (nextDir === sort.dir) return;
    navigateWithQuery(filters, { ...sort, dir: nextDir });
  }

  const directionOptions: readonly OptionItem<HistorySortDir>[] =
    [
      { value: "asc", label: "Ascending" },
      { value: "desc", label: "Descending" },
    ];

  return (
    <div
      aria-busy={isPending || undefined}
      className="mb-4 rounded-xl border border-border bg-surface shadow-sm"
    >
      <h3 className="m-0">
        <button
          type="button"
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl px-4 py-3 text-left transition-colors hover:bg-surface-subtle/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          <span className="flex min-w-0 flex-wrap items-center gap-2">
            <FilterIcon />
            <span className="text-sm font-semibold text-foreground">
              Filter &amp; Sort
            </span>
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary-text">
                {activeFilterCount} active
              </span>
            )}
            {hasCustomSort && (
              <span className="truncate text-xs text-muted">
                · {formatSortSummary(sort)}
              </span>
            )}
          </span>

          <span className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-muted">
            {isPending ? "Updating..." : isOpen ? "Hide" : "Show"}
            <ChevronIcon isOpen={isOpen} />
          </span>
        </button>
      </h3>

      {isOpen && (
        <div
          id={panelId}
          className="flex flex-col gap-4 border-t border-border p-4"
        >
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">
              Filter
            </h4>

            <SegmentedOptionGroup
              legend="Status"
              options={HISTORY_STATUS_OPTIONS}
              value={filters.status}
              onChange={handleStatusChange}
              columnsClass="grid-cols-2 min-[460px]:grid-cols-4"
            />

            <fieldset className="flex flex-col gap-1.5">
              <legend className="text-xs font-medium text-muted">
                Measured At
              </legend>
              <div className="grid grid-cols-1 gap-2 min-[460px]:grid-cols-2 min-[460px]:gap-3">
                <label className="flex min-w-0 flex-col gap-1">
                  <span className="text-[11px] font-medium text-muted">
                    From
                  </span>
                  <input
                    type="date"
                    aria-label="Measured at from"
                    value={filters.from}
                    onChange={(event) =>
                      handleDateChange("from", event.target.value)
                    }
                    className="w-full min-w-0 rounded-lg border border-border bg-background px-2.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </label>
                <label className="flex min-w-0 flex-col gap-1">
                  <span className="text-[11px] font-medium text-muted">To</span>
                  <input
                    type="date"
                    aria-label="Measured at to"
                    value={filters.to}
                    onChange={(event) =>
                      handleDateChange("to", event.target.value)
                    }
                    className="w-full min-w-0 rounded-lg border border-border bg-background px-2.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </label>
              </div>
            </fieldset>

            <SegmentedOptionGroup
              legend="Image"
              options={HISTORY_IMAGE_OPTIONS}
              value={filters.image}
              onChange={handleImageChange}
              columnsClass="grid-cols-3"
            />

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleClearFilters}
                disabled={!hasFilters}
                className="cursor-pointer rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Clear filters
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-border pt-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">
              Sort
            </h4>

            <div className="grid grid-cols-1 gap-3 min-[460px]:grid-cols-2">
              <SegmentedOptionGroup
                legend="Sort by"
                options={HISTORY_SORT_OPTIONS}
                value={sort.sort}
                onChange={handleSortFieldChange}
                columnsClass="grid-cols-3"
              />

              <SegmentedOptionGroup
                legend="Order"
                options={directionOptions}
                value={sort.dir}
                onChange={handleSortDirChange}
                columnsClass="grid-cols-2"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Static fallback bar matching the collapsed dimensions of `BpHistoryControls`. */
export function BpHistoryControlsFallback() {
  return (
    <div
      aria-hidden="true"
      className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3 shadow-sm"
    >
      <span className="flex items-center gap-2">
        <FilterIcon />
        <span className="text-sm font-semibold text-foreground">
          Filter &amp; Sort
        </span>
      </span>
      <span className="flex items-center gap-1.5 text-xs font-medium text-muted">
        Show
        <ChevronIcon isOpen={false} />
      </span>
    </div>
  );
}
