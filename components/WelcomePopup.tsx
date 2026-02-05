"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MOTION } from "@/lib/motion";
import { LS, lsGetJson } from "@/lib/storage";
import type { UserProfile } from "@/lib/persist";

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
  const [name, setName] = useState<string>("");
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
    // Optional personalization (uses cached profile, no network).
    try {
      const u = lsGetJson<UserProfile | null>(LS.user, null);
      const first = (u?.name || "").trim().split(/\s+/)[0] || "";
      setName(first);
    } catch {
      setName("");
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
                  <div className="text-sm font-semibold tracking-tight">
                    {(() => {
                      const h = bdParts(new Date()).h;
                      const g = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
                      return name ? `${g}, ${name} 👋` : `${g} 👋`;
                    })()}
                  </div>
                  <div className="mt-1 text-xs opacity-70">
                    Paste X post URLs, choose your style, and hit <span className="font-semibold">Generate</span>.
                  </div>
                </div>
                <button
                  ref={closeBtnRef}
                  className="ct-btn ct-btn-sm"
                  onClick={() => setOpen(false)}
                  aria-label="Close welcome"
                >
                  Start
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
