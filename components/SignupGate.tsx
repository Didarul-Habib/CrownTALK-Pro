"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import { Lock, User, X, KeyRound, ShieldCheck, Trash2 } from "lucide-react";
import { verifyAccess } from "@/lib/api";
import { LS, lsGetJson, lsSetJson } from "@/lib/storage";
import type { UserProfile } from "@/lib/persist";

async function sha256Hex(input: string): Promise<string> {
  try {
    if (typeof crypto === "undefined" || !crypto.subtle || typeof TextEncoder === "undefined") {
      // Very old browsers; fall back to a plain string (still stored only locally).
      return `plain:${input}`;
    }
    const enc = new TextEncoder().encode(input);
    const hash = await crypto.subtle.digest("SHA-256", enc);
    return Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return `plain:${input}`;
  }
}

function normalizeXUrl(raw: string) {
  const v = (raw || "").trim();
  if (!v) return "";
  // Accept x.com or twitter.com URLs; add protocol if missing.
  if (/^https?:\/\//i.test(v)) return v;
  return `https://${v}`;
}

export default function SignupGate({
  open,
  baseUrl,
  onClose,
  onAuthed,
}: {
  open: boolean;
  baseUrl: string;
  onClose: () => void;
  onAuthed: (profile: UserProfile, token: string) => void;
}) {
  const stored = useMemo(() => lsGetJson<UserProfile | null>(LS.user, null), [open]);

  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [name, setName] = useState("");
  const [xUrl, setXUrl] = useState("");
  const [password, setPassword] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setErr(null);
    // If a profile exists, default to sign-in; otherwise sign-up.
    setMode(stored ? "signin" : "signup");

    if (stored) {
      setName(stored.name || "");
      setXUrl(stored.xUrl || "");
    } else {
      setName("");
      setXUrl("");
    }
    setPassword("");
    setAccessCode("");
  }, [open, stored]);

  function clearLocalAccount() {
    try {
      localStorage.removeItem(LS.user);
    } catch {}
    setMode("signup");
    setName("");
    setXUrl("");
    setPassword("");
    setAccessCode("");
    setErr(null);
  }

  async function submit() {
    setErr(null);
    const trimmedName = (name || "").trim();
    const normX = normalizeXUrl(xUrl);
    const pw = (password || "").trim();
    const code = (accessCode || "").trim();

    if (mode === "signup") {
      if (trimmedName.length < 2) return setErr("Please enter your name.");
      if (pw.length < 6) return setErr("Password must be at least 6 characters.");
      if (!code) return setErr("Access code is required.");
    } else {
      if (pw.length < 1) return setErr("Enter your password.");
      if (!code) return setErr("Access code is required.");
    }

    setBusy(true);
    try {
      // Verify the access code with backend and receive the access token.
      const out = await verifyAccess(baseUrl, code);
      if (!out.ok) throw new Error("Invalid access code");

      const pwHash = await sha256Hex(pw);

      if (mode === "signin") {
        if (!stored) throw new Error("No account found on this device. Please sign up first.");
        if (stored.passwordHash && stored.passwordHash !== pwHash) {
          throw new Error("Wrong password.");
        }

        onAuthed(stored, out.token || "");
        onClose();
        return;
      }

      const profile: UserProfile = {
        name: trimmedName,
        xUrl: normX,
        passwordHash: pwHash,
        createdAt: Date.now(),
      };

      lsSetJson(LS.user, profile);
      onAuthed(profile, out.token || "");
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
              "w-full max-w-lg rounded-3xl border p-5 shadow-2xl backdrop-blur-xl",
              "bg-[color:var(--ct-panel)] border-[color:var(--ct-border)]"
            )}
            initial={{ y: 16, scale: 0.98, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 10, scale: 0.98, opacity: 0 }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-semibold tracking-tight">
                  {mode === "signup" ? "Sign up to generate" : "Welcome back"}
                </div>
                <p className="mt-1 text-sm opacity-75">
                  {mode === "signup"
                    ? "Create your local profile and unlock CrownTALK using your site access code."
                    : "Enter your password and site access code to unlock CrownTALK."}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="ct-chip text-[11px]">
                  <ShieldCheck className="h-4 w-4 opacity-80" />
                  Access-gated
                </span>
              </div>
            </div>

            <div className="mt-5 grid gap-4">
              {mode === "signup" ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Your name"
                    icon={<User className="h-4 w-4" />}
                    value={name}
                    onChange={setName}
                    placeholder="e.g. Alex"
                    autoFocus
                  />
                  <Field
                    label="X profile link"
                    icon={<X className="h-4 w-4" />}
                    value={xUrl}
                    onChange={setXUrl}
                    placeholder="https://x.com/yourhandle"
                  />
                </div>
              ) : (
                <div className="rounded-2xl border border-[color:var(--ct-border)] bg-[color:var(--ct-surface)] p-3 text-sm">
                  <div className="opacity-80">Signing in as</div>
                  <div className="mt-1 font-semibold tracking-tight break-words">{stored?.name}</div>
                  {stored?.xUrl ? (
                    <a
                      href={stored.xUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-2 text-xs opacity-80 hover:opacity-100 break-all"
                    >
                      <X className="h-4 w-4" />
                      {stored.xUrl}
                    </a>
                  ) : null}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Password"
                  icon={<KeyRound className="h-4 w-4" />}
                  value={password}
                  onChange={setPassword}
                  placeholder="••••••••"
                  type="password"
                />
                <Field
                  label="Site access code"
                  icon={<Lock className="h-4 w-4" />}
                  value={accessCode}
                  onChange={setAccessCode}
                  placeholder="Enter your CrownTALK access code"
                  type="password"
                />
              </div>

              {err ? <div className="text-sm text-red-300">{err}</div> : null}
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                {stored ? (
                  <button
                    type="button"
                    className="ct-btn ct-btn-xs"
                    onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
                  >
                    {mode === "signup" ? "Already signed up? Sign in" : "New on this device? Sign up"}
                  </button>
                ) : null}

                {stored ? (
                  <button
                    type="button"
                    className="ct-btn ct-btn-xs ct-btn-danger"
                    onClick={clearLocalAccount}
                    title="Remove the saved account from this device"
                  >
                    <Trash2 className="h-4 w-4" />
                    Reset local account
                  </button>
                ) : null}
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={onClose}
                  className="ct-btn ct-btn-sm"
                  type="button"
                >
                  Cancel
                </button>
                <button
                  onClick={submit}
                  disabled={busy}
                  className={clsx("ct-btn ct-btn-primary ct-btn-sm", busy ? "opacity-70" : "")}
                  type="button"
                >
                  {busy ? "Unlocking…" : mode === "signup" ? "Create & unlock" : "Unlock"}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function Field({
  label,
  icon,
  value,
  onChange,
  placeholder,
  type = "text",
  autoFocus,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  autoFocus?: boolean;
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs opacity-70">{label}</label>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 opacity-70">{icon}</div>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          type={type}
          autoFocus={autoFocus}
          className={clsx(
            "w-full rounded-2xl border px-10 py-3 text-sm outline-none",
            "bg-[color:var(--ct-surface)] border-[color:var(--ct-border)]",
            "focus:ring-2 focus:ring-white/15"
          )}
          placeholder={placeholder}
          spellCheck={false}
        />
      </div>
    </div>
  );
}
