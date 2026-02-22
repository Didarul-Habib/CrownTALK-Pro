"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MOTION } from "@/lib/motion";

type Step = {
  id: string;
  title: string;
  body: string;
  targetId: string;
};

const LS_KEY = "ct_onboarding_done_v1";

function rectFor(targetId: string) {
  if (typeof window === "undefined") return null;
  const el = document.getElementById(targetId);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return {
    top: Math.max(8, r.top + window.scrollY),
    left: Math.max(8, r.left + window.scrollX),
    width: r.width,
    height: r.height,
  };
}

export default function OnboardingTour() {
  const steps: Step[] = useMemo(
    () => [
      {
        id: "urls",
        title: "1) Paste URLs",
        body: "Paste one or more X post links. You can reorder, group by domain, and preview the inbox before generating.",
        targetId: "ct-url-input",
      },
      {
        id: "controls",
        title: "2) Choose your style",
        body: "Pick language, tone, and intent. These settings are saved as your defaults in Preferences.",
        targetId: "ct-controls",
      },
      {
        id: "generate",
        title: "3) Generate",
        body: "Hit Generate. You’ll see a per-URL timeline and retries for failures.",
        targetId: "ct-generate",
      },
      {
        id: "results",
        title: "4) Results",
        body: "Copy, reroll, compare versions, and open the run summary dashboard for insights.",
        targetId: "ct-results",
      },
    ],
    []
  );

  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const step = steps[idx];

  useEffect(() => {
    const onOpen = () => {
      try {
        const done = localStorage.getItem(LS_KEY);
        if (done) return;
      } catch {}
      setIdx(0);
      setOpen(true);
    };
    window.addEventListener("ct:open_onboarding", onOpen as any);
    return () => window.removeEventListener("ct:open_onboarding", onOpen as any);
  }, []);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      const r = rectFor(step.targetId);
      if (r) window.scrollTo({ top: Math.max(0, r.top - 140), behavior: "smooth" as any });
    }, 50);
    return () => window.clearTimeout(t);
  }, [open, idx, step?.targetId]);

  function close(done: boolean) {
    setOpen(false);
    if (done) {
      try {
        localStorage.setItem(LS_KEY, "1");
      } catch {}
    }
  }

  const r = open ? rectFor(step.targetId) : null;

  return (
    <AnimatePresence>
      {open && step ? (
        <motion.div
          className="fixed inset-0 z-[70]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: MOTION.dur.base, ease: MOTION.ease }}
          aria-modal="true"
          role="dialog"
          aria-label="Onboarding"
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => close(false)} />

          {r ? (
            <div
              className="pointer-events-none absolute rounded-[var(--ct-radius)] border border-white/25"
              style={{ top: r.top, left: r.left, width: r.width, height: r.height, boxShadow: "0 0 0 9999px rgba(0,0,0,.35)" }}
            />
          ) : null}

          <motion.div
            className="absolute left-1/2 top-24 w-[min(520px,calc(100vw-24px))] -translate-x-1/2"
            initial={{ y: 10, scale: 0.98, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 10, scale: 0.98, opacity: 0 }}
            transition={{ duration: MOTION.dur.slow, ease: MOTION.ease }}
          >
            <div className="ct-card p-5">
              <div className="text-sm font-semibold tracking-tight">{step.title}</div>
              <div className="mt-1 text-xs opacity-75 leading-relaxed">{step.body}</div>

              <div className="mt-4 flex items-center justify-between gap-2">
                <div className="text-[11px] opacity-60">
                  Step {idx + 1} of {steps.length}
                </div>
                <div className="flex items-center gap-2">
                  <button className="ct-btn ct-btn-sm" onClick={() => close(true)}>
                    Skip
                  </button>
                  <button
                    className="ct-btn ct-btn-sm"
                    onClick={() => setIdx((p) => Math.max(0, p - 1))}
                    disabled={idx === 0}
                  >
                    Back
                  </button>
                  <button
                    className="ct-btn ct-btn-sm"
                    onClick={() => {
                      if (idx >= steps.length - 1) close(true);
                      else setIdx((p) => p + 1);
                    }}
                  >
                    {idx >= steps.length - 1 ? "Done" : "Next"}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
