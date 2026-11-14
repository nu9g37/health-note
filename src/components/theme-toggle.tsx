"use client";

import { useId, useLayoutEffect, useSyncExternalStore } from "react";
import { THEME_STORAGE_KEY, type Theme } from "@/lib/theme";

const THEME_CHANGE_EVENT = "health-note:theme-change";
let memoryTheme: Theme | null = null;

function getSystemTheme(): Theme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function getStoredTheme(): Theme | null {
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return value === "dark" || value === "light" ? value : null;
  } catch {
    return null;
  }
}

function resolveTheme(): Theme {
  return getStoredTheme() ?? memoryTheme ?? getSystemTheme();
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

function subscribe(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};

  const handleStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === THEME_STORAGE_KEY) {
      memoryTheme = null;
      applyTheme(resolveTheme());
      onStoreChange();
    }
  };

  const mediaQuery = window.matchMedia?.("(prefers-color-scheme: dark)");
  const handleMediaChange = () => {
    if (!getStoredTheme() && !memoryTheme) {
      applyTheme(getSystemTheme());
      onStoreChange();
    }
  };

  window.addEventListener(THEME_CHANGE_EVENT, onStoreChange);
  window.addEventListener("storage", handleStorage);
  mediaQuery?.addEventListener("change", handleMediaChange);

  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, onStoreChange);
    window.removeEventListener("storage", handleStorage);
    mediaQuery?.removeEventListener("change", handleMediaChange);
  };
}

function getSnapshot(): Theme {
  return resolveTheme();
}

function getServerSnapshot(): null {
  return null;
}

/** Top-right Dark Mode toggle control synced with localStorage and system preference. */
export function ThemeToggle() {
  const toggleId = useId();
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Re-apply after React Strict Mode clears unmanaged <html> attributes in dev.
  useLayoutEffect(() => {
    applyTheme(resolveTheme());
  }, []);

  const isReady = theme !== null;
  const isDark = theme === "dark";

  function handleToggle() {
    const next: Theme = resolveTheme() === "dark" ? "light" : "dark";
    memoryTheme = next;
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage may be unavailable in private browsing or restricted contexts.
    }
    applyTheme(next);
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }

  return (
    <div className="inline-flex items-center gap-2">
      <label
        htmlFor={toggleId}
        className="cursor-pointer select-none text-sm font-medium text-foreground"
      >
        Dark Mode
      </label>
      <button
        id={toggleId}
        type="button"
        aria-pressed={isReady ? isDark : undefined}
        onClick={handleToggle}
        className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-border bg-surface-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 dark:border-primary dark:bg-primary"
      >
        <span
          aria-hidden="true"
          className="inline-block h-4 w-4 translate-x-[3px] rounded-full bg-surface shadow-sm transition-transform duration-150 dark:translate-x-[23px] dark:bg-primary-foreground"
        />
      </button>
    </div>
  );
}
