"use client";

import clsx from "clsx";
import { useMemo } from "react";
import { classifyLines, parseUrls } from "@/lib/validate";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function UrlInput({
  value,
  onChange,
  helper,
  onSort,
  onCleanInvalid,
  onShuffle,
}: {
  value: string;
  onChange: (v: string) => void;
  helper?: string;
  onSort?: () => void;
  onCleanInvalid?: () => void;
  onShuffle?: () => void;
}) {
  const urls = useMemo(() => parseUrls(value), [value]);
  const lineInfo = useMemo(() => classifyLines(value), [value]);

  const invalidLines = useMemo(() => {
    // count lines that contain text but no url
    return lineInfo.filter((x) => x.line.trim().length > 0 && x.urls.length === 0).length;
  }, [lineInfo]);

  const hasAny = urls.length > 0 || invalidLines > 0;

  return (
    <div className="rounded-[var(--ct-radius)] border border-[color:var(--ct-border)] bg-[color:var(--ct-panel)] p-4 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <label className="text-sm font-medium">Tweet URLs</label>
          <div className="text-xs opacity-70 -mt-0.5">Paste one or more X (Twitter) post links — one per line</div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            onClick={onCleanInvalid}
            className={clsx("ct-btn ct-btn-sm", !hasAny ? "opacity-50 cursor-not-allowed" : "")}
            disabled={!hasAny}
            title="Remove invalid lines and keep only valid URLs"
          >
            Clean invalid
          </button>
          <button
            onClick={onSort}
            className={clsx("ct-btn ct-btn-sm", urls.length < 2 ? "opacity-50 cursor-not-allowed" : "")}
            disabled={urls.length < 2}
            title="Sort URLs A → Z"
          >
            Sort A–Z
          </button>
          <button
            onClick={onShuffle}
            className={clsx("ct-btn ct-btn-sm", urls.length < 2 ? "opacity-50 cursor-not-allowed" : "")}
            disabled={urls.length < 2}
            title="Shuffle URL order"
          >
            Shuffle
          </button>
        </div>
      </div>

      <textarea
        className={clsx(
          "mt-3 w-full min-h-[170px] rounded-2xl border p-3 text-sm outline-none",
          "bg-[color:var(--ct-surface)] border-[color:var(--ct-border)]",
          "focus:ring-2 focus:ring-white/15"
        )}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://x.com/i/status/1234567890"
        spellCheck={false}
      />

      <div className="mt-2 flex items-center justify-between gap-3">
        <div className="text-xs opacity-70">{helper ?? " "}</div>

        <div className="flex items-center gap-2 text-[11px]">
          <span
            className="rounded-full border px-2 py-1"
            style={{
              borderColor: "var(--ct-border)",
              background: "rgba(255,255,255,.04)",
            }}
          >
            {urls.length} valid
          </span>
          <span
            className="rounded-full border px-2 py-1"
            style={{
              borderColor: "var(--ct-border)",
              background: invalidLines ? "rgba(239,68,68,.12)" : "rgba(255,255,255,.04)",
            }}
          >
            {invalidLines} invalid
          </span>
        </div>
      </div>

      {/* URL queue preview chips */}
      <div
        className={clsx(
          "mt-3 rounded-2xl border p-3",
          "border-[color:var(--ct-border)] bg-[color:var(--ct-surface)]"
        )}
      >
        {urls.length ? (
          <div className="flex flex-wrap gap-2 min-w-0">
            {urls.slice(0, 20).map((u) => (
              <span
                key={u}
                className="max-w-full min-w-0 truncate rounded-full border px-3 py-1 text-[11px]"
                style={{
                  borderColor: "rgba(255,255,255,.14)",
                  background: "rgba(0,0,0,.12)",
                }}
                title={u}
              >
                {u}
              </span>
            ))}
            {urls.length > 20 ? (
              <span className="text-[11px] opacity-70">+{urls.length - 20} more…</span>
            ) : null}
          </div>
        ) : (
          <div className="text-xs opacity-70">No URLs yet.</div>
        )}
      </div>
    </div>
  );
}

// helpers for parent
export function sortUrlsInRaw(raw: string): string {
  const urls = parseUrls(raw);
  return [...urls].sort((a, b) => a.localeCompare(b)).join("\n");
}

export function cleanInvalidInRaw(raw: string): string {
  const urls = parseUrls(raw);
  return urls.join("\n");
}

export function shuffleUrlsInRaw(raw: string): string {
  const urls = parseUrls(raw);
  return shuffle(urls).join("\n");
}
