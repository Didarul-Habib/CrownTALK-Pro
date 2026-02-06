"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MOTION } from "@/lib/motion";
import { LS, lsGetJson } from "@/lib/storage";
import type { UserProfile } from "@/lib/persist";

const LS_KEY = "ct_welcome_bd_day_v2";
const TZ = "Asia/Dhaka";

/**
 * Bangladesh-time parts (no heavy date libs).
 */
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
  const get = (t: string) => parts.find((p) => p.type === t)?.value || "00";
  return {
    y: int(get("year")),
    mo: int(get("month")),
    d: int(get("day")),
    h: (() => {
      const hh = int(get("hour"));
      // Some browsers/Intl locales return "24" at midnight.
      return hh === 24 ? 0 : hh;
    })(),
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

/**
 * "Product day" key that resets at 6:00 AM Bangladesh time.
 * - Before 6 AM -> counts as previous day.
 */
function bdDayKey(now: Date): string {
  const p = bdParts(now);
  let y = p.y,
    mo = p.mo,
    d = p.d;

  if (p.h < 6) {
    const approx = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const prev = bdParts(approx);
    y = prev.y;
    mo = prev.mo;
    d = prev.d;
  }

  return `${y}-${pad2(mo)}-${pad2(d)}`;
}

function greeting(now: Date) {
  const h = now.getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export default function WelcomePopup() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState<string>("");
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  // Decide whether to show: once per BD-day, reset at 6 AM.
  useEffect(() => {
    try {
      const key = bdDayKey(new Date());
      const last = localStorage.getItem(LS_KEY);
      if (last !== key) {
        localStorage.setItem(LS_KEY, key);
        setOpen(true);
      }
    } catch {
      // ignore (SSR / privacy mode)
    }
  }, []);

  // Optional personalization (uses cached profile, no network).
  useEffect(() => {
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
    const t = window.setTimeout(() => closeBtnRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  const headline = useMemo(() => {
    const g = greeting(new Date());
    return name ? `${g}, ${name} 👋` : `${g} 👋`;
  }, [name]);

  const onStart = () => {
    setOpen(false);
    try {
      window.dispatchEvent(new Event("ct:open_onboarding"));
    } catch {
      // ignore
    }
  };

  return (
    <>
      {/* Local animation helpers (safe, lightweight). */}
      <style jsx global>{`
        @keyframes ctBorderShift {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes ctFloatIn {
          0% { transform: translateY(10px); opacity: 0; }
          100% { transform: translateY(0px); opacity: 1; }
        }
        .ct-border-spin {
          animation: ctBorderShift 14s linear infinite;
        }
      `}</style>

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
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
              onClick={() => setOpen(false)}
            />

            {/* Card */}
            <motion.div
              className="relative w-full max-w-lg rounded-[calc(var(--ct-radius)+10px)] border border-white/10 shadow-2xl"
              initial={{ y: 14, scale: 0.98, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 10, scale: 0.98, opacity: 0 }}
              transition={{ duration: MOTION.dur.slow, ease: MOTION.ease }}
            >
              {/* Animated gradient edge + glow */}
              <div className="pointer-events-none absolute -inset-[6px] opacity-90">
                {/* glow */}
                <div className="ct-border-spin absolute inset-0 rounded-[calc(var(--ct-radius)+16px)] bg-[conic-gradient(from_90deg,rgba(168,85,247,.55),rgba(34,211,238,.45),rgba(236,72,153,.45),rgba(168,85,247,.55))] blur-2xl" />
                {/* crisp ring */}
                <div className="ct-border-spin absolute inset-[4px] rounded-[calc(var(--ct-radius)+12px)] bg-[conic-gradient(from_90deg,rgba(168,85,247,.9),rgba(34,211,238,.8),rgba(236,72,153,.8),rgba(168,85,247,.9))]" />
                {/* cutout */}
                <div className="absolute inset-[6px] rounded-[calc(var(--ct-radius)+10px)] bg-transparent" />
              </div>

              {/* Inner panel */}
              <div className="relative overflow-hidden rounded-[calc(var(--ct-radius)+10px)] bg-[color:var(--ct-panel)]/70 backdrop-blur-xl">
                {/* Galaxy background image (place in /public/galaxy.jpg) */}
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage: "url(/galaxy.jpg)",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                />
                {/* Darken + soften for readability */}
                <div className="absolute inset-0 bg-black/55" />
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/15 via-transparent to-cyan-400/15" />
                {/* Subtle noise (optional feel) */}
                <div className="pointer-events-none absolute inset-0 opacity-[0.18] mix-blend-overlay" style={{
                  backgroundImage:
                    "radial-gradient(circle at 20% 20%, rgba(255,255,255,.18) 0 1px, transparent 2px), radial-gradient(circle at 70% 40%, rgba(255,255,255,.12) 0 1px, transparent 2px), radial-gradient(circle at 40% 80%, rgba(255,255,255,.10) 0 1px, transparent 2px)",
                  backgroundSize: "140px 140px",
                }} />

                <div className="relative p-5 sm:p-6">
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold tracking-tight text-white/95">
                        {headline}
                      </div>
                      <div className="mt-1 text-xs text-white/70">
                        Today&apos;s quick start:{" "}
                        <span className="text-white/85">paste 1 URL</span> →{" "}
                        <span className="text-white/85">pick a style</span> →{" "}
                        <span className="text-white/85">generate</span>.
                      </div>
                    </div>

                    <button
                      className="ct-btn ct-btn-sm"
                      onClick={() => setOpen(false)}
                      aria-label="Close welcome"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Steps */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {[
                      { n: "1", t: "Paste X URL" },
                      { n: "2", t: "Choose style" },
                      { n: "3", t: "Generate" },
                    ].map((s) => (
                      <div
                        key={s.n}
                        className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-3 py-2 text-xs text-white/80 backdrop-blur"
                      >
                        <span className="grid h-5 w-5 place-items-center rounded-full bg-white/10 text-[11px] font-semibold text-white/90">
                          {s.n}
                        </span>
                        <span className="font-medium">{s.t}</span>
                      </div>
                    ))}
                  </div>

                  {/* Tip + CTA row */}
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div className="text-xs text-white/70">
                      💡 Tip: Try <span className="font-semibold text-white/85">Fast mode</span>{" "}
                      for speedy replies.
                    </div>

                    <button
                      ref={closeBtnRef}
                      className="ct-btn"
                      onClick={onStart}
                    >
                      Start
                    </button>
                  </div>

                  {/* Feature chips */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {[
                      { icon: "⚡", t: "Fast mode" },
                      { icon: "🎯", t: "Tone match" },
                      { icon: "🧵", t: "Thread-ready" },
                      { icon: "✅", t: "Anti-cringe" },
                    ].map((c) => (
                      <button
                        key={c.t}
                        type="button"
                        onClick={onStart}
                        className="group inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-3 py-2 text-xs text-white/80 backdrop-blur transition active:scale-[0.98]"
                        aria-label={`Start with ${c.t}`}
                      >
                        <span className="opacity-90">{c.icon}</span>
                        <span className="font-medium">{c.t}</span>
                        <span className="ml-1 opacity-0 transition group-hover:opacity-80">→</span>
                      </button>
                    ))}
                  </div>

                  {/* Footer */}
                  <div className="mt-4 flex items-center justify-between text-[11px] text-white/55">
                    <button
                      type="button"
                      className="underline decoration-white/20 underline-offset-4 hover:text-white/70"
                      onClick={() => setOpen(false)}
                    >
                      Not now
                    </button>
                    <div>Resets daily at 6:00 AM (BD)</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
