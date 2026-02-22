"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

// Premium splash shown on hard refresh / first mount.
// Keeps it short and respects reduced-motion.

function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  try {
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches || false;
  } catch {
    return false;
  }
}

export default function SplashScreen({
  show,
  onDone,
}: {
  show: boolean;
  onDone: () => void;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!show) return;
    const reduced = prefersReducedMotion();
    const t = window.setTimeout(() => {
      setReady(true);
      onDone();
    }, reduced ? 350 : 850);
    return () => window.clearTimeout(t);
  }, [show, onDone]);

  return (
    <AnimatePresence>
      {show && !ready && (
        <motion.div
          key="ct-splash"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] grid place-items-center bg-[color:var(--ct-bg)]"
        >
          <div className="relative w-full max-w-md px-6">
            <motion.div
              initial={{ scale: 0.98, y: 6, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 220, damping: 18 }}
              className="ct-card p-6"
            >
              <div className="flex items-center gap-3">
                <div className="relative h-10 w-10 overflow-hidden rounded-2xl">
                  <Image src="/logo.png" alt="CrownTALK" fill className="object-cover" priority />
                </div>
                <div>
                  <div className="text-sm font-semibold tracking-tight">CrownTALK Pro</div>
                  <div className="text-xs opacity-70 -mt-0.5">Warming up your workspace…</div>
                </div>
              </div>

              <div className="mt-5">
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    initial={{ x: "-40%" }}
                    animate={{ x: "140%" }}
                    transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
                    className="h-full w-1/2 rounded-full bg-white/25"
                  />
                </div>
                <div className="mt-2 text-[11px] opacity-60">Loading UI, restoring history, syncing tabs</div>
              </div>
            </motion.div>

            <motion.div
              aria-hidden
              className="pointer-events-none absolute -inset-10 -z-10 blur-3xl opacity-40"
              initial={{ opacity: 0.15 }}
              animate={{ opacity: 0.4 }}
              transition={{ duration: 0.9 }}
              style={{
                background:
                  "radial-gradient(closest-side, rgba(255,255,255,.18), rgba(0,0,0,0) 70%)",
              }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
