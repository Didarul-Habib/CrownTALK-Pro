"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import { verifyAccess } from "@/lib/api";

export default function AccessGate({
  open,
  baseUrl,
  onClose,
  onToken,
}: {
  open: boolean;
  baseUrl: string;
  onClose: () => void;
  onToken: (token: string) => void;
}) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setErr(null);
    setBusy(true);
    try {
      const out = await verifyAccess(baseUrl, code.trim());
      if (!out.ok) throw new Error("Invalid code");
      onToken(out.token || "");
      onClose();
    } catch (e: any) {
      setErr(e?.message || "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className={clsx(
              "w-full max-w-md rounded-3xl border p-5 shadow-2xl backdrop-blur-xl",
              "bg-[color:var(--ct-panel)] border-[color:var(--ct-border)]"
            )}
            initial={{ y: 16, scale: 0.98, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 10, scale: 0.98, opacity: 0 }}
          >
            <div className="text-lg font-semibold tracking-tight">Access required</div>
            <p className="mt-1 text-sm opacity-75">
              Your backend requires an access code. Enter it once and we&apos;ll remember it on this device.
            </p>

            <div className="mt-4 space-y-2">
              <label className="text-xs opacity-70">Access code</label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className={clsx(
                  "w-full rounded-2xl border px-3 py-3 text-sm outline-none",
                  "bg-[color:var(--ct-surface)] border-[color:var(--ct-border)]",
                  "focus:ring-2 focus:ring-white/15"
                )}
                placeholder="Enter your CrownTALK access code"
              />
              {err ? <div className="text-sm text-red-300">{err}</div> : null}
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={onClose}
                className={clsx(
                  "rounded-2xl border px-4 py-2 text-sm transition",
                  "bg-transparent border-[color:var(--ct-border)] hover:bg-white/5"
                )}
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={busy || !code.trim()}
                className={clsx(
                  "rounded-2xl px-4 py-2 text-sm font-medium transition",
                  "bg-[color:var(--ct-accent)] text-black hover:brightness-110",
                  "disabled:opacity-50"
                )}
              >
                {busy ? "Verifying…" : "Unlock"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
