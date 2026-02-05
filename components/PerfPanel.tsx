"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { isEnabled } from "@/lib/flags";

/**
 * Lightweight perf debug panel.
 * - FPS estimate via rAF
 * - Long task observer (if supported)
 * Enabled via: ?ff_perf=1 or localStorage ff:perf=1 or NEXT_PUBLIC_FF_PERF=1
 */
export default function PerfPanel() {
  const enabled = isEnabled("perf", false);
  const [fps, setFps] = useState(0);
  const [longTasks, setLongTasks] = useState(0);
  const [lastLong, setLastLong] = useState<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const framesRef = useRef(0);
  const lastRef = useRef<number>(performance.now());

  useEffect(() => {
    if (!enabled) return;
    const tick = (t: number) => {
      framesRef.current += 1;
      const delta = t - lastRef.current;
      if (delta >= 1000) {
        setFps(Math.round((framesRef.current * 1000) / delta));
        framesRef.current = 0;
        lastRef.current = t;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    if (typeof PerformanceObserver === "undefined") return;

    let obs: PerformanceObserver | null = null;
    try {
      obs = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        if (!entries.length) return;
        setLongTasks((v) => v + entries.length);
        setLastLong(Date.now());
      });
      // @ts-ignore
      obs.observe({ entryTypes: ["longtask"] });
    } catch {
      // ignore
    }

    return () => {
      try {
        obs?.disconnect();
      } catch {}
    };
  }, [enabled]);

  const badge = useMemo(() => {
    if (!enabled) return null;
    const hot = fps > 0 && fps < 45;
    return {
      label: `${fps || "—"} FPS`,
      sub: longTasks ? `Long tasks: ${longTasks}` : "No long tasks",
      hot,
    };
  }, [enabled, fps, longTasks]);

  if (!enabled || !badge) return null;

  return (
    <div
      className={clsx(
        "fixed bottom-4 left-4 z-[100]",
        "rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl",
        "px-3 py-2 shadow-2xl",
        badge.hot ? "ring-2 ring-red-400/40" : "ring-2 ring-white/5"
      )}
    >
      <div className="text-[11px] font-semibold tracking-wide">{badge.label}</div>
      <div className="text-[10px] opacity-70">{badge.sub}</div>
      {lastLong ? (
        <div className="text-[10px] opacity-50">Last: {new Date(lastLong).toLocaleTimeString()}</div>
      ) : null}
    </div>
  );
}
