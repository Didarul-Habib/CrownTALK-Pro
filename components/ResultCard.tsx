"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { RotateCcw, Copy, ExternalLink, Check, AlertTriangle } from "lucide-react";
import type { ResultItem } from "@/lib/types";
import { getQualityInfo } from "@/lib/quality";

type Props = {
  item: ResultItem;
  onReroll: () => void;
  onCopy?: (text: string, url?: string) => void;
  onRetry?: () => void;
  warnSimilar?: { score: number; withUrl?: string } | null;
  warnSpam?: string | null;
};

function copyText(text: string) {
  navigator.clipboard.writeText(text).catch(() => {});
  // Subtle haptic confirmation on mobile (safe no-op on unsupported devices).
  try {
    (navigator as any)?.vibrate?.(10);
  } catch {
    // ignore
  }
}

function getDisplayUrl(item: ResultItem): string {
  const raw = item.input_url || item.url;
  const tweetId = item.tweet_id;
  const handle = item.handle || item.tweet?.handle || item.project?.handle;

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
    return u.toString();
  } catch {
    return raw;
  }
}

function getPrimaryText(item: ResultItem): string {
  const first = item.comments?.[0];
  if (!first) return "";
  const t = typeof first === "string" ? first : first.text ?? "";
  return String(t).trim();
}

