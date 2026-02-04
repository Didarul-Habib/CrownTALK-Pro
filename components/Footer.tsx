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
            "relative overflow-hidden",
            "p-4",
            "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          )}
        >
          {/* Subtle premium glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-24 opacity-60 blur-3xl"
            style={{
              background:
                "radial-gradient(600px 320px at 15% 30%, color-mix(in srgb, var(--ct-accent) 18%, transparent), transparent 62%)," +
                "radial-gradient(520px 340px at 85% 25%, color-mix(in srgb, var(--ct-accent-2) 16%, transparent), transparent 64%)",
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{
              background:
                "linear-gradient(135deg, color-mix(in srgb, var(--ct-accent) 18%, transparent), transparent 40%, color-mix(in srgb, var(--ct-accent-2) 14%, transparent))",
            }}
          />

          <div className="relative z-10 text-xs opacity-70">
            © {year} <span className="font-semibold opacity-90">CrownTALK</span>. All rights reserved.
          </div>

          <a
            href={ownerXUrl}
            target="_blank"
            rel="noreferrer"
            className={clsx(
              "ct-btn ct-btn-sm ct-btn-primary",
              "inline-flex",
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
