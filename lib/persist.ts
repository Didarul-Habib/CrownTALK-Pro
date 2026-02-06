import type { Intent, ResultItem, Tone } from "./types";

export type UserProfile = {
  id?: number;
  name: string;
  xUrl: string;
  createdAt?: number;
};

export type RunRequestSnapshot = {
  mode?: "urls" | "source";
  sourceUrl?: string;
  urls: string[];
  langEn: boolean;
  langNative: boolean;
  nativeLang: string;
  tone: Tone;
  intent: Intent;
  includeAlternates: boolean;
};

export type RunRecord = {
  id: string;
  mode?: "urls" | "source";
  at: number;
  request: RunRequestSnapshot;
  results: ResultItem[];
  okCount: number;
  failedCount: number;
};

export type ClipboardRecord = {
  id: string;
  at: number;
  url?: string;
  text: string;
  pinned?: boolean;
};

export function nowId(prefix = "ct") {
  // 12 chars base36 is plenty for client-side ids.
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now().toString(36)}_${rand}`;
}

export function safeTrim(s: string, max = 240) {
  const t = (s || "").trim();
  return t.length > max ? t.slice(0, max - 1) + "…" : t;
}
