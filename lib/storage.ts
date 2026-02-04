export const LS = {
  theme: "ct_theme_v2",
  backend: "ct_backend_v2",
  token: "ct_token_v2",
  lastRun: "ct_last_run_v2",
};

export function lsGet(key: string, fallback = ""): string {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

export function lsSet(key: string, val: string) {
  try {
    localStorage.setItem(key, val);
  } catch {}
}
