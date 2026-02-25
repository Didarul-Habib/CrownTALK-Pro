"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { UI_LANGS, type UiLang, getUiLang, setUiLang } from "@/lib/uiLanguage";
import { track } from "@/lib/analytics";

export default function UiLangSelect({ compact }: { compact?: boolean }) {
  const [lang, setLang] = useState<UiLang>("en");

  useEffect(() => {
    setLang(getUiLang());
  }, []);

  return (
    <label
      className={clsx(
        "inline-flex items-center gap-1 rounded-2xl border border-[color:var(--ct-border)] bg-[color:var(--ct-panel)]/80 px-2 py-1.5 text-[11px]",
        compact ? "min-h-[32px]" : "min-h-[36px]",
      )}
    >
      <span className="hidden sm:inline opacity-70">UI</span>
      <select
        className={clsx(
          "bg-transparent text-xs outline-none",
          "focus-visible:ring-0 focus-visible:outline-none",
        )}
        value={lang}
        onChange={(e) => {
          const v = e.target.value as UiLang;
          setLang(v);
          setUiLang(v);
          track("ui_lang_change", { uiLang: v });
        }}
      >
        {UI_LANGS.map((l) => (
          <option key={l.id} value={l.id}>
            {l.label}
          </option>
        ))}
      </select>
    </label>
  );
}
