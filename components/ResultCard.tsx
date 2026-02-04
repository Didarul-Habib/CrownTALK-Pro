"use client";

import clsx from "clsx";
import { RotateCcw, Copy, ExternalLink } from "lucide-react";
import type { ResultItem } from "@/lib/types";

function copyText(text: string) {
  navigator.clipboard.writeText(text).catch(() => {});
}

export default function ResultCard({
  item,
  onReroll,
}: {
  item: ResultItem;
  onReroll: () => void;
}) {
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
          className={clsx(
            "text-xs rounded-2xl border px-3 py-2 transition inline-flex items-center gap-2",
            "bg-[color:var(--ct-surface)] border-[color:var(--ct-border)] hover:bg-white/5"
          )}
          onClick={onReroll}
        >
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

      {item.comments?.map((c, idx) => (
        <div
          key={idx}
          className="rounded-2xl border border-[color:var(--ct-border)] bg-[color:var(--ct-surface)] p-3 space-y-2"
        >
          <div className="text-sm leading-6 whitespace-pre-wrap">{c.text}</div>
          <div className="flex items-center justify-between">
            <div className="text-xs opacity-70">{c.provider ? `via ${c.provider}` : ""}</div>
            <button
              type="button"
              className={clsx(
                "text-xs rounded-2xl border px-3 py-2 transition inline-flex items-center gap-2",
                "bg-transparent border-[color:var(--ct-border)] hover:bg-white/5"
              )}
              onClick={() => copyText(c.text)}
            >
              <Copy className="h-4 w-4 opacity-80" />
              Copy
            </button>
          </div>

          {c.alternates && c.alternates.length ? (
            <details className="text-sm">
              <summary className="cursor-pointer text-xs opacity-85">Alternates</summary>
              <div className="mt-2 space-y-2">
                {c.alternates.map((a, j) => (
                  <div key={j} className="rounded-2xl border border-[color:var(--ct-border)] bg-black/10 p-2">
                    <div className="whitespace-pre-wrap text-sm">{a}</div>
                    <div className="mt-2">
                      <button
                        type="button"
                        className={clsx(
                          "text-xs rounded-2xl border px-3 py-2 transition inline-flex items-center gap-2",
                          "bg-transparent border-[color:var(--ct-border)] hover:bg-white/5"
                        )}
                        onClick={() => copyText(a)}
                      >
                        <Copy className="h-4 w-4 opacity-80" />
                        Copy
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </details>
          ) : null}
        </div>
      ))}
    </div>
  );
}
