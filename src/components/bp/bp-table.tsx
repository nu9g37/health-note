"use client";

import { deleteBpLog } from "@/actions/bp-logs";
import { BpStatusBadge } from "@/components/bp/bp-status-badge";
import type { BpLog } from "@/types";

export function BpTable({ logs }: { logs: BpLog[] }) {
  if (logs.length === 0) {
    return <p className="text-sm text-gray-500">No records yet.</p>;
  }

  return (
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
                <form action={deleteBpLog}>
                  <input type="hidden" name="id" value={log.id} />
                  <button className="text-red-600 underline">Delete</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
