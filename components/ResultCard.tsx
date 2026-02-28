"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { RotateCcw, Copy, ExternalLink, Check } from "lucide-react";
import type { ResultItem } from "@/lib/types";
import { getQualityInfo } from "@/lib/quality";

function copyText(text: string) {
  navigator.clipboard.writeText(text).catch(() => {});
  // Subtle haptic confirmation on mobile (safe no-op on unsupported devices).
  try {
    (navigator as any)?.vibrate?.(10);
  } catch {}
}

function getDisplayUrl(item: ResultItem): string | undefined {
  const raw = item.input_url || item.url;
  const handle = item.handle;
  const tweetId = item.tweet_id;

  if (raw && raw.startsWith("https://x.com/") && handle && tweetId) {
    const cleanHandle =
      (handle || "")
        .replace(/^@/, "")
        .trim() || "i";
    return `https://x.com/${cleanHandle}/status/${tweetId}`;
  }

  if (!raw) return "";

  try {
    const u = new URL(raw);
    if (u.hostname.includes("twitter.com")) {
      u.hostname = "x.com";
    }
    // If we have an /i/status URL and a handle, normalise to /handle/status
    if (u.hostname === "x.com" && u.pathname.startsWith("/i/status/") && handle && tweetId) {
      const cleanHandle =
        (handle || "")
          .replace(/^@/, "")
          .trim() || "i";
      u.pathname = `/${cleanHandle}/status/${tweetId}`;
    }
    return u.toString();
  } catch {
    return raw;
  }
}


export default function ResultCard({
  item,
  onReroll,
  onCopy,
  onRetry,
  warnSimilar,
  warnSpam,
  onUpdateCommentMeta,
}: {
  item: ResultItem;
  onReroll: () => void;
  onCopy?: (text: string, url?: string) => void;
  onRetry?: () => void;
  warnSimilar?: { score: number; withUrl?: string } | null;
  warnSpam?: string | null;
  onUpdateCommentMeta?: (url: string, index: number, patch: { text?: string; is_locked?: boolean }) => void;
}) {
  const [copiedKey, setCopiedKey] = useState<string>("");
const [editingKey, setEditingKey] = useState<string>("");
const [actionsKey, setActionsKey] = useState<string>("");

const [texts, setTexts] = useState<string[]>(() =>
  (item.comments || []).map((c: any) => String(c?.text ?? c ?? ""))
);
const [locked, setLocked] = useState<boolean[]>(() =>
  (item.comments || []).map((c: any) => Boolean((c as any)?.is_locked))
);

const timerRef = useRef<number | null>(null);
const longPressTimerRef = useRef<number | null>(null);
  const hasComments = (item.comments || []).some((c: any) => {
    const t = String(c?.text ?? c ?? "");
    return t.trim().length > 0;
  });
  const showSkeleton = item.status === "pending" && !hasComments;

  const tweetPreview = (item as any).tweet as any | undefined;
  const project = (item as any).project as any | null | undefined;

  useEffect(() => {
    // Reset local editable text when the item changes (reroll/retry)
    setTexts((item.comments || []).map((c: any) => String(c?.text ?? c ?? "")));
    setLocked((item.comments || []).map((c: any) => Boolean((c as any)?.is_locked)));
    setEditingKey("");
  }, [item.url, item.status]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      if (longPressTimerRef.current) window.clearTimeout(longPressTimerRef.current);
    };
  }, []);

  function markCopied(key: string) {
  // Persistent until another copy happens (unmistakable)
  setCopiedKey(key);
  if (timerRef.current) window.clearTimeout(timerRef.current);
  timerRef.current = window.setTimeout(() => {
    setCopiedKey("");
  }, 1800);
}

function handleCardClick(key: string, currentText: string) {
  if (editingKey === key) return;
  if (!currentText.trim()) return;
  if (actionsKey === key) return;
  copyText(currentText);
  markCopied(key);
  onCopy?.(currentText, item.url);
}

function startLongPress(key: string) {
  if (longPressTimerRef.current) window.clearTimeout(longPressTimerRef.current);
  longPressTimerRef.current = window.setTimeout(() => {
    setActionsKey(key);
  }, 450);
}

