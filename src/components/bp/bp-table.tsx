"use client";

import { useCallback, useEffect, useState } from "react";
import { deleteBpLog } from "@/actions/bp-logs";
import { BpForm } from "@/components/bp/bp-form";
import { BpStatusBadge } from "@/components/bp/bp-status-badge";
import type { BpLog } from "@/types";

export function BpTable({ logs }: { logs: BpLog[] }) {
  const [editingLog, setEditingLog] = useState<BpLog | null>(null);
  const closeEdit = useCallback(() => setEditingLog(null), []);

  useEffect(() => {
    if (!editingLog) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setEditingLog(null);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editingLog]);

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
                      onClick={() => setEditingLog(log)}
                      className="text-blue-600 underline"
                    >
                      Edit
                    </button>
                    <form action={deleteBpLog}>
                      <input type="hidden" name="id" value={log.id} />
                      <button type="submit" className="text-red-600 underline">
                        Delete
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingLog && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-bp-title"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeEdit();
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div className="w-full max-w-md rounded-lg border bg-background p-4 text-foreground shadow-lg">
            <div className="mb-3 flex items-center justify-between">
              <h3 id="edit-bp-title" className="text-lg font-semibold">
                Edit record
              </h3>
              <button
                type="button"
                onClick={closeEdit}
                aria-label="Close"
                className="rounded px-2 py-1 text-sm text-gray-500 hover:bg-gray-100"
              >
                Close
              </button>
            </div>
            <BpForm
              key={editingLog.id}
              initialLog={editingLog}
              onSuccess={closeEdit}
              onCancel={closeEdit}
            />
          </div>
        </div>
      )}
    </>
  );
}
