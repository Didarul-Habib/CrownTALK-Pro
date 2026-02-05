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
}: {
  item: ResultItem;
  onReroll: () => void;
  onCopy?: (text: string, url?: string) => void;
}) {
  const [copiedKey, setCopiedKey] = useState<string>("");
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  function markCopied(key: string) {
    setCopiedKey(key);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setCopiedKey(""), 1400);
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
        <button type="button" className="ct-btn ct-btn-xs" onClick={onReroll}>
          <RotateCcw className="h-4 w-4 opacity-80" />
          Reroll
        </button>
      </div>

      {item.status !== "ok" ? (
        <div className="text-sm">
          <span className="inline-flex items-center rounded-full px-2 py-1 text-xs mr-2 border border-[color:var(--ct-border)] bg-white/5">
            {String(item.status).toUpperCase()}
          </span>
          <span className="opacity-80">{item.reason || "No details"}</span>
        </div>
      ) : null}

      {item.comments?.map((c, idx) => {
        const key = `c-${idx}`;
        const isCopied = copiedKey === key;
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
          <div className="text-sm leading-6 whitespace-pre-wrap break-words">{c.text}</div>
          <div className="flex items-center justify-between">
            <div className="text-xs opacity-70">{c.provider ? `via ${c.provider}` : ""}</div>
            <button
              type="button"
              className={clsx("ct-btn ct-btn-xs", isCopied ? "ct-btn-primary" : "")}
              onClick={() => {
                copyText(c.text);
                markCopied(key);
                onCopy?.(c.text, item.url);
              }}
            >
              {isCopied ? (
                <Check className="h-4 w-4 opacity-90" />
              ) : (
                <Copy className="h-4 w-4 opacity-80" />
              )}
              {isCopied ? "Copied" : "Copy"}
            </button>
          </div>

          {c.alternates && c.alternates.length ? (
            <details className="text-sm">
              <summary className="cursor-pointer text-xs opacity-85">Alternates</summary>
              <div className="mt-2 space-y-2">
                {c.alternates.map((a, j) => {
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
                    <div className="mt-2">
                      <button
                        type="button"
                        className={clsx("ct-btn ct-btn-xs", aCopied ? "ct-btn-primary" : "")}
                        onClick={() => {
                          copyText(a);
                          markCopied(aKey);
                          onCopy?.(a, item.url);
                        }}
                      >
                        {aCopied ? (
                          <Check className="h-4 w-4 opacity-90" />
                        ) : (
                          <Copy className="h-4 w-4 opacity-80" />
                        )}
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
    </div>
  );
}
