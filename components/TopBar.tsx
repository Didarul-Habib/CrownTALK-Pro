"use client";

import Image from "next/image";
import Link from "next/link";
import StatusPill from "@/components/StatusPill";
import ThemeStudioBar, { ThemeId } from "@/components/ThemeStudioBar";
import UserMenu from "@/components/UserMenu";
import UiLangSelect from "@/components/UiLangSelect";
import { motion } from "framer-motion";
import { applyFxMode, type FxMode, shouldReduceEffects } from "@/lib/motion";
import { LS, lsGet, lsSet } from "@/lib/storage";
import { useMemo, useState } from "react";
import type { UserProfile } from "@/lib/persist";
import { translate, useUiLang } from "@/lib/i18n";

export default function TopBar({
  theme,
  setTheme,
  baseUrl,
  user,
  onLogout,
}: {
  theme: ThemeId;
  setTheme: (v: ThemeId) => void;
  baseUrl: string;
  user: UserProfile | null;
  onLogout: () => void;
}) {
  const uiLang = useUiLang();
  const [fxMode, setFxMode] = useState<FxMode>(() => {
    if (typeof window === "undefined") return "auto";
    const stored = (lsGet(LS.fxMode, "auto") as FxMode) || "auto";
    if (stored === "lite" || stored === "full" || stored === "auto") return stored;
    if (shouldReduceEffects()) return "lite";
    return "auto";
  });
  const [showTheme, setShowTheme] = useState(false);

  const canAnimate = typeof window === "undefined" ? false : !shouldReduceEffects();

  const fxLabel = useMemo(
    () =>
      fxMode === "auto"
        ? translate("fx.auto", uiLang)
        : fxMode === "full"
        ? translate("fx.full", uiLang)
        : translate("fx.low", uiLang),
    [fxMode, uiLang],
  );
  function cycleFx() {
    const next: FxMode = fxMode === "auto" ? "lite" : fxMode === "lite" ? "full" : "auto";
    setFxMode(next);
    lsSet(LS.fxMode, next);
    applyFxMode(next);
  }

  return (
    <motion.div
      className="sticky top-0 z-40 border-b border-[color:var(--ct-border)] bg-[color:var(--ct-bg)]/70 backdrop-blur-xl"
      initial={canAnimate ? { y: -12, opacity: 0 } : undefined}
      animate={canAnimate ? { y: 0, opacity: 1 } : undefined}
      transition={canAnimate ? { duration: 0.35, ease: "easeOut" } : undefined}
    >
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
              className="rounded-full"
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold tracking-tight">CrownTALK</span>
              <span className="rounded-full border border-[color:var(--ct-border)] bg-[color:var(--ct-panel)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--ct-accent)]">
                PRO
              </span>
            </div>
            <div className="text-xs opacity-70 -mt-0.5">
              {translate("tagline.pro", uiLang)}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={cycleFx}
              className="ct-btn text-xs px-4 py-2.5 min-h-[36px]"
              title={translate("fx.toggle", uiLang)}
            >
              {fxLabel}
            </button>

            <UiLangSelect compact />

            <button
              type="button"
              className="ct-btn ct-btn-xs"
              onClick={() => setShowTheme((v) => !v)}
              title="Theme studio"
            >
              {showTheme ? translate("theme.hide", uiLang) : translate("theme.show", uiLang)}
            </button>
          </div>

          {showTheme ? <ThemeStudioBar value={theme} onChange={setTheme} /> : null}

          <div className="flex items-center flex-wrap gap-3 lg:justify-end">
            <Link
              href="/projects"
              className="ct-btn ct-btn-xs rounded-full border border-[color:var(--ct-border-subtle)] bg-[color:var(--ct-panel)] px-3 py-1 text-xs font-medium text-[color:var(--ct-foreground-muted)] hover:border-[color:var(--ct-accent)] hover:text-[color:var(--ct-accent)]"
            >
              Project Lab
            </Link>
            <StatusPill baseUrl={baseUrl} />

            {user ? <UserMenu user={user} onLogout={onLogout} /> : null}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
