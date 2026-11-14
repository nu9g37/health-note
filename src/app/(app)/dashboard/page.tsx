import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { BpForm } from "@/components/bp/bp-form";
import { BpTable } from "@/components/bp/bp-table";
import { requireAuthenticatedSession } from "@/lib/auth/server";
import { getBpLogs } from "@/lib/queries/bp-logs";

export default function DashboardPage() {
  return (
    <>
      <section>
        <h2 className="mb-2 text-lg font-semibold">New record</h2>
        <BpForm />
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">Last 5 History</h2>
          <Link
            href="/history"
            className="text-sm font-medium text-primary-text underline hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            View All
          </Link>
        </div>
        <Suspense fallback={<p className="text-sm text-muted">Loading...</p>}>
          <History />
        </Suspense>
      </section>
    </>
  );
}

async function History() {
  await connection();
  await requireAuthenticatedSession();
  const logs = await getBpLogs(5);
  return <BpTable logs={logs} />;
}
