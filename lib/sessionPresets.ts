export type SessionPreset = {
  id: string;
  name: string;
  createdAt: number;
  config: {
    langEn: boolean;
    langNative: boolean;
    nativeLang: string;
    tone: string;
    intent: string;
    qualityMode: "fast" | "balanced" | "pro";
    includeAlternates: boolean;
    fastMode: boolean;
    voice: number;
  };
};

const STORAGE_KEY = "ct_presets_v1";

export function loadSessionPresets(): SessionPreset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function saveSessionPresets(presets: SessionPreset[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
  } catch {
    // ignore
  }
}
