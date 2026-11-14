import { connection } from "next/server";
import { Suspense } from "react";
import { signOut } from "@/actions/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { requireAuthenticatedSession } from "@/lib/auth/server";

export default function SettingsPage() {
  return (
    <>
      <section>
        <h2 className="mb-2 text-lg font-semibold">Settings</h2>
        <div className="divide-y divide-border rounded-xl border border-border bg-surface shadow-sm">
          <div className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="shrink-0">
              <h3 className="text-sm font-medium text-foreground">Account</h3>
              <p className="text-xs text-muted">Signed-in email address</p>
            </div>
            <Suspense
              fallback={<p className="text-sm text-muted">Loading...</p>}
            >
              <UserEmail />
            </Suspense>
          </div>

          <div className="flex items-center justify-between gap-4 p-4">
            <div className="min-w-0">
              <h3 className="text-sm font-medium text-foreground">
                Appearance
              </h3>
              <p className="text-xs text-muted">
                Switch between light and dark theme
              </p>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </section>

      <form action={signOut} className="flex justify-center">
        <button
          type="submit"
          className="cursor-pointer rounded-lg bg-accent px-6 py-2.5 text-sm font-medium text-accent-foreground shadow-sm transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
        >
          Sign out
        </button>
      </form>
    </>
  );
}

async function UserEmail() {
  await connection();
  const { claims } = await requireAuthenticatedSession();
  const email =
    typeof claims.email === "string" && claims.email.trim()
      ? claims.email
      : null;

  return (
    <p className="min-w-0 truncate text-sm font-medium text-foreground sm:text-right">
      {email ?? "Not available"}
    </p>
  );
}
