"use client";

import {
  useEffect,
  useId,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "[href]",
  'input:not([disabled]):not([type="hidden"])',
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"]):not([disabled])',
].join(", ");

function trapTabFocus(container: HTMLElement, event: KeyboardEvent) {
  const focusable = Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  );
  if (focusable.length === 0) {
    event.preventDefault();
    return;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement;

  if (event.shiftKey) {
    if (active === first || active === container) {
      event.preventDefault();
      last.focus();
    }
  } else if (active === last) {
    event.preventDefault();
    first.focus();
  }
}

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  role?: "dialog" | "alertdialog";
  describedBy?: string;
  disableClose?: boolean;
  initialFocusRef?: RefObject<HTMLElement | null>;
}

/** Accessible modal overlay that traps Tab focus and closes on Escape or backdrop click unless disabled. */
export function Modal({
  title,
  onClose,
  children,
  role = "dialog",
  describedBy,
  disableClose = false,
  initialFocusRef,
}: ModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const target = initialFocusRef?.current ?? panelRef.current;
    target?.focus();

    return () => {
      if (previousFocus?.isConnected) {
        previousFocus.focus();
      }
    };
  }, [initialFocusRef]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !disableClose) {
        onClose();
        return;
      }
      if (event.key === "Tab" && panelRef.current) {
        trapTabFocus(panelRef.current, event);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [disableClose, onClose]);

  return (
    <div
      role={role}
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={describedBy}
      onClick={(event) => {
        if (event.target === event.currentTarget && !disableClose) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-lg border bg-background p-4 text-foreground shadow-lg outline-none"
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 id={titleId} className="text-lg font-semibold">
            {title}
          </h3>
          {/* <button
            type="button"
            onClick={onClose}
            disabled={disableClose}
            aria-label="Close"
            className="rounded px-2 py-1 text-sm text-gray-500 hover:bg-gray-100 disabled:opacity-50 dark:hover:bg-gray-800"
          >
            Close
          </button> */}
        </div>
        {children}
      </div>
    </div>
  );
}
