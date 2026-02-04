"use client";

import { motion } from "framer-motion";
import clsx from "clsx";

export type Stage = "idle" | "fetching" | "generating" | "polishing" | "finalizing" | "done";

const STEPS: Array<{ id: Exclude<Stage, "idle" | "done">; label: string }> = [
  { id: "fetching", label: "Fetching" },
  { id: "generating", label: "Generating" },
  { id: "polishing", label: "Polishing" },
  { id: "finalizing", label: "Finalizing" },
];

function stepIndex(stage: Stage) {
  if (stage === "idle") return -1;
  if (stage === "done") return STEPS.length;
  return STEPS.findIndex((s) => s.id === stage);
}

export default function ProgressStepper({ stage }: { stage: Stage }) {
  const idx = stepIndex(stage);
  const active = idx >= 0 && stage !== "done";

  // UI-only "feel" progress. We don't get real-time % from the backend,
  // but this gives users a confident sense of forward motion.
  const progress = stage === "idle" ? 0 : stage === "done" ? 100 : Math.round(((idx + 1) / STEPS.length) * 100);

  return (
    <div className="relative overflow-hidden rounded-[var(--ct-radius)] border border-[color:var(--ct-border)] bg-[color:var(--ct-panel)] p-4 backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold tracking-tight">Pipeline</div>
        <div className={clsx("text-xs", active ? "opacity-80" : "opacity-60")}>
          {stage === "idle" ? "Ready" : stage === "done" ? "Completed" : "Working…"}
        </div>
      </div>

      {/* Premium progress rail */}
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full border border-[color:var(--ct-border)] bg-white/5">
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
      </div>

      {/* Use `lg` so "Desktop site" on mobile doesn't squeeze the pipeline grid */}
      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {STEPS.map((s, i) => {
          const done = idx > i || stage === "done";
          const current = idx === i && stage !== "done";
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
                <div className="text-xs font-semibold">{s.label}</div>
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
                {done ? "Done" : current ? "In progress" : "Pending"}
              </div>

              {current ? (
                <motion.div
                  className="absolute inset-0 opacity-30"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent, rgba(255,255,255,.20), transparent)",
                  }}
                  initial={{ x: "-120%" }}
                  animate={{ x: "120%" }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
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
