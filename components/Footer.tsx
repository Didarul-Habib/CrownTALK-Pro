"use client";

import clsx from "clsx";
import { ExternalLink } from "lucide-react";
import Image from "next/image";

export default function Footer({
  ownerXUrl = "https://x.com/_CrownDEX",
}: {
  ownerXUrl?: string;
}) {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-10 pb-12">
      <div className="mx-auto max-w-6xl px-4">
        <div
          className={clsx(
            "ct-card",
            "relative overflow-hidden",
            "p-6",
            "flex flex-col gap-6"
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

          <div className="relative z-10 grid gap-6 sm:grid-cols-2 sm:items-center">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full border border-white/10 bg-black/10 grid place-items-center overflow-hidden">
                <Image src="/logo.png" alt="CrownTALK" width={40} height={40} className="h-10 w-10 object-cover" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="font-semibold tracking-tight ct-brand">CrownTALK</div>
                  <span className="ct-chip text-[10px]">PRO UI</span>
                </div>
                <div className="text-xs opacity-70 -mt-0.5">Professional X comment generator</div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-start sm:justify-end gap-2">
              <span className="ct-chip text-[11px]">Theme Packs</span>
              <span className="ct-chip text-[11px]">Instant Copy</span>
              <a
                href={ownerXUrl}
                target="_blank"
                rel="noreferrer"
                className={clsx("ct-btn ct-btn-sm ct-btn-primary", "inline-flex", "hover:brightness-110")}
                title="Open on X"
              >
                <ExternalLink className="h-4 w-4 opacity-80" />
                <span className="text-xs">@CrownDEX</span>
              </a>
            </div>
          </div>

          <div className="relative z-10 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between text-[11px] opacity-70">
            <div>© {year} <span className="font-semibold opacity-90">CrownTALK</span>. All rights reserved.</div>
            <div className="opacity-70">Designed for speed, clarity, and premium presence.</div>
          </div>
        </div>
      </div>
    </footer>
  );
}
