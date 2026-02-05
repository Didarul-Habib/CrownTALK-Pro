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
  selected,
  onSelectedChange,
  helper,
  onSort,
  onCleanInvalid,
  onShuffle,
}: {
  value: string;
  onChange: (v: string) => void;
  selected?: string[];
  onSelectedChange?: (urls: string[]) => void;
  helper?: string;
  onSort?: () => void;
  onCleanInvalid?: () => void;
  onShuffle?: () => void;
}) {
  const urls = useMemo(() => parseUrls(value), [value]);
  const lineInfo = useMemo(() => classifyLines(value), [value]);

  const selectedSet = useMemo(() => new Set(selected ?? urls), [selected, urls]);

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


  const inbox = useMemo(() => {
    // Preserve order from the user's input.
    const ordered = extractUrlsAll(value)
      .map((u) => normalizeXUrl(u))
      .filter((u, i, a) => a.indexOf(u) === i); // unique while preserving order

    const dupMap = new Map<string, number>();
    for (const u of extractUrlsAll(value)) {
      const key = normalizeXUrl(u);
      dupMap.set(key, (dupMap.get(key) || 0) + 1);
    }

    return ordered.map((u) => {
      const lower = u.toLowerCase();
      const isStatus = /\/status\/\d+/.test(lower) || /x\.com\/i\/status\/\d+/.test(lower);
      return {
        url: u,
        valid: isStatus,
        duplicateCount: dupMap.get(u) || 1,
      };
    });
  }, [value]);


  const hasAny = urls.length > 0 || invalidLines > 0;

  function toggle(u: string) {
    if (!onSelectedChange) return;
    const next = new Set(selectedSet);
    if (next.has(u)) next.delete(u);
    else next.add(u);
    onSelectedChange([...next]);
  }

  function selectAll() {
    onSelectedChange?.([...urls]);
  }

  function selectNone() {
    onSelectedChange?.([]);
  }

  function removeDuplicates() {
    const all = [...urls];
    const seen = new Set<string>();
    const dedup: string[] = [];
    for (const u of all) {
      const k = normalizeXUrl(u);
      if (seen.has(k)) continue;
      seen.add(k);
      dedup.push(u);
    }
    onChange(dedup.join("\n"));
    toast.success("Removed duplicates");
  }

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

      {/* URL Inbox (parsing preview + selection) */}
      <div className={clsx(
        "mt-3 rounded-2xl border p-3",
        "border-[color:var(--ct-border)] bg-[color:var(--ct-surface)]"
      )}>
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-xs font-semibold tracking-tight">URL Inbox</div>
            <div className="text-[11px] opacity-70">Preview what will be processed. Uncheck anything you don't want to include.</div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              className={clsx("ct-btn ct-btn-sm", inbox.length ? "" : "opacity-50 cursor-not-allowed")}
              disabled={!inbox.length}
              onClick={() => {
                const onlyValid = inbox.filter((x) => x.valid).map((x) => x.url);
                onSelectedChange?.(onlyValid);
                toast.success("Selected valid URLs only");
              }}
              title="Select only valid X post URLs"
            >
              Select valid
            </button>
            <button
              type="button"
              className={clsx("ct-btn ct-btn-sm", inbox.length ? "" : "opacity-50 cursor-not-allowed")}
              disabled={!inbox.length}
              onClick={() => {
                onSelectedChange?.(inbox.map((x) => x.url));
                toast("Selected all");
              }}
            >
              Select all
            </button>
            <button
              type="button"
              className={clsx("ct-btn ct-btn-sm", selectedSet.size ? "" : "opacity-50 cursor-not-allowed")}
              disabled={!selectedSet.size}
              onClick={() => {
                onSelectedChange?.([]);
                toast("Cleared selection");
              }}
            >
              Clear
            </button>
          </div>
        </div>

        {inbox.length ? (
          <div className="mt-3 max-h-[220px] overflow-auto pr-1">
            <div className="space-y-2">
              {inbox.slice(0, 60).map((row) => {
                const checked = selectedSet.has(row.url);
                return (
                  <label key={row.url} className={clsx(
                    "flex items-start gap-3 rounded-2xl border px-3 py-2",
                    "border-white/10 bg-black/10",
                    row.valid ? "" : "border-red-500/25"
                  )}>
                    <input
                      type="checkbox"
                      className="mt-0.5 accent-white"
                      checked={checked}
                      onChange={(e) => {
                        const next = new Set(selectedSet);
                        if (e.target.checked) next.add(row.url);
                        else next.delete(row.url);
                        onSelectedChange?.([...next]);
                      }}
                      aria-label={checked ? "Deselect URL" : "Select URL"}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] break-all opacity-85">{row.url}</div>
                      <div className="mt-0.5 flex flex-wrap gap-2 text-[10px]">
                        <span className={clsx(
                          "rounded-full border px-2 py-0.5",
                          row.valid ? "border-white/10 bg-white/5" : "border-red-500/25 bg-red-500/10"
                        )}>
                          {row.valid ? "Valid post" : "Not a post"}
                        </span>
                        {row.duplicateCount > 1 ? (
                          <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5">Duplicate ×{row.duplicateCount}</span>
                        ) : null}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="ct-btn ct-btn-sm"
                      onClick={(e) => {
                        e.preventDefault();
                        const nextInbox = inbox.filter((x) => x.url !== row.url).map((x) => x.url);
                        onChange(nextInbox.join("\n"));
                        toast("Removed URL");
                      }}
                      aria-label="Remove URL"
                      title="Remove from input"
                    >
                      Remove
                    </button>
                  </label>
                );
              })}
              {inbox.length > 60 ? (
                <div className="text-[11px] opacity-70">Showing first 60. Clean/sort to reduce.</div>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="mt-3 text-xs opacity-70">Paste links above to see them here.</div>
        )}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] opacity-70">
          <div>
            Selected: <span className="font-semibold text-white/90">{selectedSet.size}</span> / {urls.length} valid
          </div>
          <div className="hidden sm:block">Tip: paste messy text — we extract links automatically.</div>
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

      {/* URL Inbox (parsing preview + selection) */}
      <div
        className={clsx(
          "mt-3 rounded-2xl border p-3",
          "border-[color:var(--ct-border)] bg-[color:var(--ct-surface)]"
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-xs font-semibold tracking-tight">URL Inbox</div>
            <div className="text-[11px] opacity-70">Preview parsed URLs from your paste. Toggle what gets generated.</div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="ct-btn ct-btn-sm"
              onClick={selectAll}
              disabled={!urls.length}
              title="Select all valid URLs"
            >
              Select all
            </button>
            <button
              type="button"
              className="ct-btn ct-btn-sm"
              onClick={selectNone}
              disabled={!urls.length}
              title="Deselect all"
            >
              Select none
            </button>
            <button
              type="button"
              className="ct-btn ct-btn-sm"
              onClick={removeDuplicates}
              disabled={duplicates.length === 0}
              title="Remove duplicate URLs"
            >
              Remove dups
            </button>
          </div>
        </div>

        <div className="mt-3 max-h-[240px] overflow-auto rounded-2xl border border-white/10 bg-black/10">
          {inbox.length ? (
            <div className="divide-y divide-white/10">
              {inbox.map((it) => {
                const checked = selectedSet.has(it.url) && it.valid;
                return (
                  <label
                    key={it.url}
                    className={clsx(
                      "flex items-start gap-3 px-3 py-2 cursor-pointer",
                      it.valid ? "hover:bg-white/5" : "opacity-60"
                    )}
                    title={it.url}
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={checked}
                      onChange={() => toggle(it.url)}
                      disabled={!it.valid}
                      aria-label={it.valid ? "Toggle URL" : "Invalid URL"}
                    />

                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] break-all opacity-90">{it.url}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] opacity-70">
                        <span className={clsx("rounded-full border px-2 py-0.5", it.valid ? "border-emerald-500/30 bg-emerald-500/10" : "border-red-500/30 bg-red-500/10")}> 
                          {it.valid ? "Post" : "Not a post"}
                        </span>
                        {it.duplicateCount > 1 ? (
                          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5">{it.duplicateCount}× duplicate</span>
                        ) : null}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          ) : (
            <div className="p-3 text-xs opacity-70">Paste links above — we’ll extract them into your inbox automatically.</div>
          )}
        </div>

        <div className="mt-2 text-[11px] opacity-70">
          Selected: <span className="font-semibold">{[...selectedSet].filter((u) => urls.includes(u)).length}</span> / {urls.length} valid
        </div>
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
