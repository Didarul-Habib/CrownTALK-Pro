"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import { Eye, EyeOff, KeyRound, Lock, ShieldCheck, Trash2, User, X } from "lucide-react";
import { login, signup, verifyAccess } from "@/lib/api";
import { LS, lsGetJson, lsSetJson } from "@/lib/storage";
import type { UserProfile } from "@/lib/persist";

function normalizeXUrl(raw: string) {
  let v = (raw || "").trim();
  if (!v) return "";
  if (v.startsWith("@")) v = v.slice(1).trim();

  // Already a URL
  if (/^https?:\/\//i.test(v)) return v;

  // Domain/path without protocol
  if (/^(?:www\.)?(?:x\.com|twitter\.com)\//i.test(v)) return `https://${v}`;

  // Assume handle
  const handle = v.split("/")[0].trim();
  return `https://x.com/${handle}`;
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
  onAuthed: (profile: UserProfile, accessToken: string, authToken: string) => void;
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

    if (!code) return setErr("Access code is required.");

    if (mode === "signup") {
      if (trimmedName.length < 2) return setErr("Please enter your name.");
      if (!normX) return setErr("Please enter your X profile link (or handle).");
      if (pw.length < 6) return setErr("Password must be at least 6 characters.");
    } else {
      if (!normX) return setErr("Please enter your X profile link (or handle).");
      if (pw.length < 1) return setErr("Enter your password.");
    }

    setBusy(true);
    try {
      // 1) Verify site access code -> we get a site access token
      const access = await verifyAccess(baseUrl, code);
      if (!access?.ok) throw new Error("Invalid access code");

      // 2) Server-side signup/login -> we get a session token
      if (mode === "signup") {
        const out = await signup(
          baseUrl,
          { name: trimmedName, x_link: normX, password: pw },
          access.token || ""
        );

        const profile: UserProfile = {
          id: out.user.id,
          name: out.user.name,
          xUrl: out.user.x_link,
          createdAt: Date.now(),
        };

        lsSetJson(LS.user, profile);
        onAuthed(profile, access.token || "", out.token || "");
        onClose();
        return;
      } else {
        const out = await login(
          baseUrl,
          { x_link: normX, password: pw },
          access.token || ""
        );

        const profile: UserProfile = {
          id: out.user.id,
          name: out.user.name,
          xUrl: out.user.x_link,
          createdAt: Date.now(),
        };

        lsSetJson(LS.user, profile);
        onAuthed(profile, access.token || "", out.token || "");
        onClose();
        return;
      }
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
              "relative w-full max-w-lg overflow-hidden rounded-3xl border p-5 shadow-2xl backdrop-blur-xl",
              "bg-[color:var(--ct-panel)] border-[color:var(--ct-border)]"
            )}
            initial={{ y: 16, scale: 0.98, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 10, scale: 0.98, opacity: 0 }}
          >
            {/* Premium animated glow */}
            <motion.div
              aria-hidden
              className="pointer-events-none absolute -inset-24 opacity-60 blur-3xl"
              style={{
                background:
                  "radial-gradient(700px 380px at 20% 15%, color-mix(in srgb, var(--ct-accent) 28%, transparent), transparent 62%)," +
                  "radial-gradient(640px 420px at 80% 25%, color-mix(in srgb, var(--ct-accent-2) 24%, transparent), transparent 64%)," +
                  "radial-gradient(720px 460px at 55% 85%, rgba(255,255,255,0.05), transparent 70%)",
              }}
              animate={{ opacity: [0.45, 0.65, 0.45] }}
              transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-25"
              style={{
                background:
                  "linear-gradient(135deg, color-mix(in srgb, var(--ct-accent) 18%, transparent), transparent 40%, color-mix(in srgb, var(--ct-accent-2) 14%, transparent))",
              }}
            />

            <div className="relative z-10">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-semibold tracking-tight">
                  {mode === "signup" ? "Sign up to generate" : "Sign in to generate"}
                </div>
                <p className="mt-1 text-sm opacity-75">
                  {mode === "signup"
                    ? "Create your CrownTALK account and unlock generation with your site access code."
                    : "Log in with your X link + password, then unlock with your site access code."}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="ct-chip text-[11px]">
                  <ShieldCheck className="h-4 w-4 opacity-80" />
                  Access-gated
                </span>

                <button
                  type="button"
                  className="ct-btn ct-btn-xs ct-btn-ghost"
                  onClick={onClose}
                  title="Close"
                >
                  <X className="h-4 w-4 opacity-80" />
                </button>
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
                    label="X profile link / handle"
                    icon={<X className="h-4 w-4" />}
                    value={xUrl}
                    onChange={setXUrl}
                    placeholder="https://x.com/yourhandle"
                  />
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="X profile link / handle"
                    icon={<X className="h-4 w-4" />}
                    value={xUrl}
                    onChange={setXUrl}
                    placeholder="https://x.com/yourhandle"
                    autoFocus={!stored}
                  />
                  <div className="rounded-2xl border border-[color:var(--ct-border)] bg-[color:var(--ct-surface)] p-3 text-sm">
                    <div className="opacity-80">Using profile</div>
                    <div className="mt-1 font-semibold tracking-tight break-words">
                      {stored?.name || ""}
                    </div>
                    <div className="mt-1 text-xs opacity-70 break-all">
                      {stored?.xUrl || ""}
                    </div>
                  </div>
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
                <button
                  type="button"
                  className="ct-btn ct-btn-xs"
                  onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
                >
                  {mode === "signup" ? "Already have an account? Sign in" : "New here? Sign up"}
                </button>

                {stored ? (
                  <button
                    type="button"
                    className="ct-btn ct-btn-xs ct-btn-danger"
                    onClick={clearLocalAccount}
                    title="Remove the saved profile from this device"
                  >
                    <Trash2 className="h-4 w-4" />
                    Reset local profile
                  </button>
                ) : null}
              </div>

              <div className="flex items-center justify-end gap-2">
                <button onClick={onClose} className="ct-btn ct-btn-sm" type="button">
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
  const isPassword = type === "password";
  const [reveal, setReveal] = useState(false);
  const inputType = isPassword && reveal ? "text" : type;

  return (
    <div className="space-y-2">
      <label className="text-xs opacity-70">{label}</label>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 opacity-70">{icon}</div>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          type={inputType}
          autoFocus={autoFocus}
          className={clsx(
            "w-full rounded-2xl border px-10 py-3 text-sm outline-none",
            isPassword ? "pr-11" : "pr-10",
            "bg-[color:var(--ct-surface)] border-[color:var(--ct-border)]",
            "focus:ring-2 focus:ring-white/15"
          )}
          placeholder={placeholder}
          spellCheck={false}
        />

        {isPassword ? (
          <button
            type="button"
            onClick={() => setReveal((v) => !v)}
            className={clsx(
              "absolute right-3 top-1/2 -translate-y-1/2",
              "opacity-70 hover:opacity-100 transition"
            )}
            aria-label={reveal ? "Hide password" : "Show password"}
            title={reveal ? "Hide" : "Show"}
          >
            {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        ) : null}
      </div>
    </div>
  );
}
