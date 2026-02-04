"use client";

import clsx from "clsx";
import { useMemo } from "react";
import { toast } from "sonner";
import { classifyLines, parseUrls, extractUrlsAll, normalizeXUrl } from "@/lib/validate";
import UrlScanner from "@/components/UrlScanner";

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

  const duplicates = useMemo(() => {
    const all = extractUrlsAll(value);
    const counts = new Map<string, number>();
    for (const u of all) {
      const key = normalizeXUrl(u);
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    const dups = [...counts.entries()].filter(([,n]) => n > 1).map(([k,n]) => ({ url: k, count: n }));
    dups.sort((a,b) => b.count - a.count);
    return dups;
  }, [value]);

  const invalidExamples = useMemo(() => {
    const out: string[] = [];
    for (const x of lineInfo) {
      const t = x.line.trim();
      if (!t) continue;
      if (x.urls.length === 0) out.push(t);
      if (out.length >= 3) break;
    }
    return out;
  }, [lineInfo]);

  const nonStatusXLinks = useMemo(() => {
    const out: string[] = [];
    const re = /(https?:\/\/[^\s]+)/g;
    const s = String(value || "");
    for (const m of s.matchAll(re)) {
      const u = String(m[1] || "");
      const lower = u.toLowerCase();
      const isX = lower.includes("x.com") || lower.includes("twitter.com");
      const isStatus = /\/status\/\d+/.test(lower) || /x\.com\/i\/status\/\d+/.test(lower);
      if (isX && !isStatus) {
        const clean = u.replace(/[)\]\},]+$/, "");
        if (!out.includes(clean)) out.push(clean);
      }
      if (out.length >= 3) break;
    }
    return out;
  }, [value]);


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
            onClick={() => { onCleanInvalid?.(); toast.success("Cleaned invalid lines"); }}
            className={clsx("ct-btn ct-btn-sm", !hasAny ? "opacity-50 cursor-not-allowed" : "")}
            disabled={!hasAny}
            title="Remove invalid lines and keep only valid URLs"
          >
            Clean invalid
          </button>
          <button
            onClick={() => { onSort?.(); toast.success("Sorted URLs"); }}
            className={clsx("ct-btn ct-btn-sm", urls.length < 2 ? "opacity-50 cursor-not-allowed" : "")}
            disabled={urls.length < 2}
            title="Sort URLs A → Z"
          >
            Sort A–Z
          </button>
          <button
            onClick={() => { onShuffle?.(); toast.success("Shuffled URLs"); }}
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
          <UrlScanner valid={urls.length} invalid={invalidLines} />
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


      {(duplicates.length || invalidLines || nonStatusXLinks.length) ? (
        <div className={clsx("mt-3 rounded-2xl border p-3", "border-[color:var(--ct-border)] bg-[color:var(--ct-surface)]")}>
          <div className="text-xs font-semibold tracking-tight">Validation</div>
          <div className="mt-1 text-[11px] opacity-70">We'll only process valid X post URLs. Fix the items below for best results.</div>

          <div className="mt-3 grid gap-3 lg:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
              <div className="text-[11px] font-semibold">Duplicates</div>
              {duplicates.length ? (
                <div className="mt-2 space-y-1">
                  {duplicates.slice(0,3).map((d) => (
                    <div key={d.url} className="text-[11px] opacity-80 break-all">{d.count}× {d.url}</div>
                  ))}
                </div>
              ) : (
                <div className="mt-2 text-[11px] opacity-60">None</div>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
              <div className="text-[11px] font-semibold">Invalid lines</div>
              {invalidLines ? (
                <div className="mt-2 space-y-1">
                  {invalidExamples.map((t, i) => (
                    <div key={i} className="text-[11px] opacity-80 truncate" title={t}>{t}</div>
                  ))}
                </div>
              ) : (
                <div className="mt-2 text-[11px] opacity-60">None</div>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
              <div className="text-[11px] font-semibold">Non-post X links</div>
              {nonStatusXLinks.length ? (
                <div className="mt-2 space-y-1">
                  {nonStatusXLinks.map((u) => (
                    <div key={u} className="text-[11px] opacity-80 truncate" title={u}>{u}</div>
                  ))}
                </div>
              ) : (
                <div className="mt-2 text-[11px] opacity-60">None</div>
              )}
            </div>
          </div>
        </div>
      ) : null}

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
