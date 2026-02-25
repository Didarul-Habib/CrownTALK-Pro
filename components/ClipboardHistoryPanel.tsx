"use client";

import clsx from "clsx";
import { useState } from "react";
import {
  Clipboard,
  Copy,
  Trash2,
  Pin,
  PinOff,
  Download,
  Search,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { FixedSizeList as List } from "react-window";
import type { ClipboardRecord } from "@/lib/persist";
import { translate, useUiLang } from "@/lib/i18n";

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

type Props = {
  items: ClipboardRecord[];
  onClear: () => void;
  onTogglePin: (id: string) => void;
};

export default function ClipboardHistoryPanel({ items, onClear, onTogglePin }: Props) {
  const uiLang = useUiLang();
  const t = (key: string) => translate(key, uiLang);

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
  const empty = !items.length;

  return (
    <div className={clsx("ct-card", "p-4")}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Clipboard className="h-4 w-4 opacity-80" />
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="group flex items-center gap-1 text-sm font-semibold tracking-tight"
            aria-label={expanded ? t("clipboard.collapse") : t("clipboard.expand")}
          >
            <span>{t("clipboard.title")}</span>
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
            className={clsx(
              "ct-btn ct-btn-xs min-w-[4.5rem] justify-center",
              empty ? "opacity-50 cursor-not-allowed" : "",
            )}
            onClick={() =>
              downloadFile(
                "crowntalk-clipboard.json",
                JSON.stringify(items, null, 2),
                "application/json",
              )
            }
            disabled={empty}
            title={t("clipboard.exportJson")}
          >
            <Download className="h-4 w-4" />
            JSON
          </button>
          <button
            type="button"
            className={clsx(
              "ct-btn ct-btn-xs min-w-[4.5rem] justify-center",
              empty ? "opacity-50 cursor-not-allowed" : "",
            )}
            onClick={() => {
              const blocks = items.map((c) => {
                const tStamp = fmt(c.at);
                const u = c.url || "";
                const body = (c.text || "").trim();
                return `${tStamp}\n${u}\n${body}`;
              });
              downloadFile(
                "crowntalk-clipboard.txt",
                blocks.join("\n\n---\n\n"),
                "text/plain;charset=utf-8",
              );
            }}
            disabled={empty}
            title={t("clipboard.exportTxt")}
          >
            <Download className="h-4 w-4" />
            TXT
          </button>
          <button
            type="button"
            className={clsx(
              "ct-btn ct-btn-xs min-w-[4.5rem] justify-center",
              empty ? "opacity-50 cursor-not-allowed" : "",
            )}
            onClick={() => {
              const header = "time,url,text";
              const rows = items.map((c) => {
                const tIso = new Date(c.at).toISOString();
                const u = (c.url || "").replace(/"/g, '""');
                const txt = (c.text || "")
                  .replace(/"/g, '""')
                  .replace(/\n/g, " ");
                return `"${tIso}","${u}","${txt}"`;
              });
              downloadFile(
                "crowntalk-clipboard.csv",
                [header, ...rows].join("\n"),
                "text/csv;charset=utf-8",
              );
            }}
            disabled={empty}
            title={t("clipboard.exportCsv")}
          >
            <Download className="h-4 w-4" />
            CSV
          </button>
          <button
            type="button"
            className={clsx(
              "ct-btn ct-btn-xs ct-btn-danger min-w-[4.5rem] justify-center",
              empty ? "opacity-50 cursor-not-allowed" : "",
            )}
            onClick={() => {
              if (!window.confirm(t("clipboard.clearConfirm"))) return;
              onClear();
            }}
            disabled={empty}
          >
            <Trash2 className="h-4 w-4" />
            {t("clipboard.clear")}
          </button>
        </div>
      </div>

      {expanded && (
        <>
          <div className="mt-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[11px] opacity-70">
              <span>
                {items.length} {t("clipboard.items")}
              </span>
              {pinned.length ? (
                <>
                  <span>·</span>
                  <span>
                    {pinned.length} {t("clipboard.pinned")}
                  </span>
                </>
              ) : null}
            </div>
            <div className="relative w-40">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 opacity-70" />
              <input
                className="w-full rounded-full border border-[color:var(--ct-border)] bg-[color:var(--ct-panel)]/80 py-1.5 pl-7 pr-2 text-[11px] outline-none focus:ring-1 focus:ring-white/30"
                placeholder={t("clipboard.searchPlaceholder")}
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="mt-4 text-[11px] opacity-70">
              {t("clipboard.emptyFiltered")}
            </div>
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
                  const c =
                    index < pinned.length
                      ? pinned[index]
                      : unpinned[index - pinned.length];
                  return (
                    <div style={style} className="px-1 py-1">
                      <div className={clsx("ct-card-surface", "p-3")}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="text-[11px] font-mono opacity-60">
                              {fmt(c.at)}
                            </div>
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
                              title={
                                c.pinned ? t("clipboard.unpin") : t("clipboard.pin")
                              }
                              aria-label={
                                c.pinned ? t("clipboard.unpin") : t("clipboard.pin")
                              }
                            >
                              {c.pinned ? (
                                <PinOff className="h-4 w-4 opacity-80" />
                              ) : (
                                <Pin className="h-4 w-4 opacity-80" />
                              )}
                              {c.pinned ? t("clipboard.unpin") : t("clipboard.pin")}
                            </button>
                            <button
                              type="button"
                              className="ct-btn ct-btn-xs"
                              onClick={() => copyText(c.text || "")}
                              title={t("clipboard.copy")}
                            >
                              <Copy className="h-4 w-4 opacity-80" />
                              {t("clipboard.copy")}
                            </button>
                          </div>
                        </div>

                        <div className="mt-2 text-[11px] leading-snug whitespace-pre-wrap break-words line-clamp-3">
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
