/**
 * Tiny feature-flag system.
 *
 * Priority (highest -> lowest):
 *  1) Query param: ?ff_<name>=1 / true / on
 *  2) localStorage: ff:<name> = 1 / true / on
 *  3) Env: NEXT_PUBLIC_FF_<NAME>=1
 */

const TRUE_SET = new Set(["1", "true", "on", "yes"]);

function readQuery(name: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const v = new URLSearchParams(window.location.search).get(name);
    return v;
  } catch {
    return null;
  }
}

function readLS(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function isEnabled(flag: string, fallback = false) {
  const norm = flag.trim();
  if (!norm) return fallback;

  const q = readQuery(`ff_${norm}`);
  if (q != null) return TRUE_SET.has(String(q).toLowerCase());

  const ls = readLS(`ff:${norm}`);
  if (ls != null) return TRUE_SET.has(String(ls).toLowerCase());

  const envKey = `NEXT_PUBLIC_FF_${norm.toUpperCase().replace(/[^A-Z0-9_]/g, "_")}`;
  const envVal = (process.env as any)?.[envKey];
  if (envVal != null) return TRUE_SET.has(String(envVal).toLowerCase());

  return fallback;
}

export function setFlag(flag: string, enabled: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`ff:${flag}`, enabled ? "1" : "0");
  } catch {}
}
