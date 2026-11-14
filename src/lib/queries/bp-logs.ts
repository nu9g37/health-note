import { getAuthSession } from "@/lib/auth/server";
import {
  DEFAULT_HISTORY_FILTERS,
  DEFAULT_HISTORY_SORT,
  dateOnlyToUtcRangeBounds,
  type HistoryFilters,
  type HistorySort,
} from "@/lib/bp/history-query";
import { createSignedImageUrlMap } from "@/lib/bp/storage";
import type { BpLog, BpLogWithImageUrl } from "@/types";

export const BP_LOGS_PAGE_SIZE = 10;

export interface PaginatedBpLogs {
  logs: BpLogWithImageUrl[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface PaginatedBpLogsOptions {
  filters?: HistoryFilters;
  sort?: HistorySort;
}

type ServerSupabaseClient = Awaited<
  ReturnType<typeof getAuthSession>
>["supabase"];

const MAX_SAFE_OFFSET = 1_000_000_000;

function emptyPaginatedResult(pageSize: number): PaginatedBpLogs {
  return {
    logs: [],
    page: 1,
    pageSize,
    totalCount: 0,
    totalPages: 0,
  };
}

async function attachSignedImageUrls(
  supabase: ServerSupabaseClient,
  logs: BpLog[],
): Promise<BpLogWithImageUrl[]> {
  if (logs.length === 0) return [];

  const imagePaths = logs
    .map((log) => log.image)
    .filter((path): path is string => Boolean(path));
  const signedUrls = await createSignedImageUrlMap(supabase, imagePaths);

  return logs.map((log) => ({
    ...log,
    imageUrl: log.image ? (signedUrls.get(log.image) ?? null) : null,
  }));
}

interface BpFilterableQuery<T> {
  lt(column: string, value: number | string): T;
  gte(column: string, value: number | string): T;
  or(filters: string): T;
  is(column: string, value: null): T;
  not(column: string, operator: string, value: null): T;
}

function applyBpLogFilters<T extends BpFilterableQuery<T>>(
  query: T,
  filters: HistoryFilters,
): T {
  let next = query;

  if (filters.status === "high") {
    next = next.or("systolic.gte.140,diastolic.gte.90");
  } else if (filters.status === "elevated") {
    next = next
      .lt("systolic", 140)
      .lt("diastolic", 90)
      .or("systolic.gte.120,diastolic.gte.80");
  } else if (filters.status === "normal") {
    next = next.lt("systolic", 120).lt("diastolic", 80);
  }

  const tzOffset = filters.tzOffsetMinutes ?? 0;
  if (filters.from) {
    next = next.gte(
      "measured_at",
      dateOnlyToUtcRangeBounds(filters.from, tzOffset).startIso,
    );
  }
  if (filters.to) {
    next = next.lt(
      "measured_at",
      dateOnlyToUtcRangeBounds(filters.to, tzOffset).endExclusiveIso,
    );
  }

  if (filters.image === "with") {
    next = next.not("image", "is", null);
  } else if (filters.image === "without") {
    next = next.is("image", null);
  }

  return next;
}

function buildFilteredBpLogsQuery(
  supabase: ServerSupabaseClient,
  filters: HistoryFilters,
  sort: HistorySort,
) {
  const baseQuery = applyBpLogFilters(
    supabase.from("blood_pressure_logs").select("*", { count: "exact" }),
    filters,
  );
  const ascending = sort.dir === "asc";

  if (sort.sort === "bp") {
    return baseQuery
      .order("systolic", { ascending })
      .order("diastolic", { ascending })
      .order("measured_at", { ascending: false })
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });
  }

  if (sort.sort === "pulse") {
    return baseQuery
      .order("pulse", { ascending, nullsFirst: false })
      .order("measured_at", { ascending: false })
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });
  }

  return baseQuery
    .order("measured_at", { ascending })
    .order("created_at", { ascending })
    .order("id", { ascending });
}

