export const HISTORY_STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "normal", label: "Normal" },
  { value: "elevated", label: "Elevated" },
  { value: "high", label: "High" },
] as const;

export const HISTORY_IMAGE_OPTIONS = [
  { value: "all", label: "All" },
  { value: "with", label: "With image" },
  { value: "without", label: "Without image" },
] as const;

export const HISTORY_SORT_OPTIONS = [
  { value: "date", label: "Date" },
  { value: "bp", label: "BP" },
  { value: "pulse", label: "Pulse" },
] as const;

export type HistoryStatusFilter =
  (typeof HISTORY_STATUS_OPTIONS)[number]["value"];
export type HistoryImageFilter =
  (typeof HISTORY_IMAGE_OPTIONS)[number]["value"];
export type HistorySortBy = (typeof HISTORY_SORT_OPTIONS)[number]["value"];
export type HistorySortDir = "asc" | "desc";

export interface HistoryFilters {
  status: HistoryStatusFilter;
  from: string;
  to: string;
  image: HistoryImageFilter;
  tzOffsetMinutes?: number;
}

export interface HistorySort {
  sort: HistorySortBy;
  dir: HistorySortDir;
}

export interface ParsedHistoryQuery {
  page: number;
  filters: HistoryFilters;
  sort: HistorySort;
}

export const DEFAULT_HISTORY_FILTERS: HistoryFilters = {
  status: "all",
  from: "",
  to: "",
  image: "all",
};

export const DEFAULT_HISTORY_SORT: HistorySort = {
  sort: "date",
  dir: "desc",
};

type SearchParamSource =
  | { get(name: string): string | null }
  | Record<string, string | string[] | undefined>;

const VALID_STATUSES = new Set<string>(
  HISTORY_STATUS_OPTIONS.map((option) => option.value),
);
const VALID_IMAGES = new Set<string>(
  HISTORY_IMAGE_OPTIONS.map((option) => option.value),
);
const VALID_SORTS = new Set<string>(
  HISTORY_SORT_OPTIONS.map((option) => option.value),
);
const ISO_DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_TZ_OFFSET_MINUTES = 840;

function readSearchParam(
  source: SearchParamSource,
  key: string,
): string | undefined {
  if (typeof (source as { get?: unknown }).get === "function") {
    return (source as { get(name: string): string | null }).get(key) ?? undefined;
  }
  const value = (source as Record<string, string | string[] | undefined>)[key];
  return Array.isArray(value) ? value[0] : value;
}

/** Parses a positive integer page parameter, defaulting to 1 when invalid. */
export function parsePageParam(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return 1;
  const trimmed = raw.trim();
  if (!/^[1-9]\d*$/.test(trimmed)) return 1;
  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
}

function parseDateOnlyParam(value: string | undefined): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (!ISO_DATE_ONLY_RE.test(trimmed)) return "";

  const [year, month, day] = trimmed.split("-").map(Number);
  const check = new Date(Date.UTC(year, month - 1, day));
  const isValidCalendarDate =
    check.getUTCFullYear() === year &&
    check.getUTCMonth() === month - 1 &&
    check.getUTCDate() === day;

  return isValidCalendarDate ? trimmed : "";
}

function parseTzOffsetParam(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!/^-?\d+$/.test(trimmed)) return undefined;
  const parsed = Number(trimmed);
  if (
    !Number.isSafeInteger(parsed) ||
    parsed < -MAX_TZ_OFFSET_MINUTES ||
    parsed > MAX_TZ_OFFSET_MINUTES
  ) {
    return undefined;
  }
  return parsed;
}

