import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { BpTable } from "@/components/bp/bp-table";
import { Pagination } from "@/components/ui/pagination";
import { requireAuthenticatedSession } from "@/lib/auth/server";
import {
  BP_LOGS_PAGE_SIZE,
  getPaginatedBpLogs,
} from "@/lib/queries/bp-logs";

function parsePageParam(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return 1;
  const trimmed = raw.trim();
  if (!/^[1-9]\d*$/.test(trimmed)) return 1;
  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
}

export default function HistoryPage({ searchParams }: PageProps<"/history">) {
  return (
    <section>
      <h2 className="mb-2 text-lg font-semibold">History</h2>
      <Suspense fallback={<p className="text-sm text-muted">Loading...</p>}>
        <HistoryContent searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

async function HistoryContent({
  searchParams,
}: Pick<PageProps<"/history">, "searchParams">) {
  await connection();
  await requireAuthenticatedSession();

  const resolvedSearchParams = await searchParams;
  const requestedPage = parsePageParam(resolvedSearchParams.page);
  const { logs, page, pageSize, totalCount, totalPages } =
    await getPaginatedBpLogs(requestedPage, BP_LOGS_PAGE_SIZE);

  if (requestedPage > 1 && page < requestedPage) {
    redirect(page <= 1 ? "/history" : `/history?page=${page}`);
  }

  return (
    <>
      <BpTable logs={logs} />
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={pageSize}
        basePath="/history"
      />
    </>
  );
}
