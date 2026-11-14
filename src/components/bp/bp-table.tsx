"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { BpForm } from "@/components/bp/bp-form";
import { BpImage } from "@/components/bp/bp-image";
import { BpStatusBadge } from "@/components/bp/bp-status-badge";
import { DeleteBpDialog } from "@/components/bp/delete-bp-dialog";
import { Modal } from "@/components/ui/modal";
import type { BpLogWithImageUrl } from "@/types";

type ActiveDialog =
  | { type: "edit"; logId: string }
  | { type: "delete"; logId: string }
  | { type: "image"; logId: string };

const FOCUS_RING_CLASS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50";

function parseMeasuredDate(iso: string): Date | null {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatMeasuredDate(iso: string): string {
  const date = parseMeasuredDate(iso);
  if (!date) return iso;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatMeasuredTime(iso: string): string {
  const date = parseMeasuredDate(iso);
  if (!date) return "";
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatMeasuredDateTime(iso: string): string {
  const date = parseMeasuredDate(iso);
  if (!date) return iso;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function PulseIcon({ className = "h-5 w-5 text-muted" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      className={`shrink-0 ${className}`}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.5 10.5h3l2-5 3.25 9 2.25-4h4.5"
      />
    </svg>
  );
}

function PhotoIcon({ className = "h-4 w-4 text-muted" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      className={`shrink-0 ${className}`}
    >
      <rect x="3" y="4" width="14" height="12" rx="2" />
      <circle cx="7.5" cy="8.25" r="1.25" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m5 14 3.5-3.5 2.5 2.5 2-2 3 3"
      />
    </svg>
  );
}

function LogImageButton({
  log,
  onOpenImage,
}: {
  log: BpLogWithImageUrl;
  onOpenImage: (logId: string) => void;
}) {
  if (!log.imageUrl) return null;

  return (
    <button
      type="button"
      onClick={() => onOpenImage(log.id)}
      aria-label={`View image for ${log.systolic}/${log.diastolic} reading`}
      className={`block shrink-0 cursor-pointer overflow-hidden rounded-lg border border-border bg-background transition-opacity hover:opacity-85 ${FOCUS_RING_CLASS}`}
    >
      <BpImage
        src={log.imageUrl}
        alt={`Blood pressure ${log.systolic}/${log.diastolic}`}
        width={40}
        height={40}
        className="h-10 w-10 object-cover"
        fallback={
          <span className="flex h-10 w-10 items-center justify-center bg-surface-subtle">
            <PhotoIcon />
          </span>
        }
      />
    </button>
  );
}

function LogRowActions({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="inline-flex items-center justify-end gap-1.5">
      <button
        type="button"
        onClick={onEdit}
        className={`cursor-pointer rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-subtle ${FOCUS_RING_CLASS}`}
      >
        Edit
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="cursor-pointer rounded-lg border border-accent/40 bg-background px-2.5 py-1.5 text-xs font-medium text-accent-text transition-colors hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
      >
        Delete
      </button>
    </div>
  );
}

export function BpTable({
  logs,
  emptyMessage = "No records yet.",
}: {
  logs: BpLogWithImageUrl[];
  emptyMessage?: string;
}) {
  const router = useRouter();
  const [dialog, setDialog] = useState<ActiveDialog | null>(null);
  const closeDialog = useCallback(() => setDialog(null), []);
  const openEdit = useCallback(
    (logId: string) => setDialog({ type: "edit", logId }),
    [],
  );
  const openDelete = useCallback(
    (logId: string) => setDialog({ type: "delete", logId }),
    [],
  );
  const openImage = useCallback(
    (logId: string) => setDialog({ type: "image", logId }),
    [],
  );
  const activeLog = dialog
    ? (logs.find((log) => log.id === dialog.logId) ?? null)
    : null;

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-8 text-center shadow-sm">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background">
          <PulseIcon />
        </span>
        <p className="text-sm text-muted">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
        <ul className="divide-y divide-border sm:hidden">
          {logs.map((log) => (
            <li key={log.id} className="flex flex-col gap-2.5 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <LogImageButton log={log} onOpenImage={openImage} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                      <span className="text-base font-semibold tabular-nums text-foreground">
                        {log.systolic}/{log.diastolic}
                      </span>
                      <span className="text-xs font-medium text-muted">
                        mmHg
                      </span>
                    </div>
                    {(log.pulse !== null || (!log.imageUrl && log.image)) && (
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted">
                        {log.pulse !== null && (
                          <span className="tabular-nums">
                            Pulse {log.pulse} bpm
                          </span>
                        )}
                        {log.pulse !== null && !log.imageUrl && log.image && (
                          <span aria-hidden="true">&middot;</span>
                        )}
                        {!log.imageUrl && log.image && (
                          <span>Image unavailable</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>

                <div className="shrink-0">
                  <BpStatusBadge
                    systolic={log.systolic}
                    diastolic={log.diastolic}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <time
                  dateTime={log.measured_at}
                  suppressHydrationWarning
                  className="text-xs text-muted"
                >
                  {formatMeasuredDateTime(log.measured_at)}
                </time>
                <LogRowActions
                  onEdit={() => openEdit(log.id)}
                  onDelete={() => openDelete(log.id)}
                />
              </div>
            </li>
          ))}
        </ul>

        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-subtle/50 text-xs font-semibold uppercase tracking-wide text-muted">
                <th scope="col" className="py-2.5 pl-4 pr-2">
                  Date
                </th>
                <th scope="col" className="px-2 py-2.5">
                  BP
                </th>
                <th scope="col" className="px-2 py-2.5">
                  Pulse
                </th>
                <th scope="col" className="px-2 py-2.5">
                  Status
                </th>
                <th scope="col" className="px-2 py-2.5">
                  Image
                </th>
                <th scope="col" className="py-2.5 pl-2 pr-4 text-right">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.map((log) => (
                <tr
                  key={log.id}
                  className="transition-colors hover:bg-surface-subtle/40"
                >
                  <td className="py-3 pl-4 pr-2 align-middle">
                    <time
                      dateTime={log.measured_at}
                      suppressHydrationWarning
                      className="block whitespace-nowrap text-xs font-medium text-foreground"
                    >
                      {formatMeasuredDate(log.measured_at)}
                    </time>
                    <time
                      dateTime={log.measured_at}
                      suppressHydrationWarning
                      className="block whitespace-nowrap text-[11px] tabular-nums text-muted"
                    >
                      {formatMeasuredTime(log.measured_at)}
                    </time>
                  </td>
                  <td className="px-2 py-3 align-middle whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold tabular-nums text-foreground">
                        {log.systolic}/{log.diastolic}
                      </span>
                      <span className="text-[11px] font-medium text-muted">
                        mmHg
                      </span>
                    </div>
                  </td>
                  <td className="px-2 py-3 align-middle whitespace-nowrap">
                    {log.pulse !== null ? (
                      <div className="flex flex-col">
                        <span className="text-sm font-medium tabular-nums text-foreground">
                          {log.pulse}
                        </span>
                        <span className="text-[11px] font-medium text-muted">
                          bpm
                        </span>
                      </div>
                    ) : (
                      <span
                        className="text-sm text-muted"
                        aria-label="Not recorded"
                      >
                        &mdash;
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-3 align-middle">
                    <BpStatusBadge
                      systolic={log.systolic}
                      diastolic={log.diastolic}
                    />
                  </td>
                  <td className="px-2 py-3 align-middle">
                    {log.imageUrl ? (
                      <LogImageButton log={log} onOpenImage={openImage} />
                    ) : log.image ? (
                      <span className="text-xs text-muted">Unavailable</span>
                    ) : (
                      <span
                        className="text-sm text-muted"
                        aria-label="No image"
                      >
                        &mdash;
                      </span>
                    )}
                  </td>
                  <td className="py-3 pl-2 pr-4 text-right align-middle">
                    <LogRowActions
                      onEdit={() => openEdit(log.id)}
                      onDelete={() => openDelete(log.id)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {dialog?.type === "edit" && activeLog && (
        <Modal title="Edit record" onClose={closeDialog}>
          <BpForm
            key={activeLog.id}
            initialLog={activeLog}
            onSuccess={closeDialog}
            onCancel={closeDialog}
          />
        </Modal>
      )}

      {dialog?.type === "delete" && activeLog && (
        <DeleteBpDialog
          key={activeLog.id}
          log={activeLog}
          onClose={closeDialog}
        />
      )}

      {dialog?.type === "image" && activeLog?.imageUrl && (
        <Modal title="Blood pressure image" onClose={closeDialog}>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background p-3 text-sm">
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="font-semibold tabular-nums text-foreground">
                  {activeLog.systolic}/{activeLog.diastolic} mmHg
                  {activeLog.pulse !== null ? (
                    <span className="font-normal text-muted">
                      {" "}
                      &middot; Pulse {activeLog.pulse} bpm
                    </span>
                  ) : null}
                </span>
                <time
                  dateTime={activeLog.measured_at}
                  suppressHydrationWarning
                  className="text-xs text-muted"
                >
                  {formatMeasuredDateTime(activeLog.measured_at)}
                </time>
              </div>
              <BpStatusBadge
                systolic={activeLog.systolic}
                diastolic={activeLog.diastolic}
              />
            </div>

            <BpImage
              src={activeLog.imageUrl}
              alt={`Blood pressure ${activeLog.systolic}/${activeLog.diastolic}`}
              width={1280}
              height={1280}
              className="max-h-[65vh] w-full rounded-lg border border-border bg-background object-contain"
              fallback={
                <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-background p-6 text-center text-sm text-muted">
                  <p>
                    Unable to preview this image in the browser (the format may
                    not be supported, or the temporary link may have expired).
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <a
                      href={activeLog.imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                      className={`rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-subtle ${FOCUS_RING_CLASS}`}
                    >
                      Open / Download
                    </a>
                    <button
                      type="button"
                      onClick={() => router.refresh()}
                      className={`cursor-pointer rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-subtle ${FOCUS_RING_CLASS}`}
                    >
                      Refresh link
                    </button>
                  </div>
                </div>
              }
            />
            <button
              type="button"
              onClick={closeDialog}
              className={`cursor-pointer rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-subtle ${FOCUS_RING_CLASS}`}
            >
              Close
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
