import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import {
  BpHistoryControls,
  BpHistoryControlsFallback,
} from "@/components/bp/bp-history-controls";
import { BpTable } from "@/components/bp/bp-table";
import { Pagination } from "@/components/ui/pagination";
import { requireAuthenticatedSession } from "@/lib/auth/server";
import {
  buildHistoryHref,
  buildHistoryQueryRecord,
  hasActiveHistoryFilters,
  parseHistorySearchParams,
} from "@/lib/bp/history-query";
import {
  BP_LOGS_PAGE_SIZE,
  getPaginatedBpLogs,
} from "@/lib/queries/bp-logs";

export default function HistoryPage({ searchParams }: PageProps<"/history">) {
  return (
    <section>
      <h2 className="mb-2 text-lg font-semibold">History</h2>
      <Suspense fallback={<BpHistoryControlsFallback />}>
        <BpHistoryControls />
      </Suspense>
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
  const { page: requestedPage, filters, sort } =
    parseHistorySearchParams(resolvedSearchParams);
  const { logs, page, pageSize, totalCount, totalPages } =
    await getPaginatedBpLogs(requestedPage, BP_LOGS_PAGE_SIZE, {
      filters,
      sort,
    });

  if (requestedPage > 1 && page < requestedPage) {
    redirect(buildHistoryHref({ page, filters, sort }));
  }

  const hasFilters = hasActiveHistoryFilters(filters);

  return (
    <>
      <BpTable
        logs={logs}
        emptyMessage={
          hasFilters
            ? "No records match the current filters."
            : "No records yet."
        }
      />
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={pageSize}
        basePath="/history"
        queryParams={buildHistoryQueryRecord({ page: 1, filters, sort })}
      />
    </>
  );
}
