"use client";

import { useCallback, useState } from "react";
import { BpForm } from "@/components/bp/bp-form";
import { BpStatusBadge } from "@/components/bp/bp-status-badge";
import { DeleteBpDialog } from "@/components/bp/delete-bp-dialog";
import { Modal } from "@/components/ui/modal";
import type { BpLog } from "@/types";

type ActiveDialog =
  | { type: "edit"; log: BpLog }
  | { type: "delete"; log: BpLog };

export function BpTable({ logs }: { logs: BpLog[] }) {
  const [dialog, setDialog] = useState<ActiveDialog | null>(null);
  const closeDialog = useCallback(() => setDialog(null), []);

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
                <td className="py-2">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setDialog({ type: "edit", log })}
                      className="text-blue-600 underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setDialog({ type: "delete", log })}
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

      {dialog?.type === "edit" && (
        <Modal title="Edit record" onClose={closeDialog}>
          <BpForm
            key={dialog.log.id}
            initialLog={dialog.log}
            onSuccess={closeDialog}
            onCancel={closeDialog}
          />
        </Modal>
      )}

      {dialog?.type === "delete" && (
        <DeleteBpDialog
          key={dialog.log.id}
          log={dialog.log}
          onClose={closeDialog}
        />
      )}
    </>
  );
}
