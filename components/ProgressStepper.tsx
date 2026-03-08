"use client";

import { motion } from "framer-motion";
import clsx from "clsx";
import { translate, useUiLang } from "@/lib/i18n";
import { LS, lsGet } from "@/lib/storage";
import { useEffect, useMemo, useRef, useState } from "react";

export type Stage = "idle" | "fetching" | "generating" | "polishing" | "finalizing" | "done";

const STEPS: Array<{ id: Exclude<Stage, "idle" | "done">; labelKey: string }> = [
  { id: "fetching", labelKey: "pipeline.step.fetching" },
  { id: "generating", labelKey: "pipeline.step.generating" },
  { id: "polishing", labelKey: "pipeline.step.polishing" },
  { id: "finalizing", labelKey: "pipeline.step.finalizing" },
];

function stepIndex(stage: Stage) {
  if (stage === "idle") return -1;
  if (stage === "done") return STEPS.length;
  return STEPS.findIndex((s) => s.id === stage);
}

/**
 * Pipeline progress stepper.
 * queueTotal / queueDone are passed as props from page state — not window globals —
 * so they are always in sync with React's render cycle.
 */
export default function ProgressStepper({
  stage,
  queueTotal = 0,
  queueDone = 0,
}: {
  stage: Stage;
  queueTotal?: number;
  queueDone?: number;
}) {
  const uiLang = useUiLang();
  const t = (key: string) => translate(key, uiLang);

  // Read low-motion preference once after mount to avoid hydration mismatch.
  const [lowFx, setLowFx] = useState(false);
  useEffect(() => {
    const isLow =
      document.documentElement.dataset?.fx === "low" ||
      document.documentElement.dataset?.fx === "lite" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setLowFx(isLow);
  }, []);

  // Tick-based animation clock — resets on stage or progress changes.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (lowFx) return;
    if (stage === "idle" || stage === "done") return;
    setTick(0);
    const id = window.setInterval(() => setTick((x) => x + 1), 200);
    return () => window.clearInterval(id);
  }, [stage, queueDone, queueTotal, lowFx]);

  const idx = stepIndex(stage);

  // Animated progress bar value (0-100).
  const progress = useMemo(() => {
    if (stage === "idle") return 0;
    if (stage === "done") return 100;

    const realIdx = stepIndex(stage);
    // Floor at the real stage's position so bar never regresses.
    const stagePct = Math.max(0, realIdx) / STEPS.length * 100;

    if (queueTotal > 0) {
      const done = Math.max(0, Math.min(queueTotal, queueDone));
      const base = Math.max(stagePct, Math.floor((done / queueTotal) * 100));
      const nextMs = Math.floor((Math.min(done + 1, queueTotal) / queueTotal) * 100);
      const cap = Math.min(99, Math.max(base, nextMs - 1));
      const span = Math.max(0, cap - base);
      if (span <= 0) return Math.min(99, base);

      const learned = Number(lsGet(LS.avgMsPerUrl, ""));
      const expectedMs = Number.isFinite(learned) && learned > 0 ? learned : 13000;
      const expected = Math.max(3000, Math.min(60000, expectedMs));
      const elapsedMs = tick * 200;
      const k = Math.min(0.98, 1 - Math.exp(-elapsedMs / Math.max(1, expected * 0.4)));
      return Math.min(99, Math.round(base + span * k));
    }

    // No queue info: animate within the current stage's band.
    const bandWidth = 100 / STEPS.length;
    const k = Math.min(0.9, 1 - Math.exp(-(tick * 200) / 8000));
    return Math.min(99, Math.round(stagePct + bandWidth * k * 0.85));
  }, [stage, idx, queueTotal, queueDone, tick]);

  // displayStage: mirrors the real stage prop (which startPipeline timers + advanceStage
  // drive correctly now). Only preview the next stage when progress crosses a threshold
  // AND we're already in the preceding stage — prevents false "Polishing Done" jumps.
  const displayStage = useMemo<Stage>(() => {
    if (stage === "idle" || stage === "done") return stage;

    const realIdx = stepIndex(stage);
    const p = Math.max(0, Math.min(99, progress));
    const single = !queueTotal || queueTotal <= 1;
    const tPolish = single ? 64 : 78;
    const tFinal  = single ? 83 : 91;

    let simIdx = realIdx;
    // Only preview ahead from "generating" onwards.
    if (realIdx >= 1) {
      if (p >= tFinal) simIdx = Math.max(simIdx, 3);
      else if (p >= tPolish) simIdx = Math.max(simIdx, 2);
    }
    const di = Math.min(STEPS.length - 1, simIdx);
    return (STEPS[di]?.id as Stage) ?? stage;
  }, [stage, progress, queueTotal]);

  const displayIdx = stepIndex(displayStage);
  const active = displayStage !== "idle" && displayStage !== "done";

  return (
    <div className="relative overflow-hidden rounded-[var(--ct-radius)] border border-[color:var(--ct-border)] bg-[color:var(--ct-panel)] p-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold tracking-tight">{t("pipeline.title")}</div>
        <div className={clsx("text-xs", active ? "opacity-80" : "opacity-60")}>
          {displayStage === "idle"
            ? "Ready"
            : displayStage === "done"
              ? "Completed"
              : queueTotal > 0
                ? `${queueDone} / ${queueTotal}`
                : "Working…"}
        </div>
      </div>

      {/* Progress rail */}
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/8">
        {lowFx ? (
          <div
            className="h-full rounded-full transition-[width] duration-500"
            style={{
              width: `${progress}%`,
              background: "linear-gradient(90deg, var(--ct-accent), var(--ct-accent-2, var(--ct-accent)))",
            }}
          />
        ) : (
          <motion.div
            className="h-full rounded-full"
            style={{
              background:
                "linear-gradient(90deg, var(--ct-accent), color-mix(in srgb, var(--ct-accent-2, var(--ct-accent)) 85%, white 15%))",
            }}
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ type: "spring", stiffness: 160, damping: 28 }}
          />
        )}
      </div>

      {/* Step cards — 2-col on mobile, 4-col on desktop */}
      <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
        {STEPS.map((s, i) => {
          const done    = displayIdx > i || displayStage === "done";
          const current = displayIdx === i && displayStage !== "done";
          return (
            <div
              key={s.id}
              className={clsx(
                "relative overflow-hidden rounded-xl border px-2.5 py-2.5",
                "border-[color:var(--ct-border)] bg-[color:var(--ct-surface)]",
              )}
            >
              <div className="flex items-center justify-between gap-1">
                <div className="text-[11px] font-semibold leading-tight">{t(s.labelKey)}</div>
                <div
                  className="shrink-0 h-2 w-2 rounded-full transition-colors duration-300"
                  style={{
                    background: done
                      ? "var(--ct-accent)"
                      : current
                        ? "rgba(255,255,255,.55)"
                        : "rgba(255,255,255,.14)",
                  }}
                />
              </div>

              <div className="mt-1.5 text-[10px] opacity-60">
                {done
                  ? t("pipeline.step.done")
                  : current
                    ? t("pipeline.step.inProgress")
                    : t("pipeline.step.pending")}
              </div>

              {/* Shimmer on active step — skipped in low-motion */}
              {current && !lowFx ? (
                <motion.div
                  className="absolute inset-0 opacity-20"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent, rgba(255,255,255,.3), transparent)",
                  }}
                  initial={{ x: "-120%" }}
                  animate={{ x: "120%" }}
                  transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
                />
              ) : null}

              {/* Accent glow border on active step */}
              {current && !lowFx ? (
                <div
                  className="pointer-events-none absolute inset-0 rounded-xl"
                  style={{
                    boxShadow:
                      "0 0 0 1px color-mix(in srgb, var(--ct-accent) 35%, transparent) inset",
                  }}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
