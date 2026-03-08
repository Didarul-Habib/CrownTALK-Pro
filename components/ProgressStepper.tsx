"use client";

import { motion } from "framer-motion";
import clsx from "clsx";
import { translate, useUiLang } from "@/lib/i18n";
import { LS, lsGet } from "@/lib/storage";
import { useEffect, useMemo, useState } from "react";

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

export default function ProgressStepper({ stage }: { stage: Stage }) {
  const uiLang = useUiLang();
  const t = (key: string) => translate(key, uiLang);

  const isLowMotion =
    typeof window !== "undefined" &&
    window.document?.documentElement?.dataset?.fx === "low";

  // Non-breaking: the page writes queue stats into window for this component.
  const queueTotal = typeof window !== "undefined" ? Number((window as any).__ct_queueTotal || 0) : 0;
  const queueDone = typeof window !== "undefined" ? Number((window as any).__ct_queueDone || 0) : 0;

  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (stage === "idle" || stage === "done") return;
    // Reset the animation clock whenever a new segment starts.
    setTick(0);
    const intervalMs = isLowMotion ? 700 : 250;
    const id = window.setInterval(() => setTick((x) => x + 1), intervalMs);
    return () => window.clearInterval(id);
  }, [stage, isLowMotion, queueDone, queueTotal]);

  const idx = stepIndex(stage);
  const tickMs = isLowMotion ? 700 : 250;

  // Animated "feel" progress.
  // Goal: make the bar move in a time-realistic way (learned ms/url), so we can
  // preview Polishing/Finalizing on single-link runs without hardcoded timers.
  const progress = useMemo(() => {
    if (stage === "idle") return 0;
    if (stage === "done") return 100;

    // If queue info is available, animate within the current URL segment.
    if (queueTotal && queueTotal > 0) {
      const done = Math.max(0, Math.min(queueTotal, queueDone));
      const base = Math.floor((done / queueTotal) * 100);
      const next = Math.floor((Math.min(done + 1, queueTotal) / queueTotal) * 100);

      // Never exceed the next real milestone (keeps it honest).
      const cap = Math.max(base, Math.min(99, next - 1));
      const span = Math.max(0, cap - base);
      if (span <= 0) return Math.min(99, base);

      // Learned average (ms/url). Falls back to a sane default.
      const learned = Number(lsGet(LS.avgMsPerUrl, ""));
      const expectedMsPerItem = Number.isFinite(learned) ? learned : 14000;
      const expected = Math.max(4000, Math.min(60000, expectedMsPerItem));

      // Ease curve: reaches ~90% of the span around `expected`.
      const elapsedMs = tick * tickMs;
      const tau = expected * 0.45;
      const k = Math.min(0.985, 1 - Math.exp(-elapsedMs / Math.max(1, tau)));

      return Math.min(99, Math.round(base + span * k));
    }

    // Fallback: stage-only progress.
    const clampedIdx = Math.max(0, idx);
    const base = (clampedIdx / STEPS.length) * 100;
    const extra = stage === "finalizing" ? 8 : 0;
    return Math.min(99, Math.round(base + extra));
  }, [stage, idx, queueTotal, queueDone, tick, tickMs]);

  // Display stage: allow a gentle "preview" of Polishing/Finalizing based on animated progress.
  // This fixes the UX where 1-link runs look stuck in Generating then instantly complete.
  const displayStage = useMemo<Stage>(() => {
    if (stage === "idle" || stage === "done") return stage;

    const p = Math.max(0, Math.min(99, progress));

    // Progress bands (in %). Tuned so Polishing/Finalizing become visible *before* completion.
    // Single-link runs get slightly earlier thresholds so the UI never feels stuck.
    const single = !queueTotal || queueTotal <= 1;
    const tFetch = single ? 18 : 22;
    const tPolish = single ? 70 : 82;
    const tFinal = single ? 88 : 94;
    const simIdx = p < tFetch ? 0 : p < tPolish ? 1 : p < tFinal ? 2 : 3;
    const realIdx = stepIndex(stage);
    const di = Math.max(realIdx, simIdx);

    const step = STEPS[Math.max(0, Math.min(STEPS.length - 1, di))];
    return (step?.id as Stage) || stage;
  }, [stage, progress, queueTotal]);

  const displayIdx = stepIndex(displayStage);
  const active = displayStage !== "idle" && displayStage !== "done";

  return (
    <div className="relative overflow-hidden rounded-[var(--ct-radius)] border border-[color:var(--ct-border)] bg-[color:var(--ct-panel)] p-3 backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold tracking-tight">{t("pipeline.title")}</div>
        <div className={clsx("text-xs", active ? "opacity-80" : "opacity-60")}>
          {displayStage === "idle" ? "Ready" : displayStage === "done" ? "Completed" : "Working…"}
        </div>
      </div>

      {/* Premium progress rail */}
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full border border-[color:var(--ct-border)] bg-white/5">
        {isLowMotion ? (
          <div
            className="h-full rounded-full transition-[width] duration-500 ease-out"
            style={{
              width: `${progress}%`,
              background:
                "linear-gradient(90deg, var(--ct-accent), color-mix(in srgb, var(--ct-accent-2) 85%, white 15%))",
            }}
          />
        ) : (
          <motion.div
            className="h-full rounded-full"
            style={{
              background:
                "linear-gradient(90deg, var(--ct-accent), color-mix(in srgb, var(--ct-accent-2) 85%, white 15%))",
            }}
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ type: "spring", stiffness: 220, damping: 28 }}
          />
        )}
      </div>

      {/* Use `lg` so \"Desktop site\" on mobile doesn't squeeze the pipeline grid */}
      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {STEPS.map((s, i) => {
          const done = displayIdx > i || displayStage === "done";
          const current = displayIdx === i && displayStage !== "done";
          return (
            <div
              key={s.id}
              className={clsx(
                "relative overflow-hidden rounded-2xl border px-3 py-3",
                "border-[color:var(--ct-border)] bg-[color:var(--ct-surface)]",
                current ? "shadow-[0_18px_60px_rgba(0,0,0,.45)]" : ""
              )}
            >
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold">{t(s.labelKey)}</div>
                <div
                  className="h-2.5 w-2.5 rounded-full"
                  style={{
                    background: done
                      ? "var(--ct-accent)"
                      : current
                        ? "rgba(255,255,255,.45)"
                        : "rgba(255,255,255,.16)",
                    boxShadow: done ? "0 0 16px rgba(255,255,255,.18)" : "none",
                  }}
                />
              </div>

              <div className="mt-2 text-[11px] opacity-70">
                {done ? t("pipeline.step.done") : current ? t("pipeline.step.inProgress") : t("pipeline.step.pending")}
              </div>

              {current && !isLowMotion ? (
                <motion.div
                  className="absolute inset-0 opacity-30"
                  style={{
                    background: "linear-gradient(90deg, transparent, rgba(255,255,255,.20), transparent)",
                  }}
                  initial={{ x: "-120%" }}
                  animate={{ x: "120%" }}
                  transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
                />
              ) : null}

              {current ? (
                <div
                  className="absolute inset-0"
                  style={{
                    boxShadow:
                      "0 0 0 1px rgba(255,255,255,.08) inset, 0 0 40px color-mix(in srgb, var(--ct-accent) 16%, transparent)",
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