function cancelLongPress() {
  if (longPressTimerRef.current) {
    window.clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = null;
  }
}


  return (
    <div className={clsx("ct-anim-soft rounded-[var(--ct-radius)] border border-[color:var(--ct-border)] bg-[color:var(--ct-surface-elevated)] p-3 space-y-3 shadow-[0_14px_40px_rgba(0,0,0,0.55)] backdrop-blur-md", showSkeleton && "min-h-[120px]")}>
      <div className="flex items-start justify-between gap-3">
        <a
          href={getDisplayUrl(item) || item.url}
          target="_blank"
          rel="noreferrer"
          className="text-sm underline underline-offset-4 break-all hover:opacity-90 inline-flex items-center gap-2"
        >
          <ExternalLink className="h-4 w-4 opacity-70" />
          {getDisplayUrl(item) || item.url}
        </a>
        {Array.isArray(item.comments) && item.comments.length > 1 && (
          <span className="ml-2 inline-flex items-center rounded-full bg-black/30 px-2 py-0.5 text-[11px] opacity-75">
            {item.comments.length} variants
          </span>
        )}
        <button
          type="button"
          className="ct-btn ct-btn-xs"
          onClick={onReroll}
          aria-label="Reroll this URL"
        >
          <RotateCcw className="h-4 w-4 opacity-80" />
          Reroll
        </button>
      </div>

      {/* CT-native tags: cashtags, house view, risk */}
      {(item.cashtags && item.cashtags.length > 0) || item.house_view_active || item.risk_level ? (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] opacity-75">
          {item.cashtags && item.cashtags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1">
              {item.cashtags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center rounded-full bg-black/30 px-2 py-0.5 text-[11px]"
                >
                  <span className="opacity-70">$</span>
                  <span className="ml-0.5">{tag.replace(/^\$/i, "")}</span>
                </span>
              ))}
            </div>
          )}
          {item.house_view_active && (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-200"
              title="House view guardrails applied for this project"
            >
              <Shield className="h-3 w-3" />
              <span>House view</span>
            </span>
          )}
          {item.risk_level && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5">
              <span className="opacity-70">
                {item.risk_level === "high"
                  ? "Risk: high hype"
                  : item.risk_level === "balanced"
                  ? "Risk: balanced"
                  : "Risk: low"}
              </span>
            </span>
          )}
        </div>
      )}

      {/* Per-URL micro state: pipeline + mode */}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] opacity-75">
        <div className="inline-flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-black/30 px-2 py-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>Fetch</span>
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-black/30 px-2 py-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
            <span>Generate</span>
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-black/30 px-2 py-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-300" />
            <span>Polish</span>
          </span>
          {item.fetch_mode === "fallback" && (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-amber-200"
              title="Fallback context used for this URL"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              <span>Fallback context</span>
            </span>
          )}
        </div>

        <div className="inline-flex items-center gap-1 rounded-full bg-black/30 px-2 py-0.5">
          <span className="uppercase tracking-wide">
            {(item.lang_native && item.lang_native !== "en") ? item.lang_native : "EN"}
          </span>
          <span>•</span>
          <span>
            {item.quality_mode === "fast"
              ? "Fast"
              : item.quality_mode === "pro"
              ? "Pro"
              : "Balanced"}
          </span>
        </div>
      </div>

      {(project || tweetPreview?.text) && item.status === "ok" ? (
        <div className="flex flex-wrap items-center gap-2">
          {project?.handle ? (
            <span
              className="ct-chip text-[11px] border border-[color:var(--ct-border)] bg-white/5"
              title={project?.file ? `Matched from: ${project.file}` : "Matched project profile"}
            >
              Project: {String(project.handle)}
            </span>
          ) : null}
          {tweetPreview?.entities?.cashtags?.length ? (
            <span className="ct-chip text-[11px] border border-[color:var(--ct-border)] bg-white/5" title="Cashtags found in the tweet">
              {tweetPreview.entities.cashtags.slice(0, 3).join(" ")}
            </span>
          ) : null}
          {tweetPreview?.lang ? (
            <span className="ct-chip text-[11px] border border-[color:var(--ct-border)] bg-white/5" title="Tweet language hint">
              Lang: {tweetPreview.lang.toUpperCase()}
            </span>
          ) : null}
        </div>
      ) : null}

      {(warnSimilar || warnSpam) && item.status === "ok" ? (
        <div className="flex flex-wrap gap-2">
          {warnSimilar ? (
            <span
              className="ct-chip text-[11px] border border-yellow-400/30 bg-yellow-400/10 text-yellow-100"
              title={
                warnSimilar.withUrl
                  ? `Similar to: ${warnSimilar.withUrl}`
                  : "Looks similar to another reply"
              }
            >
              Similar ({Math.round(warnSimilar.score * 100)}%)
            </span>
          ) : null}
          {warnSpam ? (
            <span
              className="ct-chip text-[11px] border border-red-400/30 bg-red-400/10 text-red-100"
              title={warnSpam}
            >
              Might feel spammy
            </span>
          ) : null}
        </div>
      ) : null}

      {item.status === "error" ? (
        <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs">
          <div className="font-semibold text-red-100">Generation failed</div>
          <div className="mt-1 opacity-80">
            {item.error_message || "The model failed to generate a reply for this URL."}
          </div>
          {onRetry ? (
            <button
              type="button"
              className="ct-btn ct-btn-xs mt-2"
              onClick={onRetry}
              aria-label="Retry this URL"
            >
              Retry
            </button>
          ) : null}
        </div>
      ) : null}

      {showSkeleton ? (
        <div className="space-y-2">
          <div className="h-10 w-full rounded-2xl bg-[color:var(--ct-skeleton)]" />
          <div className="h-6 w-1/2 rounded-full bg-[color:var(--ct-skeleton)]" />
        </div>
      ) : null}

            {item.status === "pending" && !(item.comments && item.comments.length) ? null : (
        <>
          {(item.comments || []).map((c: any, idx: number) => {
            const key = `c-${idx}`;
            const isCopied = copiedKey === key;
            const editing = editingKey === key;
            const currentText = texts[idx] ?? String(c?.text ?? c ?? "");
            const translationEn =
              typeof c?.translation_en === "string" && c.translation_en.trim().length
                ? c.translation_en.trim()
                : undefined;
            const quality = getQualityInfo(currentText, { lang_native: (item as any).lang_native });
            const badges = quality.badges.slice(0, 3);

            return (
              <div
                key={idx}
                className={clsx(
                  "rounded-2xl border bg-[color:var(--ct-surface)] p-3 space-y-2",
                  "border-[color:var(--ct-border)]",
                  isCopied
                    ? "border-[color:var(--ct-accent)] shadow-[0_0_0_1px_color-mix(in_srgb,var(--ct-accent)_35%,transparent)]"
                    : ""
                )}
                onClick={() => handleCardClick(key, currentText)}
                onTouchStart={() => {
                  if (!editing) startLongPress(key);
                }}
                onTouchEnd={cancelLongPress}
                onTouchMove={cancelLongPress}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setActionsKey(key);
                }}
              >
                <div className="text-sm leading-6 whitespace-pre-wrap break-words">{currentText}</div>

                {!editing && translationEn ? (
                  <div className="mt-1 text-xs opacity-70 whitespace-pre-wrap break-words">
                    {translationEn}
                  </div>
                ) : null}

                {editing ? (
                  <div className="pt-2 space-y-2">
                    <textarea
                      value={currentText}
                      onChange={(e) => {
                        const v = e.target.value;
                        setTexts((prev) => {
                          const next = [...prev];
                          next[idx] = v;
                          return next;
                        });
                      }}
                      className={clsx(
                        "w-full min-h-[96px] rounded-2xl border px-3 py-2 text-sm outline-none",
                        "bg-black/10 border-[color:var(--ct-border)]"
                      )}
                    />
                    <div className="text-[11px] opacity-70">
                      Inline edits are local (saved in your browser). Use Copy to export.
                    </div>
                  </div>
                ) : null}

                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-1 text-xs">
                    <div className="opacity-70">
                      {c?.provider ? `via ${c.provider}` : ""}
                    </div>
                    {badges.length ? (
                      <div className="flex flex-wrap gap-1">
                        {badges.map((b) => (
                          <span
                            key={b}
                            className={clsx(
                              "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] tracking-wide uppercase",
                              b === "factSafe"
                                ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/40"
                                : b === "lowHype"
                                ? "bg-sky-500/10 text-sky-300 border border-sky-500/40"
                                : "bg-violet-500/10 text-violet-300 border border-violet-500/40"
                            )}
                          >
                            {b === "factSafe"
                              ? "FACT-SAFE"
                              : b === "lowHype"
                              ? "LOW HYPE"
                              : "NATIVE TONE"}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className={clsx(
                        "ct-btn ct-btn-xs min-w-[72px] transition-transform hover:scale-[1.02] active:scale-95",
                        editing ? "ct-btn-primary" : ""
                      )}
                      onClick={() => {
                        setEditingKey((v) => {
                          const nextKey = v === key ? "" : key;
                          // When leaving edit mode, push edited text up.
                          if (v === key && onUpdateCommentMeta) {
                            onUpdateCommentMeta(item.url, idx, { text: currentText });
                          }
                          return nextKey;
                        });
                      }}
                      aria-label="Edit this comment"
                      title="Edit"
                    >
                      {editing ? "Done" : "Edit"}
                    </button>

                    <button
                      type="button"
                      className={clsx(
                        "ct-btn ct-btn-xs min-w-[72px] transition-transform hover:scale-[1.02] active:scale-95",
                        locked[idx] ? "ct-btn-primary" : ""
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        setLocked((prev) => {
                          const next = [...prev];
                          next[idx] = !next[idx];
                          const newLocked = !prev[idx];
                          if (onUpdateCommentMeta) {
                            onUpdateCommentMeta(item.url, idx, { is_locked: newLocked });
                          }
                          return next;
                        });
                      }}
                      aria-label={locked[idx] ? "Unlock this comment" : "Lock this comment"}
                      title={locked[idx] ? "Unlock" : "Lock"}
                    >
                      <span className="text-xs">{locked[idx] ? "Locked" : "Lock"}</span>
                    </button>

                    <button
                      type="button"
                      className={clsx(
                        "ct-btn ct-btn-xs min-w-[72px] transition-transform hover:scale-[1.02] active:scale-95",
                        isCopied ? "ct-btn-primary" : ""
                      )}
                      onClick={() => {
                        copyText(currentText);
                        markCopied(key);
                        onCopy?.(currentText, item.url);
                      }}
                    >
                      {isCopied ? (
                        <Check className="h-4 w-4 opacity-90" />
                      ) : (
                        <Copy className="h-4 w-4 opacity-80" />
                      )}
                      <span className="ml-1">{isCopied ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                </div>

                {actionsKey === key && (
                  <div
                    className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/40"
                    onClick={() => setActionsKey("")}
                  >
                    <div
                      className="w-full max-w-sm rounded-t-3xl sm:rounded-3xl bg-[color:var(--ct-surface-elevated)] border border-[color:var(--ct-border)] p-4 space-y-2 shadow-xl"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="text-xs font-semibold opacity-80 mb-2">Actions</div>

                      <button
                        type="button"
                        className="ct-btn ct-btn-sm w-full justify-start"
                        onClick={() => {
                          handleCardClick(key, currentText);
                          setActionsKey("");
                        }}
                      >
                        <Copy className="h-4 w-4 opacity-80" />
                        <span className="ml-2">Copy</span>
                      </button>

                      <button
                        type="button"
                        className="ct-btn ct-btn-sm w-full justify-start"
                        onClick={() => {
                          const u = (item as any).display_url || item.url;
                          if (u) window.open(u, "_blank", "noopener,noreferrer");
                          setActionsKey("");
                        }}
                      >
                        <ExternalLink className="h-4 w-4 opacity-80" />
                        <span className="ml-2">Open on X</span>
                      </button>

                      <button
                        type="button"
                        className="ct-btn ct-btn-sm w-full justify-start"
                        onClick={() => {
                          setActionsKey("");
                          onReroll();
                        }}
                      >
                        <RotateCcw className="h-4 w-4 opacity-80" />
                        <span className="ml-2">Reroll</span>
                      </button>

                      {onRetry && (
                        <button
                          type="button"
                          className="ct-btn ct-btn-sm w-full justify-start"
                          onClick={() => {
                            setActionsKey("");
                            onRetry();
                          }}
                        >
                          <RotateCcw className="h-4 w-4 opacity-80" />
                          <span className="ml-2">Retry</span>
                        </button>
                      )}

                      <button
                        type="button"
                        className="ct-btn ct-btn-ghost w-full justify-center text-xs opacity-80"
                        onClick={() => setActionsKey("")}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}