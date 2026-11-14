"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import { deleteBpLog } from "@/actions/bp-logs";
import { BpImage } from "@/components/bp/bp-image";
import { BpStatusBadge } from "@/components/bp/bp-status-badge";
import { Modal } from "@/components/ui/modal";
import type { BpLogWithImageUrl } from "@/types";

interface DeleteBpDialogProps {
  log: BpLogWithImageUrl;
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
        <p id={descriptionId} className="text-sm text-muted">
          Are you sure you want to delete this record? This action cannot be
          undone.
        </p>

        <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background p-3 text-sm">
          <div className="flex items-center gap-3">
            {log.imageUrl && (
              <BpImage
                src={log.imageUrl}
                alt={`Blood pressure ${log.systolic}/${log.diastolic}`}
                width={48}
                height={48}
                className="h-12 w-12 shrink-0 rounded border border-border object-cover"
              />
            )}
            <div className="flex flex-col gap-1">
              <span className="font-medium">
                {log.systolic}/{log.diastolic} mmHg
                {log.pulse !== null ? ` · Pulse ${log.pulse}` : ""}
              </span>
              <time suppressHydrationWarning className="text-xs text-muted">
                {new Date(log.measured_at).toLocaleString()}
              </time>
            </div>
          </div>
          <BpStatusBadge systolic={log.systolic} diastolic={log.diastolic} />
        </div>

        {state?.error && (
          <p role="alert" className="text-sm text-accent-text">
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
            className="flex-1 cursor-pointer rounded-lg border border-border bg-surface px-4 py-3 text-base font-medium text-foreground transition-colors hover:bg-surface-subtle disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending}
            className="flex-1 cursor-pointer rounded-lg bg-accent px-4 py-3 text-base font-medium text-accent-foreground transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {pending ? "Deleting..." : "Delete"}
          </button>
        </form>
      </div>
    </Modal>
  );
}
