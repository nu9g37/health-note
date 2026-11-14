import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { signOut } from "@/actions/auth";
import { AppNav, AppNavFallback } from "@/components/layout/app-nav";
import { requireAuthenticatedSession } from "@/lib/auth/server";

/** Shared app shell with header, primary navigation, and disclaimer footer for authenticated routes. */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 pb-8 pt-2">
      <header className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight">
              <Link href="/dashboard" className="hover:opacity-90">
                Health Note
              </Link>
            </h1>
            <Suspense fallback={<p className="text-sm text-muted">&nbsp;</p>}>
              <UserEmail />
            </Suspense>
          </div>
          <form action={signOut} className="shrink-0">
            <button
              type="submit"
              className="cursor-pointer rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              Sign out
            </button>
          </form>
        </div>

        <Suspense fallback={<AppNavFallback />}>
          <AppNav />
        </Suspense>
      </header>

      <main className="flex flex-1 flex-col gap-6">{children}</main>

      <footer className="mt-auto pt-2 text-xs text-muted">
        This app is for personal record keeping only and is not medical advice.
        Consult a doctor if your readings are high.
      </footer>
    </div>
  );
}

async function UserEmail() {
  await connection();
  const { claims } = await requireAuthenticatedSession();
  return (
    <p className="truncate text-sm text-muted">{claims.email ?? "\u00A0"}</p>
  );
}