/** Parses and validates all `/history` filter, sort, and pagination URL parameters. */
export function parseHistorySearchParams(
  source: SearchParamSource,
): ParsedHistoryQuery {
  const rawStatus = readSearchParam(source, "status")?.trim();
  const rawImage = readSearchParam(source, "image")?.trim();
  const rawSort = readSearchParam(source, "sort")?.trim();
  const rawDir = readSearchParam(source, "dir")?.trim();

  let from = parseDateOnlyParam(readSearchParam(source, "from"));
  let to = parseDateOnlyParam(readSearchParam(source, "to"));
  if (from && to && from > to) {
    [from, to] = [to, from];
  }

  const tzOffsetMinutes =
    from || to ? parseTzOffsetParam(readSearchParam(source, "tz")) : undefined;

  return {
    page: parsePageParam(readSearchParam(source, "page")),
    filters: {
      status:
        rawStatus && VALID_STATUSES.has(rawStatus)
          ? (rawStatus as HistoryStatusFilter)
          : DEFAULT_HISTORY_FILTERS.status,
      from,
      to,
      image:
        rawImage && VALID_IMAGES.has(rawImage)
          ? (rawImage as HistoryImageFilter)
          : DEFAULT_HISTORY_FILTERS.image,
      ...(tzOffsetMinutes !== undefined ? { tzOffsetMinutes } : {}),
    },
    sort: {
      sort:
        rawSort && VALID_SORTS.has(rawSort)
          ? (rawSort as HistorySortBy)
          : DEFAULT_HISTORY_SORT.sort,
      dir: rawDir === "asc" || rawDir === "desc" ? rawDir : DEFAULT_HISTORY_SORT.dir,
    },
  };
}

/** Converts a `YYYY-MM-DD` date string and timezone offset into UTC range boundaries `[start, nextDayStart)`. */
export function dateOnlyToUtcRangeBounds(
  dateStr: string,
  tzOffsetMinutes = 0,
): { startIso: string; endExclusiveIso: string } {
  const [year, month, day] = dateStr.split("-").map(Number);
  const offsetMs = tzOffsetMinutes * 60_000;
  const startMs = Date.UTC(year, month - 1, day, 0, 0, 0, 0) + offsetMs;
  const endExclusiveMs =
    Date.UTC(year, month - 1, day + 1, 0, 0, 0, 0) + offsetMs;
  return {
    startIso: new Date(startMs).toISOString(),
    endExclusiveIso: new Date(endExclusiveMs).toISOString(),
  };
}

/** Returns true when at least one history filter is active. */
export function hasActiveHistoryFilters(filters: HistoryFilters): boolean {
  return (
    filters.status !== DEFAULT_HISTORY_FILTERS.status ||
    Boolean(filters.from) ||
    Boolean(filters.to) ||
    filters.image !== DEFAULT_HISTORY_FILTERS.image
  );
}

/** Counts how many filter groups (status, measured_at range, image) are active. */
export function countActiveHistoryFilters(filters: HistoryFilters): number {
  return (
    (filters.status !== DEFAULT_HISTORY_FILTERS.status ? 1 : 0) +
    (filters.from || filters.to ? 1 : 0) +
    (filters.image !== DEFAULT_HISTORY_FILTERS.image ? 1 : 0)
  );
}

/** Returns true when sorting differs from the default Date descending order. */
export function hasNonDefaultHistorySort(sort: HistorySort): boolean {
  return (
    sort.sort !== DEFAULT_HISTORY_SORT.sort ||
    sort.dir !== DEFAULT_HISTORY_SORT.dir
  );
}

/** Builds a sparse record of non-default query parameters for `/history` links and pagination. */
export function buildHistoryQueryRecord({
  page = 1,
  filters,
  sort,
}: {
  page?: number;
  filters: HistoryFilters;
  sort: HistorySort;
}): Record<string, string> {
  const record: Record<string, string> = {};

  if (filters.status !== DEFAULT_HISTORY_FILTERS.status) {
    record.status = filters.status;
  }
  if (filters.from) {
    record.from = filters.from;
  }
  if (filters.to) {
    record.to = filters.to;
  }
  if (
    (filters.from || filters.to) &&
    filters.tzOffsetMinutes !== undefined &&
    filters.tzOffsetMinutes !== 0
  ) {
    record.tz = String(filters.tzOffsetMinutes);
  }
  if (filters.image !== DEFAULT_HISTORY_FILTERS.image) {
    record.image = filters.image;
  }
  if (sort.sort !== DEFAULT_HISTORY_SORT.sort) {
    record.sort = sort.sort;
  }
  if (sort.dir !== DEFAULT_HISTORY_SORT.dir) {
    record.dir = sort.dir;
  }
  if (page > 1) {
    record.page = String(page);
  }

  return record;
}

/** Builds a `/history` href containing only non-default query parameters. */
export function buildHistoryHref(options: {
  page?: number;
  filters: HistoryFilters;
  sort: HistorySort;
}): string {
  const params = new URLSearchParams(buildHistoryQueryRecord(options));
  const queryString = params.toString();
  return queryString ? `/history?${queryString}` : "/history";
}
