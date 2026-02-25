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
  defaultLangEn: false,
  defaultLangNative: true,
  defaultNativeLang: "auto",
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
  let base: UserPrefs | null = null;
  if (fromIdb) base = { ...DEFAULT_PREFS, ...fromIdb };
  else {
    const fromLs = lsGetJson<UserPrefs | null>(LS.prefs as any, null);
    if (fromLs) base = { ...DEFAULT_PREFS, ...fromLs };
  }
  if (!base) return DEFAULT_PREFS;
  // Upgrade path: older builds used English-only defaults (en=true, native=false).
  // If prefs still match that pattern, flip them to the new, more useful defaults
  // (Native+auto-detect, English off by default).
  if (base.defaultLangEn === true && base.defaultLangNative === false) {
    base = { ...base, defaultLangEn: false, defaultLangNative: true, defaultNativeLang: "auto" };
  }
  return base;
}

export async function savePrefs(p: UserPrefs) {
  lsSetJson(LS.prefs as any, p);
  await idbSet(KEY, p);
}
