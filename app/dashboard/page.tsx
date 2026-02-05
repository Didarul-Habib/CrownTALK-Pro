"use client";

import Link from "next/link";
import { useMemo } from "react";
import { LS, lsGetJson } from "@/lib/storage";
import type { RunRecord, ClipboardRecord } from "@/lib/persist";

function fmt(ts: number) {
  try { return new Date(ts).toLocaleString(); } catch { return ""; }
}

export default function DashboardPage() {
  const runs = lsGetJson<RunRecord[]>(LS.runs, []);
  const clips = lsGetJson<ClipboardRecord[]>(LS.clipboard, []);

  const stats = useMemo(() => {
    const totalRuns = runs.length;
    const totalUrls = runs.reduce((a, r) => a + (r.results?.length || 0), 0);
    const ok = runs.reduce((a, r) => a + (r.okCount || 0), 0);
    const fail = runs.reduce((a, r) => a + (r.failedCount || 0), 0);
    const last = runs[0]?.at || 0;
    const mostDomains = (() => {
      const m = new Map<string, number>();
      for (const r of runs) {
        for (const u of r.request?.urls || []) {
          try {
            const d = new URL(u).hostname.replace(/^www\./, "");
            m.set(d, (m.get(d) || 0) + 1);
          } catch {}
        }
      }
      return [...m.entries()].sort((a,b)=>b[1]-a[1]).slice(0,5);
    })();
    return { totalRuns, totalUrls, ok, fail, last, mostDomains, clips: clips.length };
  }, [runs, clips]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xl font-semibold tracking-tight">Run summary dashboard</div>
          <div className="text-sm opacity-70">A quick view of performance and usage.</div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/" className="ct-btn ct-btn-sm">Back</Link>
          <Link href="/settings" className="ct-btn ct-btn-sm">Preferences</Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="ct-card p-4">
          <div className="text-sm font-semibold tracking-tight">Totals</div>
          <div className="mt-2 space-y-1 text-sm opacity-85">
            <div>Runs: <span className="font-semibold">{stats.totalRuns}</span></div>
            <div>URLs processed: <span className="font-semibold">{stats.totalUrls}</span></div>
            <div>OK: <span className="font-semibold">{stats.ok}</span> • Failed: <span className="font-semibold">{stats.fail}</span></div>
            <div>Clipboard items: <span className="font-semibold">{stats.clips}</span></div>
          </div>
          <div className="mt-3 text-[11px] opacity-70">Last run: {stats.last ? fmt(stats.last) : "—"}</div>
        </div>

        <div className="ct-card p-4">
          <div className="text-sm font-semibold tracking-tight">Top domains</div>
          <div className="mt-2 space-y-1 text-sm">
            {stats.mostDomains.length ? stats.mostDomains.map(([d, n]) => (
              <div key={d} className="flex items-center justify-between opacity-85">
                <span className="truncate pr-2">{d}</span>
                <span className="font-mono opacity-70">{n}</span>
              </div>
            )) : <div className="text-sm opacity-70">No data yet.</div>}
          </div>
        </div>
      </div>

      <div className="ct-card p-4">
        <div className="text-sm font-semibold tracking-tight">Recent runs</div>
        <div className="mt-3 space-y-2">
          {runs.slice(0, 10).map((r) => (
            <div key={r.id} className="ct-card-surface p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs opacity-70">{fmt(r.at)}</div>
                <div className="text-sm font-semibold truncate">{r.results.length} URLs • {r.okCount} ok • {r.failedCount} failed</div>
              </div>
              <div className="text-[11px] opacity-70 font-mono">{r.id}</div>
            </div>
          ))}
          {!runs.length ? <div className="text-sm opacity-70">No runs yet.</div> : null}
        </div>
      </div>
    </div>
  );
}
