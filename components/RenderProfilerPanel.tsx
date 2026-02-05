"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { isEnabled } from "@/lib/flags";
import { getRenderStats, resetRenderStats } from "@/lib/renderRegistry";

export default function RenderProfilerPanel() {
  const enabled = isEnabled("render", false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 800);
    return () => window.clearInterval(id);
  }, [enabled]);

  const stats = useMemo(() => getRenderStats().slice(0, 16), [tick]);

  if (!enabled) return null;

  return (
    <div
      className={clsx(
        "fixed bottom-4 left-44 z-[100]",
        "rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl",
        "px-3 py-2 shadow-2xl ring-2 ring-white/5",
        "w-[320px]"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-semibold tracking-wide">Render profiler</div>
        <button className="ct-btn ct-btn-xs" onClick={() => resetRenderStats()}>Reset</button>
      </div>
      <div className="mt-2 space-y-1">
        {stats.length ? stats.map((s) => (
          <div key={s.name} className="flex items-center justify-between text-[10px] opacity-85">
            <span className="truncate pr-2">{s.name}</span>
            <span className="font-mono opacity-80">{s.count}</span>
          </div>
        )) : (
          <div className="text-[10px] opacity-70">No data yet</div>
        )}
      </div>
      <div className="mt-2 text-[10px] opacity-55">Enable via ?ff_render=1 or localStorage ff:render=1</div>
    </div>
  );
}
