
import { LS, lsGet, lsSet } from "@/lib/storage";

export type MetricName =
  | "run_started"
  | "run_completed"
  | "run_cancelled"
  | "variant_copied"
  | "reroll_clicked";

export type MetricEvent = {
  name: MetricName;
  at: number;
  anonId: string;
  data?: Record<string, unknown>;
};

function getAnonId(): string {
  if (typeof window === "undefined") return "server";
  try {
    const raw = lsGet(LS.analyticsAnonId, "");
    if (raw) return raw;
  } catch {
    // ignore
  }
  const id = Math.random().toString(36).slice(2) + Date.now().toString(36);
  try {
    lsSet(LS.analyticsAnonId, id);
  } catch {
    // ignore
  }
  return id;
}

function loadQueue(): MetricEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = lsGet(LS.analyticsQueue, "[]");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as MetricEvent[];
  } catch {
    // ignore
  }
  return [];
}

function saveQueue(events: MetricEvent[]) {
  if (typeof window === "undefined") return;
  try {
    lsSet(LS.analyticsQueue, JSON.stringify(events.slice(-100)));
  } catch {
    // ignore
  }
}

export function logMetric(name: MetricName, data?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  try {
    const evt: MetricEvent = {
      name,
      at: Date.now(),
      anonId: getAnonId(),
      data,
    };
    const q = loadQueue();
    q.push(evt);
    saveQueue(q);
    if (process.env.NODE_ENV !== "production") {
      (window as any).__CT_METRICS__ = q;
    }
  } catch {
    // ignore analytics errors
  }
}
