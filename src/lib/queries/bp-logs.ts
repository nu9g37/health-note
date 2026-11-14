import { getAuthSession } from "@/lib/auth/server";
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

function orderedBpLogsQuery(supabase: ServerSupabaseClient) {
  return supabase
    .from("blood_pressure_logs")
    .select("*", { count: "exact" })
    .order("measured_at", { ascending: false })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });
}

async function queryBpLogsRange(
  supabase: ServerSupabaseClient,
  from: number,
  to: number,
) {
  return orderedBpLogsQuery(supabase).range(from, to);
}

async function queryBpLogsCount(supabase: ServerSupabaseClient): Promise<number> {
  const { count, error } = await supabase
    .from("blood_pressure_logs")
    .select("*", { count: "exact", head: true });

  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function fetchLastValidPage(
  supabase: ServerSupabaseClient,
  pageSize: number,
  totalCount: number,
): Promise<PaginatedBpLogs> {
  if (totalCount <= 0) {
    return emptyPaginatedResult(pageSize);
  }

  const totalPages = Math.ceil(totalCount / pageSize);
  const from = (totalPages - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, error } = await queryBpLogsRange(supabase, from, to);

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

/** Fetches a single page of blood pressure logs with total count and signed image URLs. */
export async function getPaginatedBpLogs(
  page = 1,
  pageSize = BP_LOGS_PAGE_SIZE,
): Promise<PaginatedBpLogs> {
  const safePageSize =
    Number.isInteger(pageSize) && pageSize > 0 ? pageSize : BP_LOGS_PAGE_SIZE;
  const requestedPage = Number.isInteger(page) && page >= 1 ? page : 1;

  const session = await getAuthSession();
  if (session.kind !== "authenticated") {
    return emptyPaginatedResult(safePageSize);
  }

  const from = (requestedPage - 1) * safePageSize;
  const to = from + safePageSize - 1;

  if (from > MAX_SAFE_OFFSET || to > MAX_SAFE_OFFSET) {
    const totalCount = await queryBpLogsCount(session.supabase);
    return fetchLastValidPage(session.supabase, safePageSize, totalCount);
  }

  const { data, count, error } = await queryBpLogsRange(
    session.supabase,
    from,
    to,
  );

  if (error) {
    // PostgREST returns PGRST103 (HTTP 416) when the requested range starts past the final row.
    if (error.code === "PGRST103" && requestedPage > 1) {
      const totalCount = await queryBpLogsCount(session.supabase);
      return fetchLastValidPage(session.supabase, safePageSize, totalCount);
    }
    throw new Error(error.message);
  }

  const totalCount = count ?? 0;
  if (totalCount === 0) {
    return emptyPaginatedResult(safePageSize);
  }

  const totalPages = Math.ceil(totalCount / safePageSize);
  if (requestedPage > totalPages) {
    return fetchLastValidPage(session.supabase, safePageSize, totalCount);
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
