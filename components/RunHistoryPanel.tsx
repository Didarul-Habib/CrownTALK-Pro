"use client";

import clsx from "clsx";
import { History, Trash2, ChevronRight } from "lucide-react";
import type { RunRecord } from "@/lib/persist";

function fmt(ts: number) {
  try {
    return new Date(ts).toLocaleString(undefined, {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function RunHistoryPanel({
  runs,
  onLoad,
  onRemove,
  onClear,
}: {
  runs: RunRecord[];
  onLoad: (id: string) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}) {
  return (
    <div className={clsx("ct-card", "p-4")}> 
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 opacity-80" />
          <div className="text-sm font-semibold tracking-tight">Run history</div>
        </div>
        <button
          type="button"
          className={clsx("ct-btn ct-btn-xs ct-btn-danger", !runs.length ? "opacity-50 cursor-not-allowed" : "")}
          onClick={onClear}
          disabled={!runs.length}
        >
          <Trash2 className="h-4 w-4" />
          Clear runs
        </button>
      </div>

      {!runs.length ? (
        <div className="mt-3 text-sm opacity-70">No runs yet.</div>
      ) : (
        <div className="mt-3 space-y-2">
          {runs.slice(0, 12).map((r) => (
            <div
              key={r.id}
              className={clsx(
                "ct-card-surface",
                "p-3",
                "flex items-center justify-between gap-3"
              )}
            >
              <div className="min-w-0">
                <div className="text-xs opacity-70 truncate">{fmt(r.at)}</div>
                <div className="mt-0.5 text-sm font-semibold tracking-tight truncate">
                  {r.results.length} URLs • {r.okCount} ok • {r.failedCount} failed
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  className="ct-btn ct-btn-xs"
                  onClick={() => onLoad(r.id)}
                  title="Load this run"
                >
                  <ChevronRight className="h-4 w-4 opacity-80" />
                  Load
                </button>
                <button
                  type="button"
                  className="ct-btn ct-btn-xs ct-btn-danger"
                  onClick={() => onRemove(r.id)}
                  title="Remove this run"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
