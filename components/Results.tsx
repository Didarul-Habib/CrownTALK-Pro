"use client";

import { motion } from "framer-motion";
import clsx from "clsx";
import { useEffect, useMemo, useState } from "react";
import { Copy, Download, Menu, Trash2, AlertTriangle } from "lucide-react";
import type { ResultItem } from "@/lib/types";
import ResultCard from "./ResultCard";

function copyText(text: string) {
  navigator.clipboard.writeText(text).catch(() => {});
}

function downloadTxt(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function Results({
  items,
  runId,
  onRerollUrl,
  onRetryFailed,
  failedCount,
  onClear,
  onCopy,
}: {
  items: ResultItem[];
  runId: string;
  onRerollUrl: (url: string) => void;
  onRetryFailed: () => void;
  failedCount: number;
  onClear?: () => void;
  onCopy?: (text: string, url?: string) => void;
}) {
  if (!items.length) {
    return (
      <div className="rounded-[var(--ct-radius)] border border-[color:var(--ct-border)] bg-[color:var(--ct-panel)] p-6 text-sm opacity-70 backdrop-blur-xl">
        Results will appear here.
      </div>
    );
  }

  const okCount = items.filter((i) => i.status === "ok").length;
  const failedItems = useMemo(() => items.filter((i) => i.status !== "ok"), [items]);

  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest("[data-results-menu]")) return;
      setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const exportText = useMemo(() => {
    const lines: string[] = [];
    for (const it of items) {
      if (!it.comments || !it.comments.length) continue;
      lines.push(`URL: ${it.url}`);
      for (const c of it.comments) {
        lines.push(`- ${c.text.replace(/\n/g, " ").trim()}`);
      }
      lines.push("");
    }
    return lines.join("\n").trim();
  }, [items]);

  const allCommentsText = useMemo(() => {
    const lines: string[] = [];
    for (const it of items) {
      for (const c of it.comments || []) lines.push(c.text);
    }
    return lines.join("\n\n").trim();
  }, [items]);

  const allUrlsText = useMemo(() => items.map((i) => i.url).join("\n"), [items]);
  const failedUrlsText = useMemo(() => failedItems.map((i) => i.url).join("\n"), [failedItems]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 rounded-[var(--ct-radius)] border border-[color:var(--ct-border)] bg-[color:var(--ct-panel)] p-4 backdrop-blur-xl lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-sm font-semibold tracking-tight">Results</div>
          <div className="text-xs opacity-70">
            Run {runId ? <span className="font-mono">{runId}</span> : "—"} • {items.length} URLs • {okCount} ok • {failedCount} failed
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onRetryFailed}
            disabled={!failedCount}
            className={clsx(
              "ct-btn ct-btn-sm",
              failedCount ? "" : "opacity-50 cursor-not-allowed"
            )}
            title="Retry only failed URLs"
          >
            Retry failed only
          </button>

          <div className="relative" data-results-menu>
            <button
              type="button"
              className="ct-btn ct-btn-sm"
              onClick={() => setMenuOpen((v) => !v)}
              title="Run menu"
            >
              <Menu className="h-4 w-4 opacity-80" />
              Menu
            </button>

            {menuOpen ? (
              <div
                className={clsx(
                  "absolute right-0 mt-2 w-72 overflow-hidden rounded-3xl border shadow-2xl",
                  "bg-[color:var(--ct-panel)] border-[color:var(--ct-border)] backdrop-blur-xl"
                )}
              >
                <div className="p-2 space-y-1">
                  <MenuItem
                    icon={<Copy className="h-4 w-4 opacity-80" />}
                    label="Copy all comments"
                    onClick={() => {
                      copyText(allCommentsText || "");
                      setMenuOpen(false);
                    }}
                    disabled={!allCommentsText}
                  />
                  <MenuItem
                    icon={<Download className="h-4 w-4 opacity-80" />}
                    label="Download .txt"
                    onClick={() => {
                      downloadTxt("crowntalk-comments.txt", exportText || "");
                      setMenuOpen(false);
                    }}
                    disabled={!exportText}
                  />

                  <div className="my-2 h-px bg-white/10" />

                  <MenuItem
                    icon={<Copy className="h-4 w-4 opacity-80" />}
                    label="Copy all URLs"
                    onClick={() => {
                      copyText(allUrlsText);
                      setMenuOpen(false);
                    }}
                    disabled={!items.length}
                  />
                  <MenuItem
                    icon={<Copy className="h-4 w-4 opacity-80" />}
                    label="Copy failed URLs"
                    onClick={() => {
                      copyText(failedUrlsText);
                      setMenuOpen(false);
                    }}
                    disabled={!failedItems.length}
                  />

                  {onClear ? (
                    <>
                      <div className="my-2 h-px bg-white/10" />
                      <MenuItem
                        icon={<Trash2 className="h-4 w-4 opacity-80" />}
                        label="Clear results"
                        danger
                        onClick={() => {
                          onClear();
                          setMenuOpen(false);
                        }}
                      />
                    </>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {failedItems.length ? (
        <div className={clsx("ct-card", "p-4")}
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-300" />
              <div className="text-sm font-semibold tracking-tight">Failed</div>
              <span className="ct-chip text-[11px]">{failedItems.length}</span>
            </div>
            <button
              type="button"
              className="ct-btn ct-btn-sm"
              onClick={onRetryFailed}
            >
              Retry all failed
            </button>
          </div>

          <div className="mt-3 space-y-2">
            {failedItems.map((f) => (
              <div key={f.url} className={clsx("ct-card-surface", "p-3")}
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="text-xs opacity-70 break-all">{f.url}</div>
                    <div className="mt-1 text-sm opacity-85 break-words">{f.reason || "No details"}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      className="ct-btn ct-btn-xs"
                      onClick={() => onRerollUrl(f.url)}
                    >
                      Retry
                    </button>
                    <button
                      type="button"
                      className="ct-btn ct-btn-xs"
                      onClick={() => copyText(f.url)}
                    >
                      <Copy className="h-4 w-4 opacity-80" />
                      Copy
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {items.map((it, idx) => (
        <motion.div
          key={it.url}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: idx * 0.03 }}
        >
          <ResultCard item={it} onReroll={() => onRerollUrl(it.url)} onCopy={onCopy} />
        </motion.div>
      ))}
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  disabled,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      className={clsx(
        "w-full ct-btn ct-btn-sm",
        "justify-start",
        danger ? "ct-btn-danger" : "",
        disabled ? "opacity-50 cursor-not-allowed" : ""
      )}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
    >
      {icon}
      {label}
    </button>
  );
}
