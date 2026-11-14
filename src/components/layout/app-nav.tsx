"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface AppNavItem {
  href: string;
  label: string;
}

export const APP_NAV_ITEMS: readonly AppNavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/history", label: "History" },
  { href: "/trends", label: "Trends" },
  { href: "/settings", label: "Settings" },
];

function NavLinkList({ pathname }: { pathname: string | null }) {
  return (
    <nav
      aria-label="Primary"
      className="grid grid-flow-col auto-cols-fr gap-1 rounded-xl border border-border bg-surface-subtle p-1"
    >
      {APP_NAV_ITEMS.map((item) => {
        const isActive =
          pathname !== null &&
          (pathname === item.href || pathname.startsWith(`${item.href}/`));

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={`min-w-0 truncate rounded-lg px-1.5 py-2.5 text-center text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 sm:px-3 sm:py-2 sm:text-sm ${
              isActive
                ? "bg-surface text-foreground shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Primary tab navigation for authenticated app routes. */
export function AppNav() {
  const pathname = usePathname();
  return <NavLinkList pathname={pathname} />;
}

/** Static fallback matching AppNav dimensions while pathname resolves. */
export function AppNavFallback() {
  return <NavLinkList pathname={null} />;
}
