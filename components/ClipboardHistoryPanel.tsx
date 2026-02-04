"use client";

import clsx from "clsx";
import { Clipboard, Copy, Trash2 } from "lucide-react";
import type { ClipboardRecord } from "@/lib/persist";

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
  return (
    <div className={clsx("ct-card", "p-4")}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Clipboard className="h-4 w-4 opacity-80" />
          <div className="text-sm font-semibold tracking-tight">Clipboard history</div>
        </div>
        <button
          type="button"
          className={clsx("ct-btn ct-btn-xs ct-btn-danger", !items.length ? "opacity-50 cursor-not-allowed" : "")}
          onClick={onClear}
          disabled={!items.length}
        >
          <Trash2 className="h-4 w-4" />
          Clear
        </button>
      </div>

      {!items.length ? (
        <div className="mt-3 text-sm opacity-70">Copied comments will show up here.</div>
      ) : (
        <div className="mt-3 space-y-2">
          {items.slice(0, 12).map((c) => (
            <div key={c.id} className={clsx("ct-card-surface", "p-3")}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs opacity-70">{fmt(c.at)}</div>
                  {c.url ? (
                    <div className="mt-0.5 text-[11px] opacity-70 break-all">{c.url}</div>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="ct-btn ct-btn-xs"
                  onClick={() => copyText(c.text)}
                  title="Copy again"
                >
                  <Copy className="h-4 w-4 opacity-80" />
                  Copy
                </button>
              </div>

              <div className="mt-2 text-sm leading-6 whitespace-pre-wrap break-words">
                {c.text}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
