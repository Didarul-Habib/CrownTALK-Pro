
"use client";

import { useMemo } from "react";
import type { ResultItem } from "@/lib/types";
import { isEnabled } from "@/lib/flags";

export default function RunTimingsPanel({ items }: { items: ResultItem[] }) {
  const enabled = isEnabled("debug", false);
  const rows = useMemo(() => {
    const out: { key: string; label: string; total: number; fetch: number; gen: number; polish: number }[] = [];
    for (const it of items) {
      const t = (it as any).timings as any;
      if (!t) continue;
      const fetch = Number(t.fetch_ms || 0);
      const gen = Number(t.generate_ms || 0);
      const polish = Number(t.polish_ms || 0);
      const total = fetch + gen + polish;
      if (!total) continue;
      const key = (it as any).input_url || it.url || String(total);
      const labelSource = (it as any).handle || (it as any).project?.symbol || key;
      const label = String(labelSource || key).replace(/^https?:\/\//, "").slice(0, 40);
      out.push({ key, label, total, fetch, gen, polish });
    }
    return out;
  }, [items]);

  if (!enabled || !rows.length) return null;

  const maxTotal = rows.reduce((m, r) => (r.total > m ? r.total : m), 0) || 1;

  return (
    <div className="fixed right-4 bottom-24 z-[90] w-80 rounded-3xl border border-white/15 bg-black/80 p-3 text-[10px] shadow-2xl backdrop-blur-xl max-h-72 overflow-y-auto">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-[11px] font-semibold tracking-[0.16em] uppercase opacity-80">
          Run timings (debug)
        </div>
        <div className="text-[10px] opacity-70">per URL</div>
      </div>
      <div className="space-y-1.5">
        {rows.map((row) => {
          const norm = row.total || 1;
          const fetchW = (row.fetch / maxTotal) * 100;
          const genW = (row.gen / maxTotal) * 100;
          const polishW = (row.polish / maxTotal) * 100;
          return (
            <div key={row.key + row.total}>
              <div className="flex items-center justify-between gap-2">
                <div className="truncate max-w-[70%]">{row.label}</div>
                <div className="tabular-nums opacity-70">{row.total}ms</div>
              </div>
              <div className="mt-1 flex h-1.5 overflow-hidden rounded-full bg-white/10">
                {row.fetch ? <div style={{ width: `${fetchW}%` }} className="bg-sky-400" /> : null}
                {row.gen ? <div style={{ width: `${genW}%` }} className="bg-emerald-400" /> : null}
                {row.polish ? <div style={{ width: `${polishW}%` }} className="bg-fuchsia-400" /> : null}
              </div>
              <div className="mt-0.5 flex justify-between text-[9px] opacity-70">
                <span>fetch {row.fetch}ms</span>
                <span>gen {row.gen}ms</span>
                <span>polish {row.polish}ms</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
