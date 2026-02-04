"use client";

import { motion } from "framer-motion";
import clsx from "clsx";
import type { ResultItem } from "@/lib/types";
import ResultCard from "./ResultCard";

export default function Results({
  items,
  runId,
  onRerollUrl,
  onRetryFailed,
  failedCount,
}: {
  items: ResultItem[];
  runId: string;
  onRerollUrl: (url: string) => void;
  onRetryFailed: () => void;
  failedCount: number;
}) {
  if (!items.length) {
    return (
      <div className="rounded-[var(--ct-radius)] border border-[color:var(--ct-border)] bg-[color:var(--ct-panel)] p-6 text-sm opacity-70 backdrop-blur-xl">
        Results will appear here.
      </div>
    );
  }

  const okCount = items.filter((i) => i.ok).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 rounded-[var(--ct-radius)] border border-[color:var(--ct-border)] bg-[color:var(--ct-panel)] p-4 backdrop-blur-xl md:flex-row md:items-center md:justify-between">
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
              "rounded-xl border px-3 py-2 text-xs transition",
              "bg-[color:var(--ct-surface)] border-[color:var(--ct-border)]",
              failedCount ? "hover:brightness-110" : "opacity-50 cursor-not-allowed"
            )}
            title="Retry only failed URLs"
          >
            Retry failed only
          </button>
        </div>
      </div>

      {items.map((it, idx) => (
        <motion.div
          key={it.url}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: idx * 0.03 }}
        >
          <ResultCard item={it} onReroll={() => onRerollUrl(it.url)} />
        </motion.div>
      ))}
    </div>
  );
}
