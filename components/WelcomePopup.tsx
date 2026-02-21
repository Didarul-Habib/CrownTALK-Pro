"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

const LS_KEY = "ct_welcome_seen_v3";

export default function WelcomePopup() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const seen = localStorage.getItem(LS_KEY);
      if (seen) return;

      // Small delay so the UI can paint first (reduces layout jank on mobile)
      const t = window.setTimeout(() => setOpen(true), 420);
      return () => window.clearTimeout(t);
    } catch {
      // If localStorage is unavailable (privacy mode), just don't block the UI.
      setOpen(true);
    }
  }, []);

  function onStart() {
    try {
      localStorage.setItem(LS_KEY, "1");
    } catch {}
    setOpen(false);
    try {
      window.dispatchEvent(new CustomEvent("ct:open_onboarding"));
    } catch {}
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.button
            type="button"
            aria-label="Close welcome"
            className="absolute inset-0 bg-black/50 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          />

          {/* Card */}
          <motion.div
            className="relative w-full max-w-lg"
            initial={{ y: 18, scale: 0.98, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 18, scale: 0.98, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
          >
            {/* Gradient halo ring (border-only via padding) */}
            <div className="relative rounded-[calc(var(--ct-radius)+18px)] p-[2px]">
              <div
                aria-hidden
                className="ct-border-spin pointer-events-none absolute inset-0 rounded-[calc(var(--ct-radius)+18px)] bg-[conic-gradient(from_140deg_at_50%_50%,rgba(34,211,238,0.75),rgba(129,140,248,0.9),rgba(236,72,153,0.9),rgba(34,211,238,0.75))] opacity-85 blur-[2px]"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-[calc(var(--ct-radius)+18px)] ring-1 ring-white/10"
              />

              <div className="relative overflow-hidden rounded-[calc(var(--ct-radius)+16px)] border border-white/10 bg-[color:var(--ct-panel)]/90 shadow-2xl backdrop-blur-2xl">
                {/* Background texture */}
                <div className="absolute inset-0 bg-gradient-to-br from-black/30 via-transparent to-black/40" />
                <div
                  className="absolute inset-0 opacity-30"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle at 20% 10%, rgba(255,255,255,0.10), transparent 40%), radial-gradient(circle at 85% 70%, rgba(255,255,255,0.06), transparent 44%), radial-gradient(circle at 30% 80%, rgba(255,255,255,0.05), transparent 48%)",
                  }}
                />

                {/* Close (top-right) */}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-white/5 text-white/80 transition hover:bg-white/10"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>

                <div className="relative p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-lg font-semibold tracking-tight">Good morning, Didarul 👋</div>
                      <div className="mt-1 text-sm opacity-80">Today's quick start: paste 1 URL → pick a style → generate.</div>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <button type="button" className="ct-btn ct-btn-sm" onClick={onStart}>
                      1&nbsp; Paste X URL
                    </button>
                    <button type="button" className="ct-btn ct-btn-sm" onClick={onStart}>
                      2&nbsp; Choose style
                    </button>
                    <button type="button" className="ct-btn ct-btn-sm" onClick={onStart}>
                      3&nbsp; Generate
                    </button>
                    <div className="flex-1" />
                    <button
                      type="button"
                      onClick={onStart}
                      className="ct-btn ct-btn-sm ct-btn-primary px-5 ring-1 ring-yellow-300/35 shadow-[0_0_0_1px_rgba(250,204,21,0.20),0_0_30px_rgba(250,204,21,0.10)]"
                    >
                      Start
                    </button>
                  </div>

                  <div className="mt-4 text-xs opacity-80">💡 Tip: Try <b>Fast mode</b> for speedy replies.</div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" className="ct-btn ct-btn-sm" onClick={onStart}>
                      ⚡&nbsp; Fast mode
                    </button>
                    <button type="button" className="ct-btn ct-btn-sm" onClick={onStart}>
                      🎯&nbsp; Tone match
                    </button>
                    <button type="button" className="ct-btn ct-btn-sm" onClick={onStart}>
                      🧵&nbsp; Thread-ready
                    </button>
                    <button type="button" className="ct-btn ct-btn-sm" onClick={onStart}>
                      ✅&nbsp; Anti-cringe
                    </button>
                  </div>

                  <div className="mt-5 flex items-center justify-between text-xs opacity-60">
                    <button type="button" className="underline underline-offset-2 hover:opacity-90" onClick={() => setOpen(false)}>
                      Not now
                    </button>
                    <span>Resets daily at 6:00 AM (BD)</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <style jsx global>{`
            @keyframes ct-border-spin {
              to {
                transform: rotate(360deg);
              }
            }
            .ct-border-spin {
              animation: ct-border-spin 6s linear infinite;
              will-change: transform;
            }
          `}</style>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
