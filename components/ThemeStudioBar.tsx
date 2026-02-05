"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import clsx from "clsx";
import { motion } from "framer-motion";

export type ThemeId =
  | "neon"
  | "aurora"
  | "sakura"
  | "sunset"
  | "matrix"
  | "midnight"
  | "mono"
  | "ocean"
  | "royal"
  | "ember"
  | "cosmic"
  | "retro"
  | "cyberpunk";

const THEMES: Array<{
  id: ThemeId;
  label: string;
  swatches: [string, string];
}> = [
  // Swatches mirror the actual CSS theme tokens in app/globals.css
  { id: "neon", label: "Neon", swatches: ["rgba(120,160,255,1)", "rgba(255,110,199,1)"] },
  { id: "aurora", label: "Aurora", swatches: ["rgba(102,255,204,1)", "rgba(120,160,255,1)"] },
  { id: "sakura", label: "Sakura", swatches: ["rgba(255,128,196,1)", "rgba(255,200,120,1)"] },
  { id: "sunset", label: "Sunset", swatches: ["rgba(255,170,80,1)", "rgba(255,90,160,1)"] },
  { id: "matrix", label: "Matrix", swatches: ["rgba(64,255,140,1)", "rgba(80,220,255,1)"] },
  { id: "midnight", label: "Midnight", swatches: ["rgba(130,120,255,1)", "rgba(90,255,220,1)"] },
  { id: "mono", label: "Mono", swatches: ["rgba(230,230,230,1)", "rgba(160,160,160,1)"] },

  // Premium extras
  { id: "ocean", label: "Ocean", swatches: ["rgba(56,189,248,1)", "rgba(34,211,238,1)"] },
  { id: "royal", label: "Royal", swatches: ["rgba(167,139,250,1)", "rgba(250,204,21,1)"] },
  { id: "ember", label: "Ember", swatches: ["rgba(251,146,60,1)", "rgba(244,63,94,1)"] },
  { id: "cosmic", label: "Cosmic", swatches: ["rgba(217,70,239,1)", "rgba(34,211,238,1)"] },
  { id: "retro", label: "Retro", swatches: ["rgba(255,198,0,1)", "rgba(255,75,120,1)"] },
  { id: "cyberpunk", label: "Cyberpunk", swatches: ["rgba(0,255,255,1)", "rgba(255,0,200,1)"] },
];

export default function ThemeStudioBar({
  value,
  onChange,
}: {
  value: ThemeId;
  onChange: (t: ThemeId) => void;
}) {
  const railRef = useRef<HTMLDivElement | null>(null);
  const btnRefs = useRef<Record<ThemeId, HTMLButtonElement | null>>({} as any);
  const [slider, setSlider] = useState<{ x: number; w: number }>(() => ({ x: 0, w: 110 }));

  const measure = useCallback(() => {
    const rail = railRef.current;
    const btn = btnRefs.current[value];
    if (!rail || !btn) return;
    // `offsetLeft` is relative to the offsetParent (the rail container).
    const x = btn.offsetLeft;
    const w = btn.offsetWidth;
    setSlider({ x, w });
  }, [value]);

  useLayoutEffect(() => {
    // Measure after layout so the active pill always aligns correctly.
    measure();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    // Re-measure on resize (mobile rotation / desktop window changes).
    const onResize = () => measure();
    window.addEventListener("resize", onResize);

    // Also re-measure when fonts finish loading (affects button widths).
    const anyDoc = document as any;
    const fontPromise: Promise<any> | undefined = anyDoc?.fonts?.ready;
    fontPromise?.then(() => measure()).catch(() => {});

    return () => window.removeEventListener("resize", onResize);
  }, [measure]);

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
    <div className="relative max-w-full">
      {/*
        Make the theme studio horizontally scrollable so it never overflows
        on narrow devices (including mobile browsers in "Desktop site" mode).
      */}
      <div className="ct-scroll-x max-w-full">
        <div
          ref={railRef}
          className={clsx(
            "relative flex min-w-max items-center gap-2 rounded-2xl border px-2 py-2",
            "bg-[color:var(--ct-panel)] border-[color:var(--ct-border)]",
            "shadow-[0_16px_60px_rgba(0,0,0,.35)]"
          )}
        >
        {/* Active slider */}
        <motion.div
          className="pointer-events-none absolute top-1 bottom-1 left-0 rounded-2xl border"
          style={{
            borderColor: "rgba(255,255,255,.10)",
            background: "rgba(255,255,255,.06)",
            boxShadow: "0 10px 40px rgba(0,0,0,.35)",
          }}
          initial={false}
          animate={{
            x: slider.x,
            width: slider.w,
          }}
          transition={{ type: "spring", stiffness: 420, damping: 36 }}
        />

          {THEMES.map((t) => {
          const active = t.id === value;
          return (
            <button
              key={t.id}
              onClick={() => onChange(t.id)}
              ref={(el) => {
                btnRefs.current[t.id] = el;
              }}
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
      </div>

      <div className="mt-1 text-[11px] opacity-60">Theme Studio • Ctrl + ←/→ to cycle</div>
    </div>
  );
}
