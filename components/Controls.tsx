"use client";

import clsx from "clsx";
import type { Intent, Tone } from "@/lib/types";

const NATIVE_LANGS = [
  { value: "bn", label: "Bengali (bn)" },
  { value: "hi", label: "Hindi (hi)" },
  { value: "ar", label: "Arabic (ar)" },
  { value: "ur", label: "Urdu (ur)" },
  { value: "id", label: "Indonesian (id)" },
  { value: "es", label: "Spanish (es)" },
];

export default function Controls({
  langEn,
  setLangEn,
  langNative,
  setLangNative,
  nativeLang,
  setNativeLang,
  tone,
  setTone,
  intent,
  setIntent,
  includeAlternates,
  setIncludeAlternates,
  baseUrl,
  setBaseUrl,
  onGenerate,
  loading,
}: {
  langEn: boolean;
  setLangEn: (v: boolean) => void;
  langNative: boolean;
  setLangNative: (v: boolean) => void;
  nativeLang: string;
  setNativeLang: (v: string) => void;
  tone: Tone;
  setTone: (v: Tone) => void;
  intent: Intent;
  setIntent: (v: Intent) => void;
  includeAlternates: boolean;
  setIncludeAlternates: (v: boolean) => void;
  baseUrl: string;
  setBaseUrl: (v: string) => void;
  onGenerate: () => void;
  loading: boolean;
}) {
  return (
    <div className="rounded-[var(--ct-radius)] border border-[color:var(--ct-border)] bg-[color:var(--ct-panel)] p-4 backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold tracking-tight">Controls</div>
        <button
          onClick={onGenerate}
          disabled={loading}
          className={clsx(
            "rounded-2xl px-4 py-2 text-sm font-semibold transition",
            "border border-[color:var(--ct-border)]",
            loading
              ? "opacity-70 cursor-not-allowed bg-white/10"
              : "bg-[color:var(--ct-accent)]/15 hover:bg-[color:var(--ct-accent)]/25"
          )}
        >
          {loading ? "Generating…" : "Generate"}
        </button>
      </div>

      <div className="mt-4">
        <label className="text-xs opacity-70">Backend URL</label>
        <input
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          className={clsx(
            "mt-2 w-full rounded-2xl border px-3 py-2 text-sm outline-none",
            "bg-[color:var(--ct-surface)] border-[color:var(--ct-border)]",
            "focus:ring-2 focus:ring-white/15"
          )}
          placeholder="https://crowntalk.onrender.com"
          spellCheck={false}
        />
        <div className="mt-1 text-[11px] opacity-60">
          Tip: keep your old site + new site both pointing to the same backend.
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <div className="text-xs opacity-70">Languages</div>
          <div className="flex gap-2">
            <ToggleChip on={langEn} label="English" onClick={() => setLangEn(!langEn)} />
            <ToggleChip on={langNative} label="Native" onClick={() => setLangNative(!langNative)} />
          </div>

          {langNative ? (
            <div className="pt-2">
              <label className="text-xs opacity-70">Native language</label>
              <select
                value={nativeLang}
                onChange={(e) => setNativeLang(e.target.value)}
                className={clsx(
                  "mt-2 w-full rounded-2xl border px-3 py-2 text-sm outline-none",
                  "bg-[color:var(--ct-surface)] border-[color:var(--ct-border)]"
                )}
              >
                {NATIVE_LANGS.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs opacity-70">Tone</label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value as Tone)}
              className={clsx(
                "mt-2 w-full rounded-2xl border px-3 py-2 text-sm outline-none",
                "bg-[color:var(--ct-surface)] border-[color:var(--ct-border)]"
              )}
            >
              <option value="professional">Professional</option>
              <option value="casual">Casual</option>
              <option value="bold">Bold</option>
              <option value="friendly">Friendly</option>
            </select>
          </div>

          <div>
            <label className="text-xs opacity-70">Intent</label>
            <select
              value={intent}
              onChange={(e) => setIntent(e.target.value as Intent)}
              className={clsx(
                "mt-2 w-full rounded-2xl border px-3 py-2 text-sm outline-none",
                "bg-[color:var(--ct-surface)] border-[color:var(--ct-border)]"
              )}
            >
              <option value="neutral">Neutral</option>
              <option value="agree">Agree+</option>
              <option value="question">Question</option>
              <option value="soft_pushback">Soft pushback</option>
            </select>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <input
          id="alts"
          type="checkbox"
          checked={includeAlternates}
          onChange={(e) => setIncludeAlternates(e.target.checked)}
          className="h-4 w-4 accent-[color:var(--ct-accent)]"
        />
        <label htmlFor="alts" className="text-sm opacity-85">
          Include alternates <span className="text-xs opacity-60">(power)</span>
        </label>
      </div>
    </div>
  );
}

function ToggleChip({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "rounded-2xl border px-4 py-2 text-sm transition",
        on
          ? "bg-white/10 border-white/20"
          : "bg-[color:var(--ct-surface)] border-[color:var(--ct-border)] hover:bg-white/5"
      )}
    >
      {label}
    </button>
  );
}
