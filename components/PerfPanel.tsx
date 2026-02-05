"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { X, Activity, AlertTriangle } from "lucide-react";
import { getFlag, setFlag } from "@/lib/flags";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Metric = { fps: number; longTasks: number; lastLongTaskMs: number };

export default function PerfPanel() {
  const [open, setOpen] = useState(() => getFlag("perfPanel"));
  const [metric, setMetric] = useState<Metric>({ fps: 0, longTasks: 0, lastLongTaskMs: 0 });
  const raf = useRef<number | null>(null);

  useEffect(() => {
    setFlag("perfPanel", open);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let frames = 0;
    let last = performance.now();
    const tick = (t: number) => {
      frames += 1;
      const dt = t - last;
      if (dt >= 1000) {
        const fps = Math.round((frames * 1000) / dt);
        frames = 0;
        last = t;
        setMetric((m) => ({ ...m, fps }));
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      raf.current = null;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let longTasks = 0;
    let lastLongTaskMs = 0;
    let obs: PerformanceObserver | null = null;
    try {
      obs = new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          longTasks += 1;
          lastLongTaskMs = Math.round(e.duration);
        }
        setMetric((m) => ({ ...m, longTasks, lastLongTaskMs }));
      });
      // @ts-expect-error
      obs.observe({ entryTypes: ["longtask"] });
    } catch {}
    return () => {
      try { obs?.disconnect(); } catch {}
    };
  }, [open]);

  const badge = useMemo(() => ({ hot: metric.fps > 0 && metric.fps < 45 }), [metric.fps]);

  return (
    <div className="fixed bottom-4 right-4 z-[100]">
      {!open ? (
        <Button size="sm" variant="secondary" onClick={() => setOpen(true)} className="rounded-full">
          <Activity className="h-4 w-4" /> Perf
        </Button>
      ) : (
        <div
          className={cn(
            "w-[260px] rounded-[var(--ct-radius)] border border-[color:var(--ct-border)] bg-[color:var(--ct-panel)]/85 backdrop-blur-xl",
            "shadow-[0_18px_65px_rgba(0,0,0,.35)] p-3"
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 opacity-80" />
              <div className="text-xs font-semibold tracking-tight">Perf Panel</div>
              {badge.hot ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/15 px-2 py-0.5 text-[10px] text-yellow-200">
                  <AlertTriangle className="h-3 w-3" /> low FPS
                </span>
              ) : null}
            </div>
            <button className="rounded-full p-1 opacity-70 hover:opacity-100 hover:bg-white/5" onClick={() => setOpen(false)} aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            <MetricBox label="FPS" value={metric.fps ? String(metric.fps) : "—"} />
            <MetricBox label="Long tasks" value={String(metric.longTasks)} />
            <MetricBox label="Last long" value={metric.lastLongTaskMs ? `${metric.lastLongTaskMs}ms` : "—"} />
            <MetricBox label="FX mode" value={document?.documentElement?.dataset?.fx ?? "—"} />
          </div>

          <div className="mt-2 flex items-center justify-between gap-2">
            <Button size="sm" variant="ghost" className="w-full" onClick={() => location.reload()}>
              Reload
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="w-full"
              onClick={() => {
                try { performance.clearMeasures(); performance.clearMarks(); } catch {}
              }}
            >
              Clear marks
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[calc(var(--ct-radius)-10px)] border border-white/10 bg-black/15 px-2 py-2">
      <div className="text-[10px] opacity-70">{label}</div>
      <div className="mt-0.5 text-sm font-semibold tabular-nums">{value}</div>
    </div>
  );
}
