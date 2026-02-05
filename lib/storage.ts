export const LS = {
  theme: "ct_theme_v2",
  token: "ct_token_v2",
  auth: "ct_auth_v2",
  lastRun: "ct_last_run_v2",
  // Draft/autosave (URL inbox + selections)
  draft: "ct_draft_v2",
  // FX mode: auto | full | lite
  fxMode: "ct_fx_mode_v2",
  user: "ct_user_v2",
  runs: "ct_runs_v2",
  clipboard: "ct_clipboard_v2",
  lastRunResult: "ct_last_run_result_v2",
  dismissResume: "ct_dismiss_resume_v2",
  dismissSessionDiff: "ct_dismiss_session_diff_v2",
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

export function lsGetJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function lsSetJson<T>(key: string, val: T) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {}
}
