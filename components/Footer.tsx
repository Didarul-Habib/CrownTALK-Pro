"use client";

import clsx from "clsx";
import { ExternalLink } from "lucide-react";
import Image from "next/image";

export default function Footer({
  ownerXUrl = "https://x.com/_CrownDEX",
  ownerXHandle = "CrownDEX",
  ownerXPfpUrl = "https://unavatar.io/x/_CrownDEX",
}: {
  ownerXUrl?: string;
  ownerXHandle?: string;
  ownerXPfpUrl?: string;
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
                  <div className="relative inline-block">
                    <div className="font-semibold tracking-tight ct-brand">CrownTALK</div>
                    <span
                      className="absolute -top-2 right-0 translate-x-1/2 rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[9px] font-semibold tracking-wide text-white/90"
                      aria-label="CrownTALK Pro UI"
                    >
                      PRO UI
                    </span>
                  </div>
                </div>
                <div className="text-xs opacity-70 -mt-0.5">Professional X comment generator</div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-start sm:justify-end gap-2">
              <a
                href={ownerXUrl}
                target="_blank"
                rel="noreferrer"
                className={clsx(
                  "ct-btn ct-btn-sm ct-btn-primary",
                  "inline-flex items-center",
                  "gap-2",
                  "hover:brightness-110"
                )}
                title="Open on X"
              >
                <span className="h-7 w-7 rounded-full overflow-hidden border border-white/15 bg-black/20 grid place-items-center">
                  {/* Use a remote avatar source; Next will optimize it automatically if domains are allowed.
                     If your Next config blocks it, set NEXT_PUBLIC_X_PFP_URL to a hosted image you control. */}
                  <Image
                    src={ownerXPfpUrl}
                    alt={`${ownerXHandle} profile photo`}
                    width={28}
                    height={28}
                    className="h-7 w-7 object-cover"
                  />
                </span>
                <span className="text-xs font-semibold">@{ownerXHandle}</span>
                <ExternalLink className="h-4 w-4 opacity-80" />
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
