"use client";

import clsx from "clsx";
import { useMemo, useState } from "react";
import { ArrowRight, X } from "lucide-react";

export default function SessionDiffBanner({
  currentUrls,
  lastRunUrls,
  onDismiss,
}: {
  currentUrls: string[];
  lastRunUrls: string[];
  onDismiss: () => void;
}) {
  const [open, setOpen] = useState(false);

  const { added, removed } = useMemo(() => {
    const cur = new Set(currentUrls);
    const prev = new Set(lastRunUrls);
    const a: string[] = [];
    const r: string[] = [];
    for (const u of currentUrls) if (!prev.has(u)) a.push(u);
    for (const u of lastRunUrls) if (!cur.has(u)) r.push(u);
    return { added: a, removed: r };
  }, [currentUrls, lastRunUrls]);

  if (!added.length && !removed.length) return null;

  return (
    <div className={clsx("ct-card", "p-4")}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold tracking-tight">Session restored</div>
          <div className="mt-1 text-xs opacity-70">
            Compared to your last run: <b>{added.length}</b> added, <b>{removed.length}</b> removed.
          </div>
        </div>
        <button
          type="button"
          className="ct-btn ct-btn-xs"
          onClick={onDismiss}
          aria-label="Dismiss session diff"
          title="Dismiss"
        >
          <X className="h-4 w-4 opacity-80" />
          Dismiss
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" className="ct-btn ct-btn-xs" onClick={() => setOpen((v) => !v)}>
          <ArrowRight className={clsx("h-4 w-4 opacity-80", open ? "rotate-90" : "")} />
          {open ? "Hide details" : "Show details"}
        </button>
      </div>

      {open ? (
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className={clsx("ct-card-surface", "p-3")}>
            <div className="text-xs font-semibold opacity-80">Added</div>
            {!added.length ? (
              <div className="mt-2 text-xs opacity-70">None</div>
            ) : (
              <ul className="mt-2 space-y-1 text-xs opacity-80">
                {added.slice(0, 20).map((u) => (
                  <li key={u} className="break-all">+ {u}</li>
                ))}
                {added.length > 20 ? <li className="opacity-60">…and {added.length - 20} more</li> : null}
              </ul>
            )}
          </div>
          <div className={clsx("ct-card-surface", "p-3")}>
            <div className="text-xs font-semibold opacity-80">Removed</div>
            {!removed.length ? (
              <div className="mt-2 text-xs opacity-70">None</div>
            ) : (
              <ul className="mt-2 space-y-1 text-xs opacity-80">
                {removed.slice(0, 20).map((u) => (
                  <li key={u} className="break-all">- {u}</li>
                ))}
                {removed.length > 20 ? <li className="opacity-60">…and {removed.length - 20} more</li> : null}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
