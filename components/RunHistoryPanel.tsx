"use client";

import clsx from "clsx";
import { History, Trash2, ChevronRight } from "lucide-react";
import type { RunRecord } from "@/lib/persist";
import { FixedSizeList as List, type ListChildComponentProps } from "react-window";
import { getFlag } from "@/lib/flags";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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
  const useVirt = getFlag("virtualizeLists") && runs.length > 12;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 opacity-80" />
          <div className="text-sm font-semibold tracking-tight">Run history</div>
        </div>
        <Button
          size="sm"
          variant="danger"
          onClick={onClear}
          disabled={!runs.length}
          className={cn("h-8", !runs.length ? "opacity-50" : "")}
        >
          <Trash2 className="h-4 w-4" />
          Clear runs
        </Button>
      </div>

      {!runs.length ? (
        <div className="mt-3 text-sm opacity-70">No runs yet.</div>
      ) : (
        <div className="mt-3">
          {!useVirt ? (
            <div className="space-y-2">
              {runs.map((r) => (
                <RunRowInline key={r.id} r={r} onLoad={onLoad} onRemove={onRemove} />
              ))}
            </div>
          ) : (
            <div className="rounded-[calc(var(--ct-radius)-8px)] border border-white/10 bg-black/10">
              <List
                height={420}
                width={"100%"}
                itemCount={runs.length}
                itemSize={74}
                overscanCount={6}
                itemData={{ runs, onLoad, onRemove }}
              >
                {RunRow}
              </List>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function RunRowInline({
  r,
  onLoad,
  onRemove,
}: {
  r: RunRecord;
  onLoad: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className={clsx("ct-card-surface", "p-3", "flex items-center justify-between gap-3")}>
      <div className="min-w-0">
        <div className="text-xs opacity-70 truncate">{fmt(r.at)}</div>
        <div className="text-sm font-medium truncate">{r.summary || "Run"}</div>
        <div className="text-xs opacity-70 truncate">
          {r.urlsCount} URLs • {r.okCount} ok • {r.failCount} failed
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button size="sm" variant="secondary" className="h-8" onClick={() => onLoad(r.id)}>
          Load <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="danger"
          className="h-8 w-10 px-0"
          onClick={() => onRemove(r.id)}
          aria-label="Remove run"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function RunRow({ index, style, data }: ListChildComponentProps) {
  const { runs, onLoad, onRemove } = data as {
    runs: RunRecord[];
    onLoad: (id: string) => void;
    onRemove: (id: string) => void;
  };
  const r = runs[index];
  return (
    <div style={style as any} className="px-2 py-1">
      <RunRowInline r={r} onLoad={onLoad} onRemove={onRemove} />
    </div>
  );
}
