"use client";

import clsx from "clsx";
import { Clipboard, Copy, Trash2 } from "lucide-react";
import type { ClipboardRecord } from "@/lib/persist";
import { FixedSizeList as List, type ListChildComponentProps } from "react-window";
import { getFlag } from "@/lib/flags";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
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

function copyText(text: string) {
  navigator.clipboard.writeText(text).catch(() => {});
}

export default function ClipboardHistoryPanel({
  items,
  onClear,
}: {
  items: ClipboardRecord[];
  onClear: () => void;
}) {
  const useVirt = getFlag("virtualizeLists") && items.length > 12;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Clipboard className="h-4 w-4 opacity-80" />
          <div className="text-sm font-semibold tracking-tight">Clipboard history</div>
        </div>
        <Button
          size="sm"
          variant="danger"
          onClick={onClear}
          disabled={!items.length}
          className={cn("h-8", !items.length ? "opacity-50" : "")}
        >
          <Trash2 className="h-4 w-4" />
          Clear
        </Button>
      </div>

      {!items.length ? (
        <div className="mt-3 text-sm opacity-70">No copies yet.</div>
      ) : (
        <div className="mt-3">
          {!useVirt ? (
            <div className="space-y-2">
              {items.slice(0, 20).map((r) => (
                <ClipRowInline key={r.id} r={r} />
              ))}
            </div>
          ) : (
            <div className="rounded-[calc(var(--ct-radius)-8px)] border border-white/10 bg-black/10">
              <List height={420} width={"100%"} itemCount={items.length} itemSize={74} overscanCount={6} itemData={{ items }}>
                {ClipRow}
              </List>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function ClipRowInline({ r }: { r: ClipboardRecord }) {
  return (
    <div className={clsx("ct-card-surface", "p-3", "flex items-center justify-between gap-3")}>
      <div className="min-w-0">
        <div className="text-xs opacity-70 truncate">{fmt(r.at)}</div>
        <div className="text-sm font-medium truncate">{r.label || "Copied text"}</div>
        <div className="text-xs opacity-70 truncate">{(r.text || "").slice(0, 80)}</div>
      </div>

      <Button
        size="sm"
        variant="secondary"
        className="h-8"
        onClick={() => {
          copyText(r.text || "");
          try {
            if (navigator.vibrate) navigator.vibrate(20);
          } catch {}
          toast.success("Copied");
        }}
      >
        <Copy className="h-4 w-4" /> Copy
      </Button>
    </div>
  );
}

function ClipRow({ index, style, data }: ListChildComponentProps) {
  const { items } = data as { items: ClipboardRecord[] };
  const r = items[index];
  return (
    <div style={style as any} className="px-2 py-1">
      <ClipRowInline r={r} />
    </div>
  );
}
