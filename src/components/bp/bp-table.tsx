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

export function BpTable({ logs }: { logs: BpLogWithImageUrl[] }) {
  const router = useRouter();
  const [dialog, setDialog] = useState<ActiveDialog | null>(null);
  const closeDialog = useCallback(() => setDialog(null), []);
  const activeLog = dialog
    ? (logs.find((log) => log.id === dialog.logId) ?? null)
    : null;

  if (logs.length === 0) {
    return <p className="text-sm text-muted">No records yet.</p>;
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-muted">
              <th className="py-2 pr-3 font-medium">Date</th>
              <th className="py-2 pr-3 font-medium">BP</th>
              <th className="py-2 pr-3 font-medium">Pulse</th>
              <th className="py-2 pr-3 font-medium">Status</th>
              <th className="py-2 pr-3 font-medium">Image</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b border-border">
                <td className="py-2 pr-3">
                  <time suppressHydrationWarning>
                    {new Date(log.measured_at).toLocaleString()}
                  </time>
                </td>
                <td className="py-2 pr-3 font-medium">
                  {log.systolic}/{log.diastolic}
                </td>
                <td className="py-2 pr-3">{log.pulse ?? "-"}</td>
                <td className="py-2 pr-3">
                  <BpStatusBadge
                    systolic={log.systolic}
                    diastolic={log.diastolic}
                  />
                </td>
                <td className="py-2 pr-3">
                  {log.imageUrl ? (
                    <button
                      type="button"
                      onClick={() => setDialog({ type: "image", logId: log.id })}
                      aria-label={`View image for ${log.systolic}/${log.diastolic} reading`}
                      className="block cursor-pointer rounded border border-border transition hover:opacity-80"
                    >
                      <BpImage
                        src={log.imageUrl}
                        alt={`Blood pressure ${log.systolic}/${log.diastolic}`}
                        width={40}
                        height={40}
                        className="h-10 w-10 rounded object-cover"
                        fallback={
                          <span className="flex h-10 w-10 items-center justify-center text-[10px] text-muted">
                            View
                          </span>
                        }
                      />
                    </button>
                  ) : log.image ? (
                    <span className="text-xs text-muted">Unavailable</span>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="py-2">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setDialog({ type: "edit", logId: log.id })}
                      className="cursor-pointer text-primary-text underline hover:opacity-80"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setDialog({ type: "delete", logId: log.id })
                      }
                      className="cursor-pointer text-accent-text underline hover:opacity-80"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
            <div className="flex items-center justify-between text-xs text-muted">
              <span>
                {activeLog.systolic}/{activeLog.diastolic} mmHg
                {activeLog.pulse !== null ? ` · Pulse ${activeLog.pulse}` : ""}
              </span>
              <time suppressHydrationWarning>
                {new Date(activeLog.measured_at).toLocaleString()}
              </time>
            </div>
            <BpImage
              src={activeLog.imageUrl}
              alt={`Blood pressure ${activeLog.systolic}/${activeLog.diastolic}`}
              width={1280}
              height={1280}
              className="max-h-[65vh] w-full rounded-lg border border-border object-contain"
              fallback={
                <div className="flex flex-col items-center gap-3 rounded-lg border border-border p-6 text-center text-sm text-muted">
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
                      className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-subtle"
                    >
                      Open / Download
                    </a>
                    <button
                      type="button"
                      onClick={() => router.refresh()}
                      className="cursor-pointer rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-subtle"
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
              className="cursor-pointer rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-subtle"
            >
              Close
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
