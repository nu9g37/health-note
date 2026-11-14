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
        <h2 className="mb-2 text-lg font-semibold">History</h2>
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
  const logs = await getBpLogs();
  return <BpTable logs={logs} />;
}
