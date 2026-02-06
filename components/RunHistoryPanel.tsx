"use client";

import clsx from "clsx";
import { useMemo, useState } from "react";
import { History, Trash2, ChevronRight } from "lucide-react";
import { FixedSizeList as List } from "react-window";
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
  onShare,
  onClear,
}: {
  runs: RunRecord[];
  onLoad: (id: string) => void;
  onRemove: (id: string) => void;
  onShare?: (id: string) => void;
  onClear: () => void;
}) {
  const rowHeight = 88;
  const listHeight = 420;
  const [modeFilter, setModeFilter] = useState<"all" | "urls" | "source">("all");

  const filteredRuns = useMemo(() => {
    if (modeFilter === "all") return runs;
    return runs.filter((r) => (r.mode || r.request?.mode || "urls") === modeFilter);
  }, [runs, modeFilter]);

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
        
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" className={clsx("ct-btn ct-btn-xs", modeFilter === "all" ? "ct-btn-primary" : "")} onClick={() => setModeFilter("all")}>
          All
        </button>
        <button type="button" className={clsx("ct-btn ct-btn-xs", modeFilter === "urls" ? "ct-btn-primary" : "")} onClick={() => setModeFilter("urls")}>
          URLs
        </button>
        <button type="button" className={clsx("ct-btn ct-btn-xs", modeFilter === "source" ? "ct-btn-primary" : "")} onClick={() => setModeFilter("source")}>
          Source
        </button>
      </div>
</button>
      </div>

      {!filteredRuns.length ? (
        <div className="mt-3 text-sm opacity-70">No runs yet.</div>
      ) : (
        <div className="mt-3">
          <List
            height={listHeight}
            itemCount={filteredRuns.length}
            itemSize={rowHeight}
            width={"100%"}
            overscanCount={3}
          >
            {({ index, style }) => {
              const r = filteredRuns[index];
              return (
                <div style={style} className="px-1 py-1">
                  <div
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
                      {onShare ? (
                        <button type="button" className="ct-btn ct-btn-xs" onClick={() => onShare(r.id)} title="Share run">
                          Share
                        </button>
                      ) : null}
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
                </div>
              );
            }}
          </List>
        </div>
      )}
    </div>
  );
}
