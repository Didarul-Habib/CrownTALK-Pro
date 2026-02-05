"use client";

import { useEffect } from "react";
import { LS } from "@/lib/storage";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Keep a console breadcrumb for debugging in production.
    // (Next.js will already log the digest for server errors.)
    // eslint-disable-next-line no-console
    console.error("CrownTALK UI error:", error);
  }, [error]);

  return (
    <div className="mx-auto min-h-[70vh] max-w-3xl px-4 py-12">
      <div className="ct-card p-6 space-y-4">
        <div>
          <div className="text-sm font-semibold tracking-tight">Something went wrong</div>
          <div className="mt-1 text-xs opacity-70">
            Your draft is saved locally. You can try again, reload, or reset the UI.
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/10 p-3 text-xs font-mono whitespace-pre-wrap break-words opacity-80">
          {error?.message || "Unknown error"}
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" className="ct-btn ct-btn-primary" onClick={() => reset()}>
            Try again
          </button>
          <button type="button" className="ct-btn" onClick={() => window.location.reload()}>
            Reload
          </button>
          <button
            type="button"
            className="ct-btn ct-btn-danger"
            onClick={() => {
              try {
                Object.values(LS).forEach((k) => localStorage.removeItem(k));
              } catch {
                // ignore
              }
              window.location.reload();
            }}
          >
            Reset app data
          </button>
        </div>
      </div>
    </div>
  );
}
