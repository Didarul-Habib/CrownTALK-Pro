"use client";

import clsx from "clsx";
import { Ban, Eraser, Lock, Wand2 } from "lucide-react";
import type { Intent, Tone } from "@/lib/types";

const NATIVE_LANGS = [
  { value: "bn", label: "Bengali (bn)" },
  { value: "hi", label: "Hindi (hi)" },
  { value: "ar", label: "Arabic (ar)" },
  { value: "ur", label: "Urdu (ur)" },
  { value: "id", label: "Indonesian (id)" },
  { value: "es", label: "Spanish (es)" },
  { value: "zh", label: "Chinese (zh)" },
  { value: "ja", label: "Japanese (ja)" },
  { value: "ko", label: "Korean (ko)" },
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
  onGenerate,
  onCancel,
  onClear,
  loading,
  clearDisabled,
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
  onGenerate: () => void;
  onCancel?: () => void;
  onClear?: () => void;
  loading: boolean;
  clearDisabled?: boolean;
}) {
  return (
    <div className="rounded-[var(--ct-radius)] border border-[color:var(--ct-border)] bg-[color:var(--ct-panel)] p-4 backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold tracking-tight">Controls</div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            onClick={onGenerate}
            disabled={loading}
            className={clsx("ct-btn ct-btn-primary", loading ? "opacity-70 cursor-not-allowed" : "")}
          >
            <Wand2 className="h-4 w-4 opacity-80" />
            {loading ? "Generating…" : "Generate"}
          </button>

          <button
            type="button"
            onClick={onCancel}
            disabled={!loading}
            className={clsx(
              "ct-btn",
              "ct-btn-danger",
              !loading ? "opacity-55 cursor-not-allowed" : ""
            )}
            title={loading ? "Stop the current generation" : "Nothing running"}
          >
            <Ban className="h-4 w-4 opacity-80" />
            Cancel
          </button>

          <button
            type="button"
            onClick={onClear}
            disabled={!!clearDisabled || loading}
            className={clsx(
              "ct-btn",
              (clearDisabled || loading) ? "opacity-55 cursor-not-allowed" : ""
            )}
            title={loading ? "Stop first, then clear" : "Clear input + results"}
          >
            <Eraser className="h-4 w-4 opacity-80" />
            Clear
          </button>
        </div>
      </div>

      <div className="mt-4">
        <label className="text-xs opacity-70">Backend URL</label>
        <div className="mt-2 flex items-center gap-2">
          <div className="relative flex-1">
            <input
              value={baseUrl}
              readOnly
              className={clsx(
                "w-full rounded-2xl border px-3 py-2 pr-10 text-sm outline-none",
                "bg-[color:var(--ct-surface)] border-[color:var(--ct-border)]",
                "opacity-90"
              )}
              spellCheck={false}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-70">
              <Lock className="h-4 w-4" />
            </div>
          </div>
          <span className="ct-chip text-[11px]">
            <span
              className="h-2 w-2 rounded-full"
              style={{
                background: "var(--ct-ok)",
                boxShadow: "0 0 18px color-mix(in srgb, var(--ct-accent) 25%, transparent)",
                animation: "ct-float 1.8s ease-in-out infinite",
              }}
            />
            Locked
          </span>
        </div>
        <div className="mt-1 text-[11px] opacity-60">
          Locked to avoid mistakes. Change it via <span className="font-mono">NEXT_PUBLIC_BACKEND_URL</span>.
        </div>
      </div>

      {/* Use `lg` so mobile "Desktop site" doesn't squeeze the controls */}
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
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
              <option value="auto">Auto (recommended)</option>
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
              <option value="auto">Auto (recommended)</option>
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
