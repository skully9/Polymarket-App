"use client";

import { ActivityLogEntry } from "../../lib/types";

interface Props {
  entries: ActivityLogEntry[];
}

export default function ActivityLog({ entries }: Props) {
  return (
    <div className="card space-y-3">
      <h3 className="font-semibold">Activity log</h3>
      <div className="max-h-64 overflow-y-auto text-sm space-y-2">
        {entries.length === 0 && <div className="text-slate-500">No activity yet</div>}
        {entries.map((log) => (
          <div key={log.id} className="border border-slate-800 rounded p-2">
            <div className="text-xs text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</div>
            <div className="font-semibold text-slate-100">{log.title}</div>
            <div className="text-slate-200">{log.message}</div>
            {log.pnlImpact !== undefined && (
              <div className={log.pnlImpact >= 0 ? "text-green-300" : "text-red-300"}>
                PnL impact: {log.pnlImpact.toFixed(2)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
