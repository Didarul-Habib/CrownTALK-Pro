"use client";

import clsx from "clsx";
import { useState } from "react";
import { Clipboard, Copy, Trash2, Pin, PinOff, Download, Search, ChevronDown, ChevronUp } from "lucide-react";
import { FixedSizeList as List } from "react-window";
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
  onTogglePin,
}: {
  items: ClipboardRecord[];
  onClear: () => void;
  onTogglePin: (id: string) => void;
}) {
  const [q, setQ] = useState("");
    // Start collapsed by default; user can expand manually.
  const [expanded, setExpanded] = useState(false);

  function downloadFile(filename: string, content: string, type: string) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const filtered = items.filter((c) => {
    const s = (c.text + " " + (c.url || "")).toLowerCase();
    return !q.trim() || s.includes(q.trim().toLowerCase());
  });

  const pinned = filtered.filter((c) => c.pinned);
  const unpinned = filtered.filter((c) => !c.pinned);

  const rowHeight = 140;
  const listHeight = 420;

  return (
    <div className={clsx("ct-card", "p-4")}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Clipboard className="h-4 w-4 opacity-80" />
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="group flex items-center gap-1 text-sm font-semibold tracking-tight"
            aria-label={expanded ? "Collapse clipboard history" : "Expand clipboard history"}
          >
            <span>Clipboard history</span>
            {expanded ? (
              <ChevronUp className="h-3 w-3 opacity-80 group-hover:opacity-100" />
            ) : (
              <ChevronDown className="h-3 w-3 opacity-80 group-hover:opacity-100" />
            )}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={clsx("ct-btn ct-btn-xs min-w-[4.5rem] justify-center", !items.length ? "opacity-50 cursor-not-allowed" : "")}
            onClick={() => downloadFile("crowntalk-clipboard.json", JSON.stringify(items, null, 2), "application/json")}
            disabled={!items.length}
            title="Export JSON"
          >
            <Download className="h-4 w-4" />
            JSON
          </button>
          <button
            type="button"
            className={clsx("ct-btn ct-btn-xs min-w-[4.5rem] justify-center", !items.length ? "opacity-50 cursor-not-allowed" : "")}
            onClick={() => {
              const blocks = items.map((c) => {
                const t = fmt(c.at);
                const u = c.url || "";
                const body = (c.text || "").trim();
                return `${t}\n${u}\n${body}`;
              });
              downloadFile("crowntalk-clipboard.txt", blocks.join("\n\n---\n\n"), "text/plain;charset=utf-8");
            }}
            disabled={!items.length}
            title="Export TXT"
          >
            <Download className="h-4 w-4" />
            TXT
          </button>
          <button
            type="button"
            className={clsx("ct-btn ct-btn-xs min-w-[4.5rem] justify-center", !items.length ? "opacity-50 cursor-not-allowed" : "")}
            onClick={() => {
              const header = "time,url,text";
              const rows = items.map((c) => {
                const t = new Date(c.at).toISOString();
                const u = (c.url || "").replace(/\"/g, '""');
                const txt = (c.text || "").replace(/\"/g, '""').replace(/\n/g, " ");
                return `"${t}","${u}","${txt}"`;
              });
              downloadFile("crowntalk-clipboard.csv", [header, ...rows].join("\n"), "text/csv;charset=utf-8");
            }}
            disabled={!items.length}
            title="Export CSV"
          >
            <Download className="h-4 w-4" />
            CSV
          </button>
          <button
            type="button"
            className={clsx("ct-btn ct-btn-xs ct-btn-danger min-w-[4.5rem] justify-center", !items.length ? "opacity-50 cursor-not-allowed" : "")}
            onClick={onClear}
            disabled={!items.length}
            title="Clear clipboard history"
          >
            <Trash2 className="h-4 w-4" />
            Clear
          </button>
        </div>
      </div>

      {expanded && (
        <>
          <div className="mt-3 flex items-center gap-2 rounded-2xl border border-[color:var(--ct-border)] bg-white/5 px-3 py-2">
            <Search className="h-4 w-4 opacity-70" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search copied replies…"
              className="w-full bg-transparent text-sm outline-none placeholder:opacity-60"
              aria-label="Search clipboard history"
            />
          </div>

          {!filtered.length ? (
            <div className="mt-3 text-sm opacity-70">Copied comments will show up here.</div>
          ) : (
            <div className="mt-3">
              <List
                height={listHeight}
                itemCount={pinned.length + unpinned.length}
                itemSize={rowHeight}
                width={"100%"}
                overscanCount={3}
              >
                {({ index, style }) => {
                  const c = index < pinned.length ? pinned[index] : unpinned[index - pinned.length];
                  return (
                    <div style={style} className="px-1 py-1">
                      <div className={clsx("ct-card-surface", "p-3")}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="text-[11px] font-mono opacity-60">{fmt(c.at)}</div>
                            {c.url ? (
                              <div className="mt-1 truncate text-xs text-[color:var(--ct-accent)]">
                                {c.url}
                              </div>
                            ) : null}
                          </div>
                          <div className="flex flex-wrap items-center gap-1">
                            <button
                              type="button"
                              className="ct-btn ct-btn-xs"
                              onClick={() => onTogglePin(c.id)}
                              title={c.pinned ? "Unpin" : "Pin"}
                              aria-label={c.pinned ? "Unpin" : "Pin"}
                            >
                              {c.pinned ? <PinOff className="h-4 w-4 opacity-80" /> : <Pin className="h-4 w-4 opacity-80" />}
                              {c.pinned ? "Unpin" : "Pin"}
                            </button>
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
                        </div>

                        <div className="mt-2 text-sm leading-6 whitespace-pre-wrap break-words line-clamp-3">
                          {c.text}
                        </div>
                      </div>
                    </div>
                  );
                }}
              </List>
            </div>
          )}
        </>
      )}
    </div>
  );
}
