"use client";

import clsx from "clsx";
import { useEffect, useState } from "react";
import { pingWithLatency } from "@/lib/api";

export default function StatusPill({ baseUrl }: { baseUrl?: string }) {
  // Make this prop optional so callers don't have to thread it everywhere.
  // NEXT_PUBLIC_BACKEND_URL is injected at build time by Next.js.
  const resolvedBaseUrl =
    baseUrl || (process.env.NEXT_PUBLIC_BACKEND_URL as string | undefined) || "";
  const [ok, setOk] = useState<boolean | null>(null);
  const [ms, setMs] = useState<number | null>(null);

  useEffect(() => {
    let live = true;
    setOk(null);
    setMs(null);
    if (!resolvedBaseUrl) {
      setOk(false);
      setMs(null);
      return () => {
        live = false;
      };
    }
    pingWithLatency(resolvedBaseUrl)
      .then((r) => {
        if (!live) return;
        setOk(r.ok);
        setMs(r.ms);
      })
      .catch(() => {
        if (!live) return;
        setOk(false);
        setMs(null);
      });
    return () => {
      live = false;
    };
  }, [resolvedBaseUrl]);

  return (
    <div
      className={clsx(
        "flex items-center gap-2 rounded-full border px-3 py-1 text-xs",
        "bg-[color:var(--ct-surface)] border-[color:var(--ct-border)]"
      )}
      title={
        ok === null
          ? "Checking backend…"
          : ok
            ? `Backend reachable${ms != null ? ` (${ms}ms)` : ""}`
            : "Backend not reachable"
      }
    >
      <span
        className={clsx(
          "h-2 w-2 rounded-full",
          ok === null ? "opacity-50" : ok ? "opacity-100" : "opacity-100"
        )}
        style={{ background: ok ? "var(--ct-ok)" : "var(--ct-bad)" }}
      />
      <span className="opacity-80">
        {ok === null ? "Checking" : ok ? "Operational" : "Offline"}
        {ok !== null && ms != null ? <span className="ml-2 opacity-60">{ms}ms</span> : null}
      </span>
    </div>
  );
}
