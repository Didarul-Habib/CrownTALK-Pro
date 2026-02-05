"use client";

import Image from "next/image";
import StatusPill from "@/components/StatusPill";
import ThemeStudioBar, { ThemeId } from "@/components/ThemeStudioBar";
import UserMenu from "@/components/UserMenu";
import type { UserProfile } from "@/lib/persist";

export default function TopBar({
  theme,
  setTheme,
  baseUrl,
  user,
  onLogout,
}: {
  theme: ThemeId;
  setTheme: (t: ThemeId) => void;
  baseUrl: string;
  user?: UserProfile | null;
  onLogout?: () => void;
}) {
  return (
    <div className="sticky top-0 z-40 border-b border-[color:var(--ct-border)] bg-[color:var(--ct-bg)]/70 backdrop-blur-xl">
      {/*
        NOTE: use `lg:` for the "desktop" layout so phone browsers in "Desktop site"
        mode don't squeeze everything into 2 columns.
      */}
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full border border-[color:var(--ct-border)] bg-black/10 grid place-items-center overflow-hidden">
            <Image
              src="/logo.png"
              alt="CrownTALK logo"
              width={36}
              height={36}
              priority
              className="h-9 w-9 object-cover"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="font-semibold tracking-tight ct-brand">CrownTALK</div>
                {/*
                  NOTE: this badge must *not* inherit ct-brand's transparent text color.
                  Keep it outside the gradient text node + explicitly set a readable color.
                */}
                <span
                  className="ct-badge-pro absolute -top-2 -right-5 rounded-full border border-white/15 bg-white/5 px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-white/90"
                  aria-label="CrownTALK Pro"
                >
                  PRO
                </span>
              </div>
            </div>
            <div className="text-xs opacity-70 -mt-0.5">Professional X comment generator</div>
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <ThemeStudioBar value={theme} onChange={setTheme} />
          <div className="flex items-center flex-wrap gap-3 lg:justify-end">
            <StatusPill baseUrl={baseUrl} />
            {user ? <UserMenu user={user} onLogout={onLogout} /> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
