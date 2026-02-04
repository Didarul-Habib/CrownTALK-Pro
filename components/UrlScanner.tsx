"use client";

import { useMemo } from "react";

/**
 * Premium "radar" indicator inspired by the legacy frontend.
 * Shows a scanning ring + dots based on how many URLs are queued.
 */
export default function UrlScanner({
  valid,
  invalid,
  maxDots = 14,
}: {
  valid: number;
  invalid: number;
  /** caps visual dots so 200 URLs doesn't become 200 DOM nodes */
  maxDots?: number;
}) {
  const dots = useMemo(() => {
    const safeValid = Math.max(0, Math.floor(valid || 0));
    const safeInvalid = Math.max(0, Math.floor(invalid || 0));

    // Prefer showing valid URLs as the main "queue" indicator.
    // If there are no valid URLs but there *are* invalid lines, show a few red dots.
    const primary = safeValid > 0 ? safeValid : safeInvalid;
    const count = Math.min(primary, Math.max(1, maxDots));
    const kind: "valid" | "invalid" = safeValid > 0 ? "valid" : "invalid";

    if (primary <= 0) return { count: 0, kind };
    return { count, kind };
  }, [valid, invalid, maxDots]);

  const label = valid > 0 ? String(valid) : invalid > 0 ? "!" : "0";

  return (
    <div
      className="ct-radar"
      aria-label={
        valid > 0
          ? `${valid} valid URLs detected`
          : invalid > 0
            ? `${invalid} invalid lines detected`
            : "No URLs yet"
      }
      title={
        valid > 0
          ? `${valid} valid URL${valid === 1 ? "" : "s"}`
          : invalid > 0
            ? `${invalid} invalid line${invalid === 1 ? "" : "s"}`
            : "No URLs yet"
      }
      data-kind={dots.kind}
    >
      <div className="ct-radar__core">
        <span className="ct-radar__label">{label}</span>
      </div>

      {Array.from({ length: dots.count }).map((_, i) => {
        const ang = (i / dots.count) * Math.PI * 2;
        // radius inside ring
        const r = 14;
        const cx = 18;
        const cy = 18;
        const x = cx + Math.cos(ang) * r;
        const y = cy + Math.sin(ang) * r;
        return (
          <span
            key={i}
            className="ct-radar__dot"
            style={{ left: x, top: y, animationDelay: `${(i % 8) * 0.09}s` }}
          />
        );
      })}
    </div>
  );
}
