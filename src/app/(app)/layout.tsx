import Link from "next/link";
import { Suspense } from "react";
import { AppNav, AppNavFallback } from "@/components/layout/app-nav";

/** Shared app shell with header, primary navigation, and disclaimer footer for authenticated routes. */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 pb-8 pt-6">
      <header className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold tracking-tight">
          <Link href="/dashboard" className="hover:opacity-90">
            Health Note
          </Link>
        </h1>

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
