
"use client";

import clsx from "clsx";
import { History, SlidersHorizontal, Sparkles, LayoutGrid } from "lucide-react";
import { translate, useUiLang } from "@/lib/i18n";

export default function MobileActionBar({
  loading,
  canGenerate,
  onGenerate,
  onOpenControls,
  onOpenHistory,
  onOpenPresets,
}: {
  loading: boolean;
  canGenerate: boolean;
  onGenerate: () => void;
  onOpenControls: () => void;
  onOpenHistory: () => void;
  onOpenPresets: () => void;
}) {
  const uiLang = useUiLang();
  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-2">
      <div className="rounded-[22px] border border-[color:var(--ct-border)] bg-[color:var(--ct-panel)]/90 backdrop-blur-xl shadow-[0_18px_80px_rgba(0,0,0,0.55)] p-2">
        <div className="grid grid-cols-4 gap-2">
          <button
            type="button"
            onClick={onOpenHistory}
            className="ct-btn w-full justify-center"
            aria-label={translate("mobile.history", uiLang)}
          >
            <History className="h-4 w-4 opacity-80" />
            <span className="text-[11px] opacity-80">{translate("mobile.history", uiLang)}</span>
          </button>

          <button
            type="button"
            onClick={onOpenPresets}
            className="ct-btn w-full justify-center"
            aria-label={translate("mobile.presets", uiLang)}
          >
            <LayoutGrid className="h-4 w-4 opacity-80" />
            <span className="text-[11px] opacity-80">{translate("mobile.presets", uiLang)}</span>
          </button>

          <button
            type="button"
            onClick={onOpenControls}
            className="ct-btn w-full justify-center"
            aria-label={translate("mobile.controls", uiLang)}
          >
            <SlidersHorizontal className="h-4 w-4 opacity-80" />
            <span className="text-[11px] opacity-80">{translate("mobile.controls", uiLang)}</span>
          </button>

          <button
            type="button"
            onClick={onGenerate}
            disabled={!canGenerate || loading}
            className={clsx(
              "ct-btn ct-btn-primary w-full justify-center",
              (!canGenerate || loading) ? "opacity-70 cursor-not-allowed" : ""
            )}
            aria-label={translate("mobile.generate", uiLang)}
          >
            <Sparkles className="h-4 w-4 opacity-90" />
            <span className="text-[11px] font-semibold">{loading ? "..." : translate("mobile.generate", uiLang)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
