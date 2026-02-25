"use client";

import clsx from "clsx";
import { useMemo, useState } from "react";
import {
  History,
  Trash2,
  ChevronRight,
  Download,
  Search,
  Pin,
  PinOff,
  Tag,
  Share2,
} from "lucide-react";
import type { RunRecord } from "@/lib/persist";
import { safeTrim } from "@/lib/persist";
import { translate, useUiLang } from "@/lib/i18n";

function fmtTime(ts: number) {
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

type Props = {
  runs: RunRecord[];
  onLoad: (id: string) => void;
  onRemove: (id: string) => void;
  onShare?: (id: string) => void;
  onClear: () => void;
  onExport?: () => void | Promise<void>;
  onTogglePin?: (id: string) => void;
  onRename?: (id: string, label: string) => void;
};

function defaultLabel(run: RunRecord): string {
  if (run.label) return run.label;
  if (run.mode === "source" && run.request.sourceUrl) {
    return run.request.sourceUrl;
  }
  const firstUrl = run.request.urls?.[0];
  if (firstUrl) return firstUrl;
  return fmtTime(run.at) || "Previous run";
}

export default function RunHistoryPanel({
  runs,
  onLoad,
  onRemove,
  onShare,
  onClear,
  onExport,
  onTogglePin,
  onRename,
}: Props) {
  const uiLang = useUiLang();
  const t = (key: string) => translate(key, uiLang);

  const [modeFilter, setModeFilter] = useState<"all" | "urls" | "source">("all");
  const [query, setQuery] = useState("");

  const filteredRuns = useMemo(() => {
    if (!runs.length) return [];

    let list = [...runs];

    if (modeFilter === "urls") {
      list = list.filter((r) => r.mode !== "source");
    } else if (modeFilter === "source") {
      list = list.filter((r) => r.mode === "source");
    }

    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((r) => {
        const parts: string[] = [];
        if (r.label) parts.push(r.label);
        if (r.request.sourceUrl) parts.push(r.request.sourceUrl);
        if (r.request.urls?.length) parts.push(...r.request.urls);
        if (r.results?.length) parts.push(r.results[0]?.text || "");
        return parts.join(" ").toLowerCase().includes(q);
      });
    }

    const pinned = list.filter((r) => r.pinned);
    const unpinned = list.filter((r) => !r.pinned);

    // Pinned sessions always on top
    return [...pinned, ...unpinned];
  }, [runs, modeFilter, query]);

  const handleExport = async () => {
    if (!onExport) return;
    await onExport();
  };

  const handleRename = (run: RunRecord) => {
    if (!onRename) return;
    const base = defaultLabel(run);
    const next = window.prompt(t("history.labelPrompt"), base);
    if (!next) return;
    const trimmed = next.trim();
    if (!trimmed) return;
    onRename(run.id, trimmed);
  };

  if (!runs.length) {
    return (
      <div className={clsx("ct-card", "p-4")}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-1 text-[11px]">
              <History className="h-3.5 w-3.5 opacity-80" />
              <span className="font-semibold tracking-tight">
                {t("history.title")}
              </span>
            </span>
          </div>
        </div>
        <div className="mt-4 text-xs opacity-70">
          {t("history.empty")}
        </div>
      </div>
    );
  }

  return (
    <div className={clsx("ct-card", "p-4 h-full")}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-1 text-[11px]">
            <History className="h-3.5 w-3.5 opacity-80" />
            <span className="font-semibold tracking-tight">
              {t("history.title")}
            </span>
          </span>
          <span className="hidden truncate text-[11px] opacity-70 sm:inline">
            {runs.length}{" "}
            {runs.length === 1
              ? t("history.sessionSingular")
              : t("history.sessionPlural")}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {onExport && (
            <button type="button" className="ct-btn ct-btn-xs" onClick={handleExport}>
              <Download className="h-4 w-4 opacity-80" />
              {t("history.export")}
            </button>
          )}
          <button type="button" className="ct-btn ct-btn-xs" onClick={onClear}>
            <Trash2 className="h-4 w-4 opacity-80" />
            {t("history.clear")}
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1 rounded-full bg-black/30 p-1 text-[11px]">
          {(
            [
              ["all", t("history.filterAll")],
              ["urls", t("history.filterUrls")],
              ["source", t("history.filterSource")],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setModeFilter(id)}
              className={clsx(
                "px-3 py-1 rounded-full",
                modeFilter === id
                  ? "bg-white text-black shadow-sm"
                  : "text-[color:var(--ct-muted)] hover:text-white",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 opacity-70" />
          <input
            className="w-full rounded-full border border-[color:var(--ct-border)] bg-[color:var(--ct-panel)]/80 py-1.5 pl-7 pr-3 text-[11px] outline-none focus:ring-1 focus:ring-white/30"
            placeholder={t("history.searchPlaceholder")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-3 space-y-2 max-h-[420px] overflow-y-auto pr-1">
        {filteredRuns.map((run) => {
          const title = defaultLabel(run);
          const urlsCount = run.request.urls?.length || 0;
          const firstText = run.results?.[0]?.text || "";

          return (
            <div
              key={run.id}
              className="rounded-2xl border border-[color:var(--ct-border)] bg-[color:var(--ct-panel)]/80 p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-1 min-w-0">
                    {run.pinned && (
                      <Pin className="h-3 w-3 shrink-0 text-[color:var(--ct-accent)]" />
                    )}
                    <div className="truncate text-xs font-semibold tracking-tight">
                      {title}
                    </div>
                  </div>
                  <div className="text-[11px] opacity-70">
                    {fmtTime(run.at)} • {urlsCount} URL
                    {urlsCount === 1 ? "" : "s"} • {run.okCount}{" "}
                    {t("history.ok")}
                    {run.failedCount
                      ? ` • ${run.failedCount} ${t("history.failed")}`
                      : ""}
                  </div>
                  {firstText ? (
                    <div className="mt-1 text-[11px] opacity-80 line-clamp-2">
                      {safeTrim(firstText, 180)}
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                  <button
                    type="button"
                    className="ct-btn ct-btn-xs"
                    onClick={() => onLoad(run.id)}
                  >
                    <ChevronRight className="h-4 w-4 opacity-80" />
                    {t("history.load")}
                  </button>
                  <div className="mt-1 flex items-center gap-1">
                    {onRename && (
                      <button
                        type="button"
                        className="ct-btn ct-btn-ghost ct-btn-xxs"
                        title={t("history.rename")}
                        onClick={() => handleRename(run)}
                      >
                        <Tag className="h-3.5 w-3.5 opacity-80" />
                      </button>
                    )}
                    {onTogglePin && (
                      <button
                        type="button"
                        className="ct-btn ct-btn-ghost ct-btn-xxs"
                        title={run.pinned ? t("history.unpin") : t("history.pin")}
                        onClick={() => onTogglePin(run.id)}
                      >
                        {run.pinned ? (
                          <PinOff className="h-3.5 w-3.5 opacity-80" />
                        ) : (
                          <Pin className="h-3.5 w-3.5 opacity-80" />
                        )}
                      </button>
                    )}
                    {onShare && (
                      <button
                        type="button"
                        className="ct-btn ct-btn-ghost ct-btn-xxs"
                        title={t("history.share")}
                        onClick={() => onShare(run.id)}
                      >
                        <Share2 className="h-3.5 w-3.5 opacity-80" />
                      </button>
                    )}
                    <button
                      type="button"
                      className="ct-btn ct-btn-ghost ct-btn-xxs"
                      title={t("history.remove")}
                      onClick={() => onRemove(run.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 opacity-80" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
