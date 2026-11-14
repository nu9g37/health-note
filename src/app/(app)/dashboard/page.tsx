import { connection } from "next/server";
import { Suspense } from "react";
import { signOut } from "@/actions/auth";
import { BpForm } from "@/components/bp/bp-form";
import { BpTable } from "@/components/bp/bp-table";
import { requireAuthenticatedSession } from "@/lib/auth/server";
import { getBpLogs } from "@/lib/queries/bp-logs";

export default function DashboardPage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 p-4">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Health Note</h1>
          <Suspense fallback={<p className="text-sm text-muted">&nbsp;</p>}>
            <UserEmail />
          </Suspense>
        </div>
        <form action={signOut}>
          <button className="cursor-pointer rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-subtle">
            Sign out
          </button>
        </form>
      </header>

      <section>
        <h2 className="mb-2 text-lg font-semibold">New record</h2>
        <BpForm />
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">History</h2>
        <Suspense fallback={<p className="text-sm text-muted">Loading...</p>}>
          <History />
        </Suspense>
        <p className="mt-4 text-xs text-muted">
          This app is for personal record keeping only and is not medical
          advice. Consult a doctor if your readings are high.
        </p>
      </section>
    </main>
  );
}

async function UserEmail() {
  await connection();
  const { claims } = await requireAuthenticatedSession();
  return <p className="text-sm text-muted">{claims.email}</p>;
}

async function History() {
  await connection();
  await requireAuthenticatedSession();
  const logs = await getBpLogs();
  return <BpTable logs={logs} />;
}
