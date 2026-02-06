"use client";

import clsx from "clsx";
import { ExternalLink } from "lucide-react";
import StatusPill from "@/components/StatusPill";

export default function Footer({
  mode = "URL/Source",
  version = "v2",
}: {
  mode?: string;
  version?: string;
}) {
  const baseUrl = (process.env.NEXT_PUBLIC_BACKEND_URL as string | undefined) || "";
  return (
    <footer className="mt-10 pb-12">
      <div className="mx-auto max-w-6xl px-4">
        <div
          className={clsx(
            "rounded-[var(--ct-radius)] border border-[color:var(--ct-border)] bg-[color:var(--ct-panel)]/70 backdrop-blur-xl",
            "px-4 py-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
          )}
        >
          <div className="flex flex-col gap-1">
            <div className="text-sm font-semibold">CrownTALK</div>
            <div className="text-xs text-[color:var(--ct-muted)]">
              Docs • Changelog • Privacy
              <span className="mx-2 opacity-40">•</span>
              Shortcuts: Ctrl+/ Theme, Ctrl+Enter Generate
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-xs text-[color:var(--ct-muted)]">Mode: {mode}</div>
            <div className="rounded-full border border-[color:var(--ct-border)] px-2 py-1 text-xs">{version}</div>
            <StatusPill baseUrl={baseUrl} />
            <a
              className="inline-flex items-center gap-1 text-xs text-[color:var(--ct-muted)] hover:text-[color:var(--ct-text)]"
              href="https://x.com"
              target="_blank"
              rel="noreferrer"
            >
              X <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
