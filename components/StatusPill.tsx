"use client";

import clsx from "clsx";
import { useEffect, useState } from "react";
import { pingWithLatency } from "@/lib/api";

export default function StatusPill({ baseUrl }: { baseUrl: string }) {
  const [ok, setOk] = useState<boolean | null>(null);

  useEffect(() => {
    let live = true;
    setOk(null);
    ping(baseUrl)
      .then((v) => live && setOk(v))
      .catch(() => live && setOk(false));
    return () => {
      live = false;
    };
  }, [baseUrl]);

  return (
    <div
      className={clsx(
        "flex items-center gap-2 rounded-full border px-3 py-1 text-xs",
        "bg-[color:var(--ct-surface)] border-[color:var(--ct-border)]"
      )}
      title={ok === null ? "Checking backend…" : ok ? "Backend reachable" : "Backend not reachable"}
    >
      <span
        className={clsx(
          "h-2 w-2 rounded-full",
          ok === null ? "opacity-50" : ok ? "opacity-100" : "opacity-100"
        )}
        style={{ background: ok ? "var(--ct-ok)" : "var(--ct-bad)" }}
      />
      <span className="opacity-80">{ok === null ? "Checking" : ok ? "Operational" : "Offline"}</span>
    </div>
  );
}
