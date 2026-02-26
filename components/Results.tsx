"use client";

import { motion } from "framer-motion";
import clsx from "clsx";
import { useEffect, useMemo, useState } from "react";
import { Copy, Download, Menu, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import type { ResultItem } from "@/lib/types";
import { detectSpammy, findNearDuplicates } from "@/lib/similarity";
import { LS, lsGet } from "@/lib/storage";
import { shouldReduceEffects, type FxMode } from "@/lib/motion";
import { translate, useUiLang } from "@/lib/i18n";
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
  onRetryUrl,
  onRetryFailed,
  failedCount,
  queueTotal,
  queueDone,
  onClear,
  onCopy,
  loading,
}: {
  items: ResultItem[];
  runId: string;
  onRerollUrl: (url: string) => void;
  onRetryUrl: (url: string) => void;
  onRetryFailed: () => void;
  failedCount: number;
  queueTotal?: number;
  queueDone?: number;
  onClear?: () => void;
  onCopy?: (text: string, url?: string) => void;
  loading?: boolean;
}) {
  const uiLang = useUiLang();

  const okCount = items.filter((i) => i.status === "ok").length;
  const failedItems = useMemo(
    () => items.filter((i) => i.status !== "ok" && i.status !== "pending"),
    [items]
  );

  const primaryPairs = useMemo(() => {
    return items
      .filter((i) => i.status === "ok" && i.comments && i.comments.length > 0)
      .map((i) => [i.url, i.comments![0].text] as const);
  }, [items]);

  const similarMap = useMemo(() => {
    if (!primaryPairs.length) return new Map<string, string[]>();
    return findNearDuplicates(primaryPairs);
  }, [primaryPairs]);

  const spamMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const it of items) {
      if (it.status !== "ok") continue;
      const t = it.comments?.[0]?.text || "";
      const reason = detectSpammy(t);
      if (reason) m.set(it.url, reason);
    }
    return m;
  }, [items]);

  const similarCount = similarMap.size;
  const [hideNearDuplicates, setHideNearDuplicates] = useState(false);
  const [showFailedCards, setShowFailedCards] = useState(false);

  const hideSet = useMemo(() => {
    if (!hideNearDuplicates) return new Set<string>();
    const toHide = new Set<string>();
    let keptOne = false;
    for (const it of items) {
      if (it.status !== "ok") continue;
      if (!similarMap.has(it.url)) continue;
      if (!keptOne) {
        keptOne = true;
        continue;
      }
      toHide.add(it.url);
    }
    return toHide;
  }, [hideNearDuplicates, items, similarMap]);

  const displayItemsDedup = useMemo(() => {
    if (!hideNearDuplicates) return items;
    return items.filter((it) => !hideSet.has(it.url));
  }, [hideNearDuplicates, items, hideSet]);

  const displayItems = useMemo(() => {
    const base = displayItemsDedup;

    // While generating, keep pending cards visible (skeletons) so users see progress.
    if (loading) {
      return base;
    }

    // When not loading:
    if (showFailedCards) {
      return base;
    }

    // Only show ok+pending by default once done
    return base.filter(
      (it) => it.status === "ok" || it.status === "pending"
    );
  }, [displayItemsDedup, loading, showFailedCards]);

  const pendingCount = useMemo(
    () => items.filter((i) => i.status === "pending").length,
    [items]
  );

  const [canAnimateCards, setCanAnimateCards] = useState(true);
  useEffect(() => {
    try {
      const mode = (lsGet(LS.fxMode, "auto") as FxMode) || "auto";
      setCanAnimateCards(!shouldReduceEffects(mode));
    } catch {
      setCanAnimateCards(true);
    }
  }, []);

  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest("[data-results-menu-root]")) return;
      setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const allPlainText = useMemo(() => {
    const lines: string[] = [];

    for (const it of items) {
      if (!it.comments || !it.comments.length) continue;
      const header = it.url ? `URL: ${it.url}` : "";
      if (header) lines.push(header);
      for (const c of it.comments) {
        lines.push(c.text);
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

  const allUrlsText = useMemo(
    () => items.map((i) => i.url).join("\n"),
    [items]
  );
  const failedUrlsText = useMemo(
    () => failedItems.map((i) => i.url).join("\n"),
    [failedItems]
  );

  // 🔴 Hooks above, conditional UI below to keep hook order stable
  if (!items.length) {
    if (loading) {
      return (
        <div
          id="ct-results"
          className="rounded-[var(--ct-radius)] border border-[color:var(--ct-border)] bg-[color:var(--ct-panel)] p-4 backdrop-blur-xl"
        >
          <div className="text-sm font-semibold tracking-tight">
            {translate("results.title", uiLang)}
          </div>
          <div className="mt-1 text-xs opacity-70">
            {translate("results.generating", uiLang)}
          </div>

          <div className="mt-4 space-y-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="ct-skeleton rounded-[var(--ct-radius)] p-4"
              >
                <div className="h-3 w-2/5 rounded-full bg-white/10" />
                <div className="mt-3 h-8 rounded-2xl bg-white/10" />
                <div className="mt-2 h-8 rounded-2xl bg-white/10" />
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div
        id="ct-results"
        className="rounded-[var(--ct-radius)] border border-[color:var(--ct-border)] bg-[color:var(--ct-panel)] p-6 backdrop-blur-xl"
      >
        <div className="text-sm font-semibold tracking-tight">
          {translate("results.title", uiLang)}
        </div>
        <div className="mt-1 text-sm opacity-70">
          {translate("results.subtitle", uiLang)}
        </div>
        <div className="mt-4 ct-card-surface p-4 text-xs opacity-75">
          {translate("results.tip", uiLang)}
        </div>
      </div>
    );
  }

  return (
    <div id="ct-results" className="space-y-4">
      <div
        className={clsx(
          "relative z-30 overflow-visible",
          "flex flex-col gap-2 rounded-[var(--ct-radius)] border border-[color:var(--ct-border)]",
          "bg-[color:var(--ct-panel)] p-4 backdrop-blur-xl",
          "lg:flex-row lg:items-center lg:justify-between lg:gap-4"
        )}
      >
        <div className="flex flex-col gap-1">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--ct-accent)]">
            {translate("results.title", uiLang)}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[color:var(--ct-muted)]">
            <div>
              {translate("results.statsOk", uiLang, {
                count: okCount.toString(),
              })}
            </div>
            {!!pendingCount && (
              <div>
                {translate("results.statsPending", uiLang, {
                  count: pendingCount.toString(),
                })}
              </div>
            )}
            {!!failedCount && (
              <div className="text-[color:var(--ct-warning)]">
                {translate("results.statsFailed", uiLang, {
                  count: failedCount.toString(),
                })}
              </div>
            )}
            {!!similarCount && (
              <div className="text-[color:var(--ct-muted-strong)]">
                {translate("results.statsNearDupes", uiLang, {
                  count: similarCount.toString(),
                })}
              </div>
            )}
          </div>
        </div>

        <div
          className="flex flex-wrap items-center gap-2 text-xs"
          data-results-menu-root
        >
          <button
            type="button"
            className={clsx(
              "relative inline-flex items-center gap-1 rounded-full border border-[color:var(--ct-border-soft)] px-3 py-1.5 text-[0.72rem] font-medium",
              "bg-[color:var(--ct-chip-bg)] text-[color:var(--ct-chip-fg)]",
              "hover:border-[color:var(--ct-border-strong)] hover:bg-[color:var(--ct-chip-bg-hover)]"
            )}
            onClick={() => setHideNearDuplicates((v) => !v)}
          >
            <span className="relative flex h-2.5 w-2.5 items-center justify-center">
              <span
                className={clsx(
                  "absolute inset-0 rounded-full border border-[color:var(--ct-border-soft)]",
                  hideNearDuplicates
                    ? "bg-[color:var(--ct-accent-soft)]"
                    : "bg-[color:var(--ct-bg)]"
                )}
              />
              <span
                className={clsx(
                  "relative h-1.5 w-1.5 rounded-full",
                  hideNearDuplicates
                    ? "bg-[color:var(--ct-accent)]"
                    : "bg-[color:var(--ct-border-soft)]"
                )}
              />
            </span>
            <span className="truncate">
              {translate("results.hideNearDupes", uiLang)}
            </span>
          </button>

          {!!failedCount && (
            <button
              type="button"
              className={clsx(
                "inline-flex items-center gap-1 rounded-full border border-[color:var(--ct-border-soft)] px-3 py-1.5 text-[0.72rem] font-medium",
                "bg-[color:var(--ct-chip-bg)] text-[color:var(--ct-chip-fg)]",
                "hover:border-[color:var(--ct-border-strong)] hover:bg-[color:var(--ct-chip-bg-hover)]"
              )}
              onClick={() => setShowFailedCards((v) => !v)}
            >
              <AlertTriangle className="h-3 w-3 text-[color:var(--ct-warning)]" />
              <span className="truncate">
                {showFailedCards
                  ? translate("results.hideFailed", uiLang)
                  : translate("results.showFailed", uiLang)}
              </span>
            </button>
          )}

          <div className="relative">
            <button
              type="button"
              className={clsx(
                "inline-flex items-center gap-1 rounded-full border border-[color:var(--ct-border-soft)] px-3 py-1.5 text-[0.72rem] font-medium",
                "bg-[color:var(--ct-chip-bg)] text-[color:var(--ct-chip-fg)]",
                "hover:border-[color:var(--ct-border-strong)] hover:bg-[color:var(--ct-chip-bg-hover)]"
              )}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <Menu className="h-3 w-3" />
              <span>{translate("results.actions", uiLang)}</span>
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-[120%] z-40 w-56 rounded-[1rem] border border-[color:var(--ct-border)] bg-[color:var(--ct-panel-strong)] p-2 text-xs shadow-[0_18px_45px_rgba(0,0,0,0.55)]">
                <ResultsMenu
                  onClear={onClear}
                  allPlainText={allPlainText}
                  allCommentsText={allCommentsText}
                  allUrlsText={allUrlsText}
                  failedUrlsText={failedUrlsText}
                  onCopy={onCopy}
                  uiLang={uiLang}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {displayItems.map((it, idx) => (
          <motion.div
            key={it.url}
            layout={canAnimateCards}
            initial={
              canAnimateCards
                ? { opacity: 0, y: 8, scale: 0.99 }
                : undefined
            }
            animate={
              canAnimateCards
                ? { opacity: 1, y: 0, scale: 1 }
                : undefined
            }
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 26,
              delay: canAnimateCards ? idx * 0.02 : 0,
            }}
          >
            <ResultCard
              item={it}
              onRerollUrl={onRerollUrl}
              onRetryUrl={onRetryUrl}
              onRetryFailed={onRetryFailed}
              spamReason={spamMap.get(it.url)}
              similarTo={similarMap.get(it.url)}
              runId={runId}
              onCopy={onCopy}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function ResultsMenu({
  onClear,
  allPlainText,
  allCommentsText,
  allUrlsText,
  failedUrlsText,
  onCopy,
  uiLang,
}: {
  onClear?: () => void;
  allPlainText: string;
  allCommentsText: string;
  allUrlsText: string;
  failedUrlsText: string;
  onCopy?: (text: string, url?: string) => void;
  uiLang: string;
}) {
  const canDownload = typeof window !== "undefined";

  return (
    <div className="space-y-1">
      <MenuItem
        icon={<Copy className="h-3 w-3" />}
        label={translate("results.copyAll", uiLang)}
        onClick={() => {
          const text = allPlainText;
          if (!text) return;
          copyText(text);
          toast.success(translate("toast.copiedAll", uiLang));
          onCopy?.(text);
        }}
      />
      <MenuItem
        icon={<Copy className="h-3 w-3" />}
        label={translate("results.copyOnlyComments", uiLang)}
        onClick={() => {
          const text = allCommentsText;
          if (!text) return;
          copyText(text);
          toast.success(translate("toast.copiedComments", uiLang));
          onCopy?.(text);
        }}
      />
      <MenuItem
        icon={<Copy className="h-3 w-3" />}
        label={translate("results.copyUrls", uiLang)}
        onClick={() => {
          const text = allUrlsText;
          if (!text) return;
          copyText(text);
          toast.success(translate("toast.copiedUrls", uiLang));
          onCopy?.(text);
        }}
      />
      <MenuItem
        icon={<Copy className="h-3 w-3" />}
        label={translate("results.copyFailedUrls", uiLang)}
        onClick={() => {
          const text = failedUrlsText;
          if (!text) return;
          copyText(text);
          toast.success(translate("toast.copiedFailedUrls", uiLang));
          onCopy?.(text);
        }}
      />
      <MenuItem
        icon={<Download className="h-3 w-3" />}
        label={translate("results.downloadTxt", uiLang)}
        disabled={!canDownload}
        onClick={() => {
          const text = allPlainText;
          if (!text) return;
          const filename = `crowntalk_run_${runId || "export"}.txt`;
          downloadTxt(filename, text);
          toast.success(translate("toast.downloadStarted", uiLang));
        }}
      />
      {onClear && (
        <MenuItem
          icon={<Trash2 className="h-3 w-3" />}
          label={translate("results.clearAll", uiLang)}
          danger
          onClick={() => {
            onClear();
            toast.success(translate("toast.clearedResults", uiLang));
          }}
        />
      )}
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
  onClick?: () => void;
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
