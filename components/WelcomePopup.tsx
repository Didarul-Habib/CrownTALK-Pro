"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MOTION } from "@/lib/motion";

const LS_KEY = "ct_welcome_bd_day_v1";
const TZ = "Asia/Dhaka";

function bdParts(now: Date) {
  const dtf = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = dtf.formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type == t)?.value || "00";
  return {
    y: int(get("year")),
    mo: int(get("month")),
    d: int(get("day")),
    h: int(get("hour")),
    m: int(get("minute")),
  };
}

function int(s: string) {
  try {
    return Number.parseInt(s, 10) || 0;
  } catch {
    return 0;
  }
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function bdDayKey(now: Date): string {
  const p = bdParts(now);
  // reset at 6 AM; before 6 AM counts as "previous" product day
  let y = p.y, mo = p.mo, d = p.d;
  if (p.h < 6) {
    // subtract one day (in Dhaka terms) by approximating with UTC then recalculating
    // Good enough for the daily popup; avoids heavy date libs.
    const approx = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const prev = bdParts(approx);
    y = prev.y;
    mo = prev.mo;
    d = prev.d;
  }
  return `${y}-${pad2(mo)}-${pad2(d)}`;
}

export default function WelcomePopup() {
  const [open, setOpen] = useState(false);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    try {
      const key = bdDayKey(new Date());
      const last = localStorage.getItem(LS_KEY);
      if (last !== key) {
        localStorage.setItem(LS_KEY, key);
        setOpen(true);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    // basic focus management
    const t = window.setTimeout(() => closeBtnRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[60] grid place-items-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: MOTION.dur.base, ease: MOTION.ease }}
          role="dialog"
          aria-modal="true"
          aria-label="Welcome"
        >
          <div
            className="absolute inset-0 bg-black/55 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          <motion.div
            className="relative w-full max-w-lg rounded-[var(--ct-radius)] border border-white/12 bg-[color:var(--ct-panel)] p-5 shadow-2xl backdrop-blur-xl"
            initial={{ y: 12, scale: 0.98, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 10, scale: 0.98, opacity: 0 }}
            transition={{ duration: MOTION.dur.slow, ease: MOTION.ease }}
          >
            <div className="pointer-events-none absolute -inset-1 rounded-[var(--ct-radius)] bg-gradient-to-r from-white/10 via-transparent to-white/10 blur-xl opacity-60" />

            <div className="relative">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold tracking-tight">Welcome back 👋</div>
                  <div className="mt-1 text-xs opacity-70">
                    Daily reset happens at <span className="font-semibold">6:00 AM</span> Bangladesh time.
                  </div>
                </div>
                <button
                  ref={closeBtnRef}
                  className="ct-btn ct-btn-sm"
                  onClick={() => setOpen(false)}
                  aria-label="Close welcome"
                >
                  Close
                </button>
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm opacity-90">
                Tip: paste multiple X post URLs at once. We will auto-detect, validate, and generate premium comments.
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
