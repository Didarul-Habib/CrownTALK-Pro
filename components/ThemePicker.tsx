"use client";

import { useEffect, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import clsx from "clsx";

export type ThemeId =
  | "aurora"
  | "sakura"
  | "mono"
  | "neon"
  | "sunset"
  | "matrix"
  | "midnight";

const THEMES: Array<{ id: ThemeId; label: string }> = [
  { id: "neon", label: "Neon" },
  { id: "aurora", label: "Aurora" },
  { id: "sakura", label: "Sakura" },
  { id: "sunset", label: "Sunset" },
  { id: "matrix", label: "Matrix" },
  { id: "midnight", label: "Midnight" },
  { id: "mono", label: "Mono" },
];

export default function ThemePicker({
  value,
  onChange,
}: {
  value: ThemeId;
  onChange: (t: ThemeId) => void;
}) {
  const [open, setOpen] = useState(false);

  const activeLabel = useMemo(
    () => THEMES.find((t) => t.id === value)?.label ?? value,
    [value]
  );

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest("[data-theme-picker]")) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="relative" data-theme-picker>
      <button
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          "flex items-center gap-2 rounded-xl border px-3 py-2 text-xs",
          "bg-[color:var(--ct-surface)] border-[color:var(--ct-border)]",
          "hover:brightness-110 transition"
        )}
      >
        <Sparkles className="h-4 w-4 opacity-80" />
        <span className="opacity-90">{activeLabel}</span>
      </button>

      {open ? (
        <div
          className={clsx(
            "absolute right-0 mt-2 w-48 overflow-hidden rounded-2xl border shadow-xl",
            "bg-[color:var(--ct-panel)] border-[color:var(--ct-border)]"
          )}
        >
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                onChange(t.id);
                setOpen(false);
              }}
              className={clsx(
                "w-full px-3 py-2 text-left text-sm",
                "hover:bg-white/5 transition",
                t.id === value ? "bg-white/5" : ""
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
