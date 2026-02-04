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
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          className={`rounded-xl border px-3 py-2 text-sm ${
            langEn ? "bg-neutral-800 border-neutral-700" : "bg-neutral-950 border-neutral-800"
          }`}
          onClick={() => setLangEn(!langEn)}
        >
          English
        </button>
        <button
          type="button"
          className={`rounded-xl border px-3 py-2 text-sm ${
            langNative ? "bg-neutral-800 border-neutral-700" : "bg-neutral-950 border-neutral-800"
          }`}
          onClick={() => setLangNative(!langNative)}
        >
          Native
        </button>
      </div>

      {langNative ? (
        <div className="space-y-1">
          <label className="text-xs text-neutral-400">Native language</label>
          <select
            className="w-full rounded-xl bg-neutral-900 border border-neutral-800 p-2 text-sm"
            value={nativeLang}
            onChange={(e) => setNativeLang(e.target.value)}
          >
            {NATIVE_LANGS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-neutral-400">Tone</label>
          <select
            className="w-full rounded-xl bg-neutral-900 border border-neutral-800 p-2 text-sm"
            value={tone}
            onChange={(e) => setTone(e.target.value as Tone)}
          >
            <option value="professional">Professional</option>
            <option value="neutral">Neutral</option>
            <option value="playful">Playful</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-neutral-400">Intent</label>
          <select
            className="w-full rounded-xl bg-neutral-900 border border-neutral-800 p-2 text-sm"
            value={intent}
            onChange={(e) => setIntent(e.target.value as Intent)}
          >
            <option value="neutral">Neutral</option>
            <option value="agree">Agree</option>
            <option value="question">Question</option>
            <option value="soft_pushback">Soft pushback</option>
          </select>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-neutral-200">
        <input
          type="checkbox"
          className="accent-neutral-200"
          checked={includeAlternates}
          onChange={(e) => setIncludeAlternates(e.target.checked)}
        />
        Include alternates (power)
      </label>
    </div>
  );
}
