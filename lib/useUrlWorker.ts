"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type UrlWorkerResult = {
  urls: string[];
  invalid: string[];
};

type WorkerMessageIn = { type: "parse"; raw: string };
type WorkerMessageOut = { type: "parsed"; raw: string; urls: string[]; invalid: string[] };

/**
 * Worker-backed URL parsing/classification.
 * - Debounced
 * - Falls back gracefully if worker can't load
 */
export function useUrlWorker(raw: string, debounceMs = 120) {
  const [result, setResult] = useState<UrlWorkerResult>({ urls: [], invalid: [] });
  const [ready, setReady] = useState(false);

  const workerRef = useRef<Worker | null>(null);
  const timerRef = useRef<number | null>(null);

  // Lazy-create the worker on client.
  useEffect(() => {
    let cancelled = false;

    try {
      // Next.js will bundle this as a worker.
      const w = new Worker(new URL("../workers/url.worker.ts", import.meta.url));
      workerRef.current = w;

      w.onmessage = (ev: MessageEvent<WorkerMessageOut>) => {
        const data = ev.data;
        if (!data || data.type !== "parsed") return;
        if (cancelled) return;
        setResult({ urls: data.urls, invalid: data.invalid });
      };

      setReady(true);
      return () => {
        cancelled = true;
        try {
          w.terminate();
        } catch {}
        workerRef.current = null;
      };
    } catch {
      setReady(false);
    }
  }, []);

  useEffect(() => {
    if (!ready || !workerRef.current) return;

    if (timerRef.current) window.clearTimeout(timerRef.current);

    timerRef.current = window.setTimeout(() => {
      const msg: WorkerMessageIn = { type: "parse", raw };
      workerRef.current?.postMessage(msg);
    }, debounceMs);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [raw, ready, debounceMs]);

  return useMemo(() => ({ ...result, ready }), [result, ready]);
}
