"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { RotateCcw, Copy, ExternalLink, Check } from "lucide-react";
import type { ResultItem } from "@/lib/types";

function copyText(text: string) {
  navigator.clipboard.writeText(text).catch(() => {});
  // Subtle haptic confirmation on mobile (safe no-op on unsupported devices).
  try {
    (navigator as any)?.vibrate?.(10);
  } catch {}
}

export default function ResultCard({
  item,
  onReroll,
  onCopy,
  onRetry,
  warnSimilar,
  warnSpam,
}: {
  item: ResultItem;
  onReroll: () => void;
  onCopy?: (text: string, url?: string) => void;
  onRetry?: () => void;
  warnSimilar?: { score: number; withUrl?: string } | null;
  warnSpam?: string | null;
}) {
  const [copiedKey, setCopiedKey] = useState<string>("");
  const [editingKey, setEditingKey] = useState<string>("");
  const [texts, setTexts] = useState<string[]>(() =>
    (item.comments || []).map((c: any) => String(c?.text ?? c ?? ""))
  );
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    // Reset local editable text when the item changes (reroll/retry)
    setTexts((item.comments || []).map((c: any) => String(c?.text ?? c ?? "")));
    setEditingKey("");
  }, [item.url, item.status]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  function markCopied(key: string) {
    // Persistent until another copy happens (unmistakable)
    setCopiedKey(key);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = null;
  }

  return (
    <div className="rounded-[var(--ct-radius)] border border-[color:var(--ct-border)] bg-[color:var(--ct-panel)] p-4 space-y-3 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <a
          href={item.url}
          target="_blank"
          rel="noreferrer"
          className="text-sm underline underline-offset-4 break-all hover:opacity-90 inline-flex items-center gap-2"
        >
          <ExternalLink className="h-4 w-4 opacity-70" />
          {item.url}
        </a>
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

      {item.timeline && item.timeline.length ? (
        <details className="rounded-2xl border border-white/10 bg-black/10 p-3">
          <summary className="cursor-pointer text-xs opacity-80">Timeline</summary>
          <div className="mt-2 space-y-1 text-[11px] opacity-80">
            {item.timeline.slice(-10).map((ev, i) => (
              <div key={i} className="flex items-center justify-between gap-3">
                <span className="capitalize">{ev.stage.replace(/_/g, " ")}</span>
                <span className="font-mono opacity-70">
                  {new Date(ev.at).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </details>
      ) : null}

      {(warnSimilar || warnSpam) && item.status === "ok" ? (
        <details className="rounded-2xl border border-white/10 bg-black/10 p-3">
          <summary className="cursor-pointer text-xs opacity-80">Why flagged?</summary>
          <div className="mt-2 space-y-2 text-[11px] opacity-80">
            {warnSpam ? (
              <div>
                <div className="font-semibold">Spam signal</div>
                <div className="opacity-80">{warnSpam}</div>
                <div className="mt-1 opacity-70">
                  Tip: reduce clichés, remove excessive praise, add a specific detail from the post.
                </div>
              </div>
            ) : null}
            {warnSimilar ? (
              <div>
                <div className="font-semibold">Similarity signal</div>
                <div className="opacity-80">
                  This reply is {Math.round(warnSimilar.score * 100)}% similar to another reply
                  {warnSimilar.withUrl ? ` (${warnSimilar.withUrl})` : ""}.
                </div>
                <div className="mt-1 opacity-70">
                  Tip: change the opening line, add a unique angle, or ask a different question.
                </div>
              </div>
            ) : null}
          </div>
        </details>
      ) : null}

      {item.status === "pending" ? (
        <div className="space-y-2">
          <div className="ct-skeleton rounded-2xl p-3">
            <div className="h-3 w-1/3 rounded-full bg-white/10" />
            <div className="mt-3 h-8 rounded-2xl bg-white/10" />
            <div className="mt-2 h-8 rounded-2xl bg-white/10" />
          </div>
        </div>
      ) : null}

      {item.status !== "ok" && item.status !== "pending" ? (
        <div className="text-sm">
          <span className="inline-flex items-center rounded-full px-2 py-1 text-xs mr-2 border border-[color:var(--ct-border)] bg-white/5">
            {String(item.status).toUpperCase()}
          </span>
          <span className="opacity-80">{item.reason || "No details"}</span>
          {onRetry ? (
            <button type="button" className="ct-btn ct-btn-xs ml-2" onClick={onRetry}>
              Retry
            </button>
          ) : null}
        </div>
      ) : null}

      {item.status === "pending" ? null : (
        <>
          {(item.comments || []).map((c: any, idx: number) => {
            const key = `c-${idx}`;
            const isCopied = copiedKey === key;
            const editing = editingKey === key;
            const currentText = texts[idx] ?? String(c?.text ?? c ?? "");
            return (
              <div
                key={idx}
                className={clsx(
                  "rounded-2xl border bg-[color:var(--ct-surface)] p-3 space-y-2",
                  "border-[color:var(--ct-border)]",
                  isCopied
                    ? "border-[color:var(--ct-accent)] shadow-[0_18px_60px_rgba(0,0,0,.45),0_0_0_1px_color-mix(in_srgb,var(--ct-accent)_35%,transparent)]"
                    : ""
                )}
              >
                <div className="text-sm leading-6 whitespace-pre-wrap break-words">{currentText}</div>

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
                  <div className="text-xs opacity-70">{c?.provider ? `via ${c.provider}` : ""}</div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className={clsx("ct-btn ct-btn-xs", editing ? "ct-btn-primary" : "")}
                      onClick={() => setEditingKey((v) => (v === key ? "" : key))}
                      aria-label="Edit this comment"
                      title="Edit"
                    >
                      {editing ? "Done" : "Edit"}
                    </button>

                    <button
                      type="button"
                      className={clsx("ct-btn ct-btn-xs", isCopied ? "ct-btn-primary" : "")}
                      onClick={() => {
                        copyText(currentText);
                        markCopied(key);
                        onCopy?.(currentText, item.url);
                      }}
                    >
                      {isCopied ? <Check className="h-4 w-4 opacity-90" /> : <Copy className="h-4 w-4 opacity-80" />}
                      {isCopied ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>

                {Array.isArray(c?.alternates) && c.alternates.length ? (
                  <details className="text-sm">
                    <summary className="cursor-pointer text-xs opacity-85">Alternates</summary>
                    <div className="mt-2 space-y-2">
                      {c.alternates.map((a: string, j: number) => {
                        const aKey = `a-${idx}-${j}`;
                        const aCopied = copiedKey === aKey;
                        return (
                          <div
                            key={j}
                            className={clsx(
                              "rounded-2xl border bg-black/10 p-2",
                              "border-[color:var(--ct-border)]",
                              aCopied
                                ? "border-[color:var(--ct-accent)] shadow-[0_18px_60px_rgba(0,0,0,.40),0_0_0_1px_color-mix(in_srgb,var(--ct-accent)_30%,transparent)]"
                                : ""
                            )}
                          >
                            <div className="whitespace-pre-wrap text-sm">{a}</div>
                            <div className="mt-2 flex items-center gap-2">
                              <button
                                type="button"
                                className="ct-btn ct-btn-xs"
                                onClick={() => {
                                  setTexts((prev) => {
                                    const next = [...prev];
                                    next[idx] = a;
                                    return next;
                                  });
                                  setEditingKey(`c-${idx}`);
                                }}
                                title="Replace the main reply with this alternate"
                              >
                                Swap into reply
                              </button>
                              <button
                                type="button"
                                className={clsx("ct-btn ct-btn-xs", aCopied ? "ct-btn-primary" : "")}
                                onClick={() => {
                                  copyText(a);
                                  markCopied(aKey);
                                  onCopy?.(a, item.url);
                                }}
                              >
                                {aCopied ? <Check className="h-4 w-4 opacity-90" /> : <Copy className="h-4 w-4 opacity-80" />}
                                {aCopied ? "Copied" : "Copy"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </details>
                ) : null}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