async function queryBpLogsRange(
  supabase: ServerSupabaseClient,
  from: number,
  to: number,
  filters: HistoryFilters,
  sort: HistorySort,
) {
  return buildFilteredBpLogsQuery(supabase, filters, sort).range(from, to);
}

async function queryBpLogsCount(
  supabase: ServerSupabaseClient,
  filters: HistoryFilters,
): Promise<number> {
  const { count, error } = await applyBpLogFilters(
    supabase
      .from("blood_pressure_logs")
      .select("*", { count: "exact", head: true }),
    filters,
  );

  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function fetchLastValidPage(
  supabase: ServerSupabaseClient,
  pageSize: number,
  totalCount: number,
  filters: HistoryFilters,
  sort: HistorySort,
): Promise<PaginatedBpLogs> {
  if (totalCount <= 0) {
    return emptyPaginatedResult(pageSize);
  }

  const totalPages = Math.ceil(totalCount / pageSize);
  const from = (totalPages - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, error } = await queryBpLogsRange(
    supabase,
    from,
    to,
    filters,
    sort,
  );

  if (error) throw new Error(error.message);

  return {
    logs: await attachSignedImageUrls(supabase, (data ?? []) as BpLog[]),
    page: totalPages,
    pageSize,
    totalCount,
    totalPages,
  };
}

/** Fetches the latest blood pressure logs with short-lived signed image URLs. */
export async function getBpLogs(limit = 50): Promise<BpLogWithImageUrl[]> {
  const session = await getAuthSession();
  if (session.kind !== "authenticated") return [];

  const { data, error } = await session.supabase
    .from("blood_pressure_logs")
    .select("*")
    .order("measured_at", { ascending: false })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  return attachSignedImageUrls(session.supabase, (data ?? []) as BpLog[]);
}

/** Fetches a single page of filtered and sorted blood pressure logs with total count and signed image URLs. */
export async function getPaginatedBpLogs(
  page = 1,
  pageSize = BP_LOGS_PAGE_SIZE,
  options: PaginatedBpLogsOptions = {},
): Promise<PaginatedBpLogs> {
  const safePageSize =
    Number.isInteger(pageSize) && pageSize > 0 ? pageSize : BP_LOGS_PAGE_SIZE;
  const requestedPage = Number.isInteger(page) && page >= 1 ? page : 1;
  const filters = options.filters ?? DEFAULT_HISTORY_FILTERS;
  const sort = options.sort ?? DEFAULT_HISTORY_SORT;

  const session = await getAuthSession();
  if (session.kind !== "authenticated") {
    return emptyPaginatedResult(safePageSize);
  }

  const from = (requestedPage - 1) * safePageSize;
  const to = from + safePageSize - 1;

  if (from > MAX_SAFE_OFFSET || to > MAX_SAFE_OFFSET) {
    const totalCount = await queryBpLogsCount(session.supabase, filters);
    return fetchLastValidPage(
      session.supabase,
      safePageSize,
      totalCount,
      filters,
      sort,
    );
  }

  const { data, count, error } = await queryBpLogsRange(
    session.supabase,
    from,
    to,
    filters,
    sort,
  );

  if (error) {
    // PostgREST returns PGRST103 (HTTP 416) when the requested range starts past the final row.
    if (error.code === "PGRST103" && requestedPage > 1) {
      const totalCount = await queryBpLogsCount(session.supabase, filters);
      return fetchLastValidPage(
        session.supabase,
        safePageSize,
        totalCount,
        filters,
        sort,
      );
    }
    throw new Error(error.message);
  }

  const totalCount = count ?? 0;
  if (totalCount === 0) {
    return emptyPaginatedResult(safePageSize);
  }

  const totalPages = Math.ceil(totalCount / safePageSize);
  if (requestedPage > totalPages) {
    return fetchLastValidPage(
      session.supabase,
      safePageSize,
      totalCount,
      filters,
      sort,
    );
  }

  return {
    logs: await attachSignedImageUrls(
      session.supabase,
      (data ?? []) as BpLog[],
    ),
    page: requestedPage,
    pageSize: safePageSize,
    totalCount,
    totalPages,
  };
}
