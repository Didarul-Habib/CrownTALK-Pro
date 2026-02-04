"use client";

import clsx from "clsx";
import { Clock3, Play, X as CloseIcon } from "lucide-react";
import type { RunRecord } from "@/lib/persist";

function formatTime(ts: number) {
  try {
    const d = new Date(ts);
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function ResumeBanner({
  record,
  onResume,
  onDismiss,
}: {
  record: RunRecord;
  onResume: () => void;
  onDismiss: () => void;
}) {
  return (
    <div
      className={clsx(
        "ct-card",
        "p-4",
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="ct-chip">
          <Clock3 className="h-4 w-4 opacity-80" />
          <span className="text-xs opacity-85">Resume last run</span>
        </div>
        <div>
          <div className="text-sm font-semibold tracking-tight">From recently</div>
          <div className="mt-0.5 text-xs opacity-70">
            {formatTime(record.at)} • {record.results.length} URLs • {record.okCount} ok • {record.failedCount} failed
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 justify-end">
        <button type="button" className="ct-btn ct-btn-sm" onClick={onDismiss}>
          <CloseIcon className="h-4 w-4 opacity-80" />
          Dismiss
        </button>
        <button type="button" className="ct-btn ct-btn-primary ct-btn-sm" onClick={onResume}>
          <Play className="h-4 w-4 opacity-90" />
          Resume
        </button>
      </div>
    </div>
  );
}
