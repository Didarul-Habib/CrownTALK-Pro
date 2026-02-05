import { LS, lsGetJson, lsSetJson } from "@/lib/storage";
import { idbGet, idbSet } from "@/lib/idb";

export type UserPrefs = {
  defaultLangEn: boolean;
  defaultLangNative: boolean;
  defaultNativeLang: string;
  defaultTone: string;
  defaultIntent: string;
  defaultIncludeAlternates: boolean;
  historyRetention: number; // max runs to keep
  enableShareLinks: boolean;
};

export const DEFAULT_PREFS: UserPrefs = {
  defaultLangEn: true,
  defaultLangNative: false,
  defaultNativeLang: "bn",
  defaultTone: "auto",
  defaultIntent: "auto",
  defaultIncludeAlternates: false,
  historyRetention: 20,
  enableShareLinks: true,
};

const KEY = "ct:prefs";

export async function loadPrefs(): Promise<UserPrefs> {
  // Prefer IDB, fall back to localStorage.
  const fromIdb = await idbGet<UserPrefs | null>(KEY, null);
  if (fromIdb) return { ...DEFAULT_PREFS, ...fromIdb };
  const fromLs = lsGetJson<UserPrefs | null>(LS.prefs as any, null);
  if (fromLs) return { ...DEFAULT_PREFS, ...fromLs };
  return DEFAULT_PREFS;
}

export async function savePrefs(p: UserPrefs) {
  lsSetJson(LS.prefs as any, p);
  await idbSet(KEY, p);
}