export default function ResultCard({
  item,
  onReroll,
  onCopy,
  onRetry,
  warnSimilar,
  warnSpam,
}: Props) {
  const [localText, setLocalText] = useState<string>(() => getPrimaryText(item));
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Reset local editable text when the item changes (reroll/retry)
  useEffect(() => {
    setLocalText(getPrimaryText(item));
    setIsEditing(false);
    setCopied(false);
  }, [item.url, item.status]);

  const hasComments = useMemo(
    () => (item.comments || []).some((c: any) => String(c?.text ?? c ?? "").trim().length > 0),
    [item.comments]
  );

  const showSkeleton = item.status === "pending" && !hasComments;

  const tweetPreview = item.tweet;
  const project = item.project;

  const qualityBadges = useMemo(() => {
    const text = localText || getPrimaryText(item);
    const info = getQualityInfo({ text, lang_native: item.lang_native || undefined });
    return info.badges;
  }, [item, localText]);

  const cashtags = tweetPreview?.entities?.cashtags || [];

  const handleCopy = () => {
    const text = localText || getPrimaryText(item);
    if (!text.trim()) return;
    copyText(text);
    setCopied(true);
    onCopy?.(text, item.url);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const displayUrl = getDisplayUrl(item);

  const statusIsError = item.status === "error";
  const statusIsOk = item.status === "ok";

  return (
    <div
      className={clsx(
        "rounded-[var(--ct-radius)] border border-[color:var(--ct-border)] bg-[color:var(--ct-surface-elevated)] p-3 space-y-3",
        "shadow-[0_18px_60px_rgba(0,0,0,0.55)] backdrop-blur-md lg:backdrop-blur-xl",
        showSkeleton && "opacity-70"
      )}
    >
      {/* Header: URL + primary actions */}
      <div className="flex items-start justify-between gap-3">
        <a
          href={displayUrl || item.url}
          target="_blank"
          rel="noreferrer"
          className="text-sm underline underline-offset-4 break-all hover:opacity-90 inline-flex items-center gap-2"
        >
          <ExternalLink className="h-4 w-4 opacity-70" />
          {displayUrl || item.url}
        </a>
        <div className="flex flex-wrap items-center gap-2">
          {statusIsError && (
            <span className="ct-chip border border-red-500/40 bg-red-500/10 text-[11px] text-red-100">
              Error
            </span>
          )}
          {statusIsOk && (
            <span className="ct-chip border border-emerald-500/40 bg-emerald-500/10 text-[11px] text-emerald-100">
              Ready
            </span>
          )}
          {qualityBadges.map((b) => (
            <span
              key={b}
              className="ct-chip text-[11px] border border-[color:var(--ct-border)] bg-white/5 uppercase tracking-wide"
            >
              {b}
            </span>
          ))}
        </div>
      </div>

      {/* Tweet / project context row */}
      {(project || tweetPreview?.text || cashtags.length > 0) && statusIsOk && (
        <div className="flex flex-wrap items-center gap-2 text-[11px] opacity-80">
          {project?.handle && (
            <span
              className="ct-chip border border-[color:var(--ct-border)] bg-white/5"
              title={project?.file ? `Matched from: ${project.file}` : "Matched project profile"}
            >
              {project.handle}
            </span>
          )}
          {cashtags.map((tag) => (
            <span
              key={tag}
              className="ct-chip border border-[color:var(--ct-border)] bg-[color:var(--ct-surface)] text-[11px]"
            >
              ${tag}
            </span>
          ))}
          {tweetPreview?.text && (
            <span className="truncate text-[11px] opacity-70">
              {tweetPreview.text.slice(0, 120)}
              {tweetPreview.text.length > 120 ? "…" : ""}
            </span>
          )}
        </div>
      )}

      {/* Main comment area */}
      <div className="space-y-2">
        {statusIsError ? (
          <div className="flex items-start gap-2 text-xs text-red-100">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-none" />
            <div>
              <div className="font-medium">Generation failed</div>
              <div className="opacity-80">
                {item.error_message || item.reason || "The model failed to generate a reply for this URL."}
              </div>
              {onRetry && (
                <button
                  type="button"
                  className="ct-btn ct-btn-xs mt-2"
                  onClick={onRetry}
                  aria-label="Retry this URL"
                >
                  Retry
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <textarea
              className={clsx(
                "w-full resize-none rounded-2xl border bg-[color:var(--ct-surface)] p-3 text-sm leading-snug",
                "border-[color:var(--ct-border)] focus:outline-none focus:ring-1 focus:ring-[color:var(--ct-accent)]",
                showSkeleton && "opacity-70"
              )}
              rows={2}
              value={localText}
              onChange={(e) => {
                setLocalText(e.target.value);
                setIsEditing(true);
              }}
              placeholder={showSkeleton ? "Generating comment..." : "Generated reply will appear here"}
            />
            {(warnSimilar || warnSpam) && statusIsOk && (
              <div className="flex flex-wrap gap-2 text-[11px]">
                {warnSimilar && (
                  <span
                    className="ct-chip border border-yellow-400/30 bg-yellow-400/10 text-yellow-100"
                    title={
                      warnSimilar.withUrl
                        ? `Similar to: ${warnSimilar.withUrl}`
                        : "Looks similar to another reply"
                    }
                  >
                    Similar ({Math.round(warnSimilar.score * 100)}%)
                  </span>
                )}
                {warnSpam && (
                  <span
                    className="ct-chip border border-orange-400/30 bg-orange-400/10 text-orange-100"
                    title={warnSpam}
                  >
                    Pattern risk
                  </span>
                )}
                {isEditing && (
                  <span className="ct-chip border border-[color:var(--ct-border)] bg-white/5">
                    Edited
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="ct-btn ct-btn-xs"
            onClick={onReroll}
            aria-label="Reroll this URL"
          >
            <RotateCcw className="h-4 w-4 opacity-80" />
            Reroll
          </button>

          <button
            type="button"
            className={clsx(
              "ct-btn ct-btn-xs min-w-[84px]",
              copied ? "ct-btn-primary" : ""
            )}
            onClick={handleCopy}
            aria-label="Copy reply text"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 opacity-90" />
                <span className="ml-1">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 opacity-80" />
                <span className="ml-1">Copy</span>
              </>
            )}
          </button>
        </div>

        {item.latency_ms != null && (
          <div className="text-[11px] opacity-70">
            {Math.round(item.latency_ms)} ms
          </div>
        )}
      </div>
    </div>
  );
}
