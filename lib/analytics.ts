type EventName =
  | "generate"
  | "reroll"
  | "copy"
  | "retry_failed"
  | "theme_change"
  | "ui_lang_change";

type AnalyticsEvent = {
  name: EventName;
  at: number;
  data?: Record<string, any>;
};

const KEY = "ct.analytics.v1";
const MAX = 500;

function safeGet(): AnalyticsEvent[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]") as AnalyticsEvent[];
  } catch {
    return [];
  }
}

function safeSet(evts: AnalyticsEvent[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(evts.slice(0, MAX)));
  } catch {}
}

const ENDPOINT = typeof window !== "undefined" ? process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT : undefined;

export function initAnalytics() {}

export function track(name: EventName, data?: Record<string, any>) {
  const evt: AnalyticsEvent = { name, at: Date.now(), data };
  const cur = safeGet();
  safeSet([evt, ...cur]);

  if (ENDPOINT) {
    try {
      fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(evt),
        keepalive: true,
      }).catch(() => {});
    } catch {}
  }
}

export function getAnalyticsEvents(): AnalyticsEvent[] {
  return safeGet();
}
