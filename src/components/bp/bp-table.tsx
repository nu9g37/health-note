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
    return <p className="text-sm text-gray-500">No records yet.</p>;
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b">
              <th className="py-2 pr-3">Date</th>
              <th className="py-2 pr-3">BP</th>
              <th className="py-2 pr-3">Pulse</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2 pr-3">Image</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b">
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
                      className="block rounded border transition hover:opacity-80"
                    >
                      <BpImage
                        src={log.imageUrl}
                        alt={`Blood pressure ${log.systolic}/${log.diastolic}`}
                        width={40}
                        height={40}
                        className="h-10 w-10 rounded object-cover"
                        fallback={
                          <span className="flex h-10 w-10 items-center justify-center text-[10px] text-gray-500">
                            View
                          </span>
                        }
                      />
                    </button>
                  ) : log.image ? (
                    <span className="text-xs text-gray-400">Unavailable</span>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="py-2">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setDialog({ type: "edit", logId: log.id })}
                      className="text-blue-600 underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setDialog({ type: "delete", logId: log.id })
                      }
                      className="text-red-600 underline"
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
            <div className="flex items-center justify-between text-xs text-gray-500">
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
              className="max-h-[65vh] w-full rounded-lg border object-contain"
              fallback={
                <div className="flex flex-col items-center gap-3 rounded-lg border p-6 text-center text-sm text-gray-500">
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
                      className="rounded-lg border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      Open / Download
                    </a>
                    <button
                      type="button"
                      onClick={() => router.refresh()}
                      className="rounded-lg border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-gray-50 dark:hover:bg-gray-800"
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
              className="rounded-lg border px-4 py-2 text-sm font-medium"
            >
              Close
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
