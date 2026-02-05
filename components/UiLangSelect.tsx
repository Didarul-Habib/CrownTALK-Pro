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
    <label className={clsx("inline-flex items-center gap-2", compact ? "text-xs" : "text-sm")}>
      <span className="opacity-75 hidden md:inline">UI</span>
      <select
        className={clsx("ct-input", compact ? "h-8 px-2 text-xs" : "h-9 px-3 text-sm")}
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
