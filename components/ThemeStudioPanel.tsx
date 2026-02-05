"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

type Vars = {
  "--ct-accent": string;
  "--ct-accent-2": string;
  "--ct-radius": string;
};

const KEY = "ct.theme.custom.v1";

function loadVars(): Vars {
  if (typeof window === "undefined") return { "--ct-accent": "rgba(112, 168, 255, 1)", "--ct-accent-2": "rgba(255, 140, 210, 1)", "--ct-radius": "22px" };
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "null");
    if (v && v["--ct-accent"]) return v as Vars;
  } catch {}
  return { "--ct-accent": "rgba(112, 168, 255, 1)", "--ct-accent-2": "rgba(255, 140, 210, 1)", "--ct-radius": "22px" };
}

function apply(vars: Vars) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
}

export default function ThemeStudioPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [vars, setVars] = useState<Vars>(loadVars());

  useEffect(() => {
    if (!open) return;
    setVars(loadVars());
  }, [open]);

  useEffect(() => {
    if (!open) return;
    apply(vars);
    try {
      localStorage.setItem(KEY, JSON.stringify(vars));
    } catch {}
  }, [vars, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] hidden md:flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl rounded-[var(--ct-radius)] border border-[color:var(--ct-border)] bg-[color:var(--ct-panel)] p-5 shadow-[0_30px_90px_rgba(0,0,0,.55)]">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold tracking-tight">Theme Studio</div>
          <button className="ct-btn ct-btn-xs" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4">
          <Field label="Accent (primary)" value={vars["--ct-accent"]} onChange={(v) => setVars((p) => ({ ...p, "--ct-accent": v }))} />
          <Field label="Accent (secondary)" value={vars["--ct-accent-2"]} onChange={(v) => setVars((p) => ({ ...p, "--ct-accent-2": v }))} />
          <Field label="Corner radius" value={vars["--ct-radius"]} onChange={(v) => setVars((p) => ({ ...p, "--ct-radius": v }))} hint='Examples: "18px", "26px"' />
        </div>

        <div className="mt-5 text-xs opacity-70">Desktop-only. Settings are stored locally in your browser.</div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, hint }: { label: string; value: string; onChange: (v: string) => void; hint?: string }) {
  return (
    <div className="space-y-1">
      <div className="text-xs opacity-80">{label}</div>
      <input className="ct-input w-full" value={value} onChange={(e) => onChange(e.target.value)} />
      {hint ? <div className="text-[11px] opacity-60">{hint}</div> : null}
    </div>
  );
}
