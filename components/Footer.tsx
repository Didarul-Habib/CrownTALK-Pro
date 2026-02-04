"use client";

import clsx from "clsx";
import { ExternalLink } from "lucide-react";

export default function Footer({
  ownerXUrl = "https://x.com/_CrownDEX",
}: {
  ownerXUrl?: string;
}) {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-10 pb-10">
      <div className="mx-auto max-w-6xl px-4">
        <div
          className={clsx(
            "ct-card",
            "p-4",
            "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          )}
        >
          <div className="text-xs opacity-70">
            © {year} <span className="font-semibold opacity-90">CrownTALK</span>. All rights reserved.
          </div>

          <a
            href={ownerXUrl}
            target="_blank"
            rel="noreferrer"
            className={clsx(
              "ct-btn ct-btn-sm",
              "inline-flex",
              "bg-[color:var(--ct-surface)]",
              "hover:brightness-110"
            )}
            title="Open on X"
          >
            <ExternalLink className="h-4 w-4 opacity-80" />
            <span className="text-xs">@CrownDEX</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
