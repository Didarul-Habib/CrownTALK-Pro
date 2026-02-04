"use client";

import StatusPill from "@/components/StatusPill";
import ThemeStudioBar, { ThemeId } from "@/components/ThemeStudioBar";

export default function TopBar({
  theme,
  setTheme,
  baseUrl,
}: {
  theme: ThemeId;
  setTheme: (t: ThemeId) => void;
  baseUrl: string;
}) {
  return (
    <div className="sticky top-0 z-40 border-b border-[color:var(--ct-border)] bg-[color:var(--ct-bg)]/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-2xl bg-[color:var(--ct-accent)]/15 border border-[color:var(--ct-border)] grid place-items-center">
            <span className="text-sm font-bold" style={{ color: "var(--ct-accent)" }}>
              C
            </span>
          </div>
          <div>
            <div className="font-semibold tracking-tight">CrownTALK</div>
            <div className="text-xs opacity-70 -mt-0.5">Professional X comment generator</div>
          </div>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <ThemeStudioBar value={theme} onChange={setTheme} />
          <div className="flex items-center gap-3 md:justify-end">
            <StatusPill baseUrl={baseUrl} />
          </div>
        </div>
      </div>
    </div>
  );
}
