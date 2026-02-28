"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { loadPrefs, savePrefs, type UserPrefs, DEFAULT_PREFS } from "@/lib/prefs";
import { LS, lsGet } from "@/lib/storage";

export default function SettingsPage() {
  const [prefs, setPrefs] = useState<UserPrefs>(DEFAULT_PREFS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let live = true;
    loadPrefs().then((p) => live && setPrefs(p));
    return () => { live = false; };
  }, []);

  const fxMode = useMemo(() => (lsGet(LS.fxMode, "auto") as any) || "auto", []);

  async function commit(next: UserPrefs) {
    setPrefs(next);
    await savePrefs(next);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 900);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xl font-semibold tracking-tight">Preferences</div>
          <div className="text-sm opacity-70">Defaults that apply to new sessions.</div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/" className="ct-btn ct-btn-sm">Back</Link>
          <Link href="/dashboard" className="ct-btn ct-btn-sm">Dashboard</Link>
        </div>
      </div>

      <div className="ct-card p-4 space-y-4">
        <div className="text-sm font-semibold tracking-tight">Defaults</div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="ct-card-surface p-3 flex items-center justify-between gap-3">
            <span className="text-sm">English</span>
            <input
              type="checkbox"
              checked={prefs.defaultLangEn}
              onChange={(e) => commit({ ...prefs, defaultLangEn: e.target.checked })}
            />
          </label>
          <label className="ct-card-surface p-3 flex items-center justify-between gap-3">
            <span className="text-sm">Native language</span>
            <input
              type="checkbox"
              checked={prefs.defaultLangNative}
              onChange={(e) => commit({ ...prefs, defaultLangNative: e.target.checked })}
            />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="ct-card-surface p-3 space-y-2">
            <div className="text-sm">Default native language code</div>
            <input
              className="w-full rounded-xl border border-white/10 bg-black/15 px-3 py-2 text-sm outline-none"
              value={prefs.defaultNativeLang}
              onChange={(e) => commit({ ...prefs, defaultNativeLang: e.target.value || "bn" })}
              placeholder="bn"
            />
            <div className="text-[11px] opacity-70">Example: bn, hi, es, ar</div>
          </label>

          <label className="ct-card-surface p-3 space-y-2">
            <div className="text-sm">History retention (runs)</div>
            <input
              className="w-full"
              type="range"
              min={5}
              max={50}
              value={prefs.historyRetention}
              onChange={(e) => commit({ ...prefs, historyRetention: Number(e.target.value) })}
            />
            <div className="text-[11px] opacity-70">Keep up to {prefs.historyRetention} runs.</div>
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="ct-card-surface p-3 space-y-2">
            <div className="text-sm">Default tone</div>
            <select
              className="w-full rounded-xl border border-white/10 bg-black/15 px-3 py-2 text-sm outline-none"
              value={prefs.defaultTone}
              onChange={(e) => commit({ ...prefs, defaultTone: e.target.value })}
            >
              <option value="auto">auto</option>
              <option value="professional">professional</option>
              <option value="casual">casual</option>
              <option value="bold">bold</option>
              <option value="friendly">friendly</option>
            </select>
          </label>

          <label className="ct-card-surface p-3 space-y-2">
            <div className="text-sm">Default intent</div>
            <select
              className="w-full rounded-xl border border-white/10 bg-black/15 px-3 py-2 text-sm outline-none"
              value={prefs.defaultIntent}
              onChange={(e) => commit({ ...prefs, defaultIntent: e.target.value })}
            >
              <option value="auto">auto</option>
              <option value="neutral">neutral</option>
              <option value="agree">agree</option>
              <option value="question">question</option>
              <option value="soft_pushback">soft_pushback</option>
            </select>
          </label>
        </div>

        <label className="ct-card-surface p-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm">Include alternates by default</div>
            <div className="text-[11px] opacity-70">Adds alternates under each main reply.</div>
          </div>
          <input
            type="checkbox"
            checked={prefs.defaultIncludeAlternates}
            onChange={(e) => commit({ ...prefs, defaultIncludeAlternates: e.target.checked })}
          />
        </label>

        <label className="ct-card-surface p-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm">Enable share links</div>
            <div className="text-[11px] opacity-70">Copy a link to open runs on another device.</div>
          </div>
          <input
            type="checkbox"
            checked={prefs.enableShareLinks}
            onChange={(e) => commit({ ...prefs, enableShareLinks: e.target.checked })}
          />
        </label>

        <div className="text-[11px] opacity-70">
          Effects mode is controlled from the main app (current: <span className="font-mono">{fxMode}</span>).
        </div>

        {saved ? <div className="text-[11px] text-emerald-200">Saved ✓</div> : null}
      </div>
    </div>
  );
}
