"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import { deleteBpLog } from "@/actions/bp-logs";
import { BpStatusBadge } from "@/components/bp/bp-status-badge";
import { Modal } from "@/components/ui/modal";
import type { BpLog } from "@/types";

interface DeleteBpDialogProps {
  log: BpLog;
  onClose: () => void;
}

/** Confirmation dialog for deleting a single blood pressure log entry. */
export function DeleteBpDialog({ log, onClose }: DeleteBpDialogProps) {
  const [state, action, pending] = useActionState(deleteBpLog, undefined);
  const descriptionId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!state?.success) return;
    onClose();
  }, [state, onClose]);

  return (
    <Modal
      title="Delete record"
      onClose={onClose}
      role="alertdialog"
      describedBy={descriptionId}
      disableClose={pending}
      initialFocusRef={cancelRef}
    >
      <div className="flex flex-col gap-4">
        <p
          id={descriptionId}
          className="text-sm text-gray-600 dark:text-gray-300"
        >
          Are you sure you want to delete this record? This action cannot be
          undone.
        </p>

        <div className="flex items-center justify-between rounded-lg border p-3 text-sm">
          <div className="flex flex-col gap-1">
            <span className="font-medium">
              {log.systolic}/{log.diastolic} mmHg
              {log.pulse !== null ? ` · Pulse ${log.pulse}` : ""}
            </span>
            <time
              suppressHydrationWarning
              className="text-xs text-gray-500 dark:text-gray-400"
            >
              {new Date(log.measured_at).toLocaleString()}
            </time>
          </div>
          <BpStatusBadge systolic={log.systolic} diastolic={log.diastolic} />
        </div>

        {state?.error && (
          <p role="alert" className="text-sm text-red-600">
            {state.error}
          </p>
        )}

        <form action={action} className="flex gap-2">
          <input type="hidden" name="id" value={log.id} />
          <button
            ref={cancelRef}
            type="button"
            onClick={onClose}
            disabled={pending}
            className="flex-1 rounded-lg border px-4 py-3 text-base font-medium disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending}
            className="flex-1 rounded-lg bg-red-600 px-4 py-3 text-base font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {pending ? "Deleting..." : "Delete"}
          </button>
        </form>
      </div>
    </Modal>
  );
}
