"use client";

import clsx from "clsx";
import { useMemo, useState } from "react";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { toast } from "sonner";
import { translate, useUiLang } from "@/lib/i18n";
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

function domainOf(u: string) {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function faviconFor(u: string) {
  const d = domainOf(u);
  // Simple, CORS-safe favicon endpoint.
  return d ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(d)}&sz=64` : "";
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
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: {
  value: string;
  onChange: (v: string) => void;
  selected?: string[];
  onSelectedChange?: (urls: string[]) => void;
  helper?: string;
  onSort?: () => void;
  onCleanInvalid?: () => void;
  onShuffle?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}) {
  const uiLang = useUiLang();
  const [inboxExpanded, setInboxExpanded] = useState(false);

  const debouncedValue = useDebouncedValue(value, 180);

  // Parse URLs immediately from the live textarea value so the radar
  // and counts update as soon as the user pastes.
  const urls = useMemo(() => parseUrls(value), [value]);
  // Heavier per-line classification can stay debounced.
  const lineInfo = useMemo(() => classifyLines(debouncedValue), [debouncedValue]);

  const selectedSet = useMemo(() => new Set(selected ?? urls), [selected, urls]);

  const invalidLines = useMemo(() => {
    // count lines that contain text but no url
    return lineInfo.filter((x) => x.line.trim().length > 0 && x.urls.length === 0).length;
  }, [lineInfo]);

  const duplicates = useMemo(() => {
    const all = extractUrlsAll(debouncedValue);
    const counts = new Map<string, number>();
    for (const u of all) {
      const key = normalizeXUrl(u);
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    const dups = [...counts.entries()].filter(([,n]) => n > 1).map(([k,n]) => ({ url: k, count: n }));
    dups.sort((a,b) => b.count - a.count);
    return dups;
  }, [debouncedValue]);

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
    const s = String(debouncedValue || "");
    for (const m of s.matchAll(re)) {
      const u = String(m[1] || "");
      const lower = u.toLowerCase();
      const isX = lower.includes("x.com/") || lower.includes("twitter.com/");
      const isStatus = /\/status\/\d+/.test(lower) || /x\.com\/i\/status\/\d+/.test(lower);
      if (isX && !isStatus) {
        const clean = u.replace(/[)\]\},]+$/, "");
        if (!out.includes(clean)) out.push(clean);
      }
      if (out.length >= 3) break;
    }
    return out;
  }, [debouncedValue]);

  // Mobile keyboard: keep URL box in view when focused.
  const handleFocus = () => {
    if (typeof window === "undefined") return;
    try {
      const isSmall = window.innerWidth <= 768;
      if (!isSmall) return;
      const el = document.getElementById("ct-url-input");
      if (el && "scrollIntoView" in el) {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    } catch {
      // ignore
    }
  };

  const inbox = useMemo(() => {
    // Preserve order from the user's input.
    const ordered = extractUrlsAll(debouncedValue)
      .map((u) => normalizeXUrl(u))
      .filter((u, i, a) => a.indexOf(u) === i); // unique while preserving order

    const dupMap = new Map<string, number>();
    for (const u of extractUrlsAll(debouncedValue)) {
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
  }, [debouncedValue]);


  const hasAny = urls.length > 0 || invalidLines > 0;

  const selectedValidCount = useMemo(() => {
    const current = selected ?? urls;
    return current.filter((u) => urls.includes(u)).length;
  }, [selected, urls]);

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
    <div id="ct-url-input" className="rounded-[var(--ct-radius)] border border-[color:var(--ct-border)] bg-[color:var(--ct-panel)] p-4 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <label className="text-sm font-medium">{translate("label.tweetUrls", uiLang)}</label>
          <div className="text-xs opacity-70 -mt-0.5">{translate("hint.pasteXLinks", uiLang)}</div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            onClick={() => onUndo?.()}
            className={clsx("ct-btn ct-btn-sm", !canUndo ? "opacity-50 cursor-not-allowed" : "")}
            disabled={!canUndo}
            title="Undo"
          >
            Undo
          </button>
          <button
            onClick={() => onRedo?.()}
            className={clsx("ct-btn ct-btn-sm", !canRedo ? "opacity-50 cursor-not-allowed" : "")}
            disabled={!canRedo}
            title="Redo"
          >
            Redo
          </button>
          
<button
            onClick={() => {
              onCleanInvalid?.();
              toast.success(translate("urlBar.cleanInvalidToast", uiLang));
            }}
            className={clsx(
              "ct-btn ct-btn-sm",
              !hasAny ? "opacity-50 cursor-not-allowed" : "",
            )}
            disabled={!hasAny}
            title={translate("urlBar.cleanInvalidHint", uiLang)}
          >
            {translate("urlBar.cleanInvalid", uiLang)}
          </button>
          <button
            onClick={() => {
              onSort?.();
              toast.success(translate("urlBar.sortToast", uiLang));
            }}
            className={clsx(
              "ct-btn ct-btn-sm",
              urls.length < 2 ? "opacity-50 cursor-not-allowed" : "",
            )}
            disabled={urls.length < 2}
            title={translate("urlBar.sortHint", uiLang)}
          >
            {translate("urlBar.sortAZ", uiLang)}
          </button>
          <button
            onClick={() => {
              onShuffle?.();
              toast.success(translate("urlBar.shuffleToast", uiLang));
            }}
            className={clsx(
              "ct-btn ct-btn-sm",
              urls.length < 2 ? "opacity-50 cursor-not-allowed" : "",
            )}
            disabled={urls.length < 2}
            title={translate("urlBar.shuffleHint", uiLang)}
          >
            {translate("urlBar.shuffle", uiLang)}
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
        onFocus={handleFocus}
        placeholder="https://x.com/i/status/1234567890"
        inputMode="url"
        autoCapitalize="off"
        spellCheck={false}
      />


      {/* Smart preview chips (favicon + domain) */}
      {urls.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {urls.slice(0, 18).map((u) => {
            let host = "x.com";
            try { host = new URL(u).hostname.replace(/^www\./, ""); } catch {}
            const favicon = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`;
            return (
              <span
                key={u}
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px]"
                style={{ borderColor: "var(--ct-border)", background: "rgba(255,255,255,.04)" }}
                title={u}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={favicon} alt="" className="h-4 w-4 rounded-sm" />
                <span className="max-w-[180px] truncate opacity-90">{host}</span>
              </span>
            );
          })}
          {urls.length > 18 ? (
            <span className="text-[11px] opacity-60 self-center">+{urls.length - 18} more</span>
          ) : null}
        </div>
      ) : null}

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
      <div
        className={clsx(
          "mt-3 rounded-2xl border p-3",
          "border-[color:var(--ct-border)] bg-[color:var(--ct-surface)]",
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-xs font-semibold tracking-tight">
              {translate("urlInbox.title", uiLang)}
            </div>
            <div className="text-[11px] opacity-70">
              {translate("urlInbox.subtitle", uiLang)}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setInboxExpanded((v) => !v)}
              className="ml-1 grid h-8 w-8 place-items-center rounded-2xl border border-[color:var(--ct-border)] bg-black/10 hover:bg-black/20"
              title={
                inboxExpanded
                  ? translate("urlInbox.collapse", uiLang)
                  : translate("urlInbox.expand", uiLang)
              }
              aria-label={
                inboxExpanded
                  ? translate("urlInbox.collapse", uiLang)
                  : translate("urlInbox.expand", uiLang)
              }
            >
              <span
                className={clsx(
                  "block h-3 w-3 border-b border-l border-white/70 transition-transform",
                  inboxExpanded ? "-rotate-45" : "rotate-135",
                )}
              />
            </button>
          </div>
        </div>

        {inboxExpanded && (
          <>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex items-center gap-1 rounded-full bg-black/40 px-2 py-1 text-[11px]">
                <span className="font-mono opacity-80">{selectedSet.size}</span>
                <span className="opacity-70">
                  {translate("urlInbox.selected", uiLang)}
                </span>
                <span className="opacity-40">·</span>
                <span className="font-mono opacity-80">{inbox.length}</span>
                <span className="opacity-70">
                  {translate("urlInbox.detected", uiLang)}
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  className={clsx(
                    "ct-btn ct-btn-xs",
                    inbox.length ? "" : "opacity-50 cursor-not-allowed",
                  )}
                  disabled={!inbox.length}
                  onClick={() => {
                    const onlyValid = inbox.filter((x) => x.valid).map((x) => x.url);
                    onSelectedChange?.(onlyValid);
                    toast.success(translate("urlInbox.selectValidToast", uiLang));
                  }}
                >
                  {translate("urlInbox.selectValid", uiLang)}
                </button>
                <button
                  type="button"
                  className={clsx(
                    "ct-btn ct-btn-xs",
                    inbox.length ? "" : "opacity-50 cursor-not-allowed",
                  )}
                  disabled={!inbox.length}
                  onClick={() => {
                    onSelectedChange?.(inbox.map((x) => x.url));
                    toast(translate("urlInbox.selectAllToast", uiLang));
                  }}
                >
                  {translate("urlInbox.selectAll", uiLang)}
                </button>
                <button
                  type="button"
                  className={clsx(
                    "ct-btn ct-btn-xs",
                    selectedSet.size ? "" : "opacity-50 cursor-not-allowed",
                  )}
                  disabled={!selectedSet.size}
                  onClick={() => {
                    onSelectedChange?.([]);
                    toast(translate("urlInbox.clearSelectionToast", uiLang));
                  }}
                >
                  {translate("urlInbox.clearSelection", uiLang)}
                </button>

                <button
                  type="button"
                  className={clsx(
                    "ct-btn ct-btn-xs",
                    duplicates.length ? "" : "opacity-50 cursor-not-allowed",
                  )}
                  disabled={!duplicates.length}
                  onClick={removeDuplicates}
                >
                  {translate("urlInbox.removeDups", uiLang)}
                </button>

                <button
                  type="button"
                  className={clsx(
                    "ct-btn ct-btn-xs",
                    inbox.length < 2 ? "opacity-50 cursor-not-allowed" : "",
                  )}
                  disabled={inbox.length < 2}
                  onClick={() => {
                    const grouped = [...inbox]
                      .map((x) => x.url)
                      .sort(
                        (a, b) =>
                          domainOf(a).localeCompare(domainOf(b)) ||
                          a.localeCompare(b),
                      );
                    onChange(grouped.join("\n"));
                    toast.success(translate("urlInbox.groupByDomainToast", uiLang));
                  }}
                >
                  {translate("urlInbox.groupByDomain", uiLang)}
                </button>
              </div>
            </div>

            {/* Preview chips */}
            {inbox.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {inbox.slice(0, 24).map((x) => (
                  <span
                    key={x.url}
                    className={clsx(
                      "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px]",
                      "border-[color:var(--ct-border)] bg-white/5",
                    )}
                    title={x.url}
                  >
                    {faviconFor(x.url) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={faviconFor(x.url)} alt="" className="h-4 w-4 rounded" />
                    ) : null}
                    <span className="opacity-80">
                      {domainOf(x.url) || "link"}
                    </span>
                  </span>
                ))}
                {inbox.length > 24 ? (
                  <span className="text-[11px] opacity-60">
                    +{inbox.length - 24} {translate("urlInbox.more", uiLang)}
                  </span>
                ) : null}
              </div>
            ) : null}

            {inbox.length ? (
              <div className="mt-3 max-h-[220px] overflow-auto pr-1">
                <div className="space-y-2">
                  {inbox.slice(0, 60).map((row, i) => {
                    const checked = row.valid && selectedSet.has(row.url);
                    return (
                      <label
                        key={row.url}
                        draggable={row.valid}
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/plain", String(i));
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        onDragOver={(e) => {
                          if (!row.valid) return;
                          e.preventDefault();
                          e.dataTransfer.dropEffect = "move";
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          const from = Number.parseInt(
                            e.dataTransfer.getData("text/plain") || "-1",
                            10,
                          );
                          const to = i;
                          if (!Number.isFinite(from) || from < 0 || from === to) return;
                          const arr = inbox.map((x) => x.url);
                          const moved = arr.splice(from, 1)[0];
                          arr.splice(to, 0, moved);
                          onChange(arr.join("\n"));
                          toast(translate("urlInbox.reorderedToast", uiLang));
                        }}
                        className={clsx(
                          "flex items-start gap-3 rounded-2xl border px-3 py-2",
                          "border-white/10 bg-black/10",
                          row.valid ? "" : "border-red-500/25 opacity-70",
                        )}
                      >
                        <span
                          className={clsx(
                            "mt-0.5 select-none rounded-lg border px-1.5 py-0.5 text-[10px] opacity-70",
                            "border-white/10 bg-white/5",
                          )}
                          title={
                            row.valid
                              ? translate("urlInbox.dragHint", uiLang)
                              : translate("urlInbox.dragHintDisabled", uiLang)
                          }
                          aria-hidden
                        >
                          ⋮⋮
                        </span>
                        <input
                          type="checkbox"
                          className="mt-0.5 accent-white"
                          checked={checked}
                          disabled={!row.valid}
                          onChange={(e) => {
                            const next = new Set(selectedSet);
                            if (e.target.checked) next.add(row.url);
                            else next.delete(row.url);
                            onSelectedChange?.([...next]);
                          }}
                          aria-label={
                            checked
                              ? translate("urlInbox.deselectUrl", uiLang)
                              : translate("urlInbox.selectUrl", uiLang)
                          }
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] break-all opacity-85">
                            {row.url}
                          </div>
                          <div className="mt-0.5 flex flex-wrap gap-2 text-[10px]">
                            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5">
                              {faviconFor(row.url) ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={faviconFor(row.url)} alt="" className="h-3 w-3 rounded" />
                              ) : null}
                              <span className="opacity-80">
                                {domainOf(row.url) || "x.com"}
                              </span>
                            </span>
                            {row.duplicateCount > 1 ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] text-red-200">
                                {row.duplicateCount}×{" "}
                                {translate("urlInbox.duplicateTag", uiLang)}
                              </span>
                            ) : null}
                            {!row.valid ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] text-red-200">
                                {translate("urlInbox.invalidTag", uiLang)}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

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
