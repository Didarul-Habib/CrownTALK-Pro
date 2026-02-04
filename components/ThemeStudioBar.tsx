"use client";

import { useEffect, useMemo } from "react";
import clsx from "clsx";
import { motion } from "framer-motion";

export type ThemeId =
  | "neon"
  | "aurora"
  | "sakura"
  | "sunset"
  | "matrix"
  | "midnight"
  | "mono";

const THEMES: Array<{
  id: ThemeId;
  label: string;
  swatches: [string, string];
}> = [
  { id: "neon", label: "Neon", swatches: ["rgba(129,140,248,1)", "rgba(236,72,153,1)"] },
  { id: "aurora", label: "Aurora", swatches: ["rgba(102,255,204,1)", "rgba(120,160,255,1)"] },
  { id: "sakura", label: "Sakura", swatches: ["rgba(255,128,196,1)", "rgba(255,200,120,1)"] },
  { id: "sunset", label: "Sunset", swatches: ["rgba(255,173,102,1)", "rgba(255,74,111,1)"] },
  { id: "matrix", label: "Matrix", swatches: ["rgba(34,197,94,1)", "rgba(16,185,129,1)"] },
  { id: "midnight", label: "Midnight", swatches: ["rgba(96,165,250,1)", "rgba(99,102,241,1)"] },
  { id: "mono", label: "Mono", swatches: ["rgba(230,230,230,1)", "rgba(160,160,160,1)"] },
];

export default function ThemeStudioBar({
  value,
  onChange,
}: {
  value: ThemeId;
  onChange: (t: ThemeId) => void;
}) {
  const idx = useMemo(() => THEMES.findIndex((t) => t.id === value), [value]);

  // keyboard: ctrl+arrow left/right cycles themes (desktop power feature)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.ctrlKey) return;
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      const i = THEMES.findIndex((t) => t.id === value);
      const next =
        e.key === "ArrowRight"
          ? THEMES[(i + 1 + THEMES.length) % THEMES.length]
          : THEMES[(i - 1 + THEMES.length) % THEMES.length];
      onChange(next.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [value, onChange]);

  return (
    <div className="relative">
      <div
        className={clsx(
          "relative flex items-center gap-2 rounded-2xl border px-2 py-2",
          "bg-[color:var(--ct-panel)] border-[color:var(--ct-border)]",
          "shadow-[0_16px_60px_rgba(0,0,0,.35)]"
        )}
      >
        {/* Active slider */}
        <motion.div
          className="absolute top-1 bottom-1 rounded-2xl border"
          style={{
            width: 110,
            borderColor: "rgba(255,255,255,.10)",
            background: "rgba(255,255,255,.06)",
            boxShadow: "0 10px 40px rgba(0,0,0,.35)",
          }}
          initial={false}
          animate={{
            x: Math.max(0, idx) * 114,
          }}
          transition={{ type: "spring", stiffness: 420, damping: 36 }}
        />

        {THEMES.map((t) => {
          const active = t.id === value;
          return (
            <button
              key={t.id}
              onClick={() => onChange(t.id)}
              className={clsx(
                "relative z-10 flex w-[110px] items-center justify-between gap-2 rounded-2xl px-3 py-2",
                "transition",
                active ? "text-white" : "opacity-80 hover:opacity-100"
              )}
              title={t.label}
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{
                    background: `linear-gradient(135deg, ${t.swatches[0]}, ${t.swatches[1]})`,
                    boxShadow: active
                      ? `0 0 0 1px rgba(255,255,255,.22), 0 0 24px rgba(255,255,255,.14)`
                      : "0 0 0 1px rgba(255,255,255,.14)",
                  }}
                />
                <span className="text-xs font-semibold tracking-tight">{t.label}</span>
              </div>

              <span
                className="h-2 w-2 rounded-full"
                style={{
                  background: active ? "var(--ct-accent)" : "rgba(255,255,255,.18)",
                  boxShadow: active ? "0 0 18px rgba(255,255,255,.20)" : "none",
                }}
              />
            </button>
          );
        })}
      </div>

      <div className="mt-1 text-[11px] opacity-60">
        Theme Studio • Ctrl + ←/→ to cycle
      </div>
    </div>
  );
}
