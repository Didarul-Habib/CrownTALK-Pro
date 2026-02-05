"use client";

export type RenderStat = { name: string; count: number; lastAt: number };

declare global {
  interface Window {
    __ct_render_stats__?: Record<string, RenderStat>;
  }
}

function store(): Record<string, RenderStat> {
  if (typeof window === "undefined") return {};
  if (!window.__ct_render_stats__) window.__ct_render_stats__ = {};
  return window.__ct_render_stats__;
}

export function bumpRender(name: string) {
  if (typeof window === "undefined") return;
  const s = store();
  const cur = s[name] || { name, count: 0, lastAt: 0 };
  s[name] = { name, count: cur.count + 1, lastAt: Date.now() };
}

export function getRenderStats(): RenderStat[] {
  const s = store();
  return Object.values(s).sort((a, b) => b.count - a.count);
}

export function resetRenderStats() {
  if (typeof window === "undefined") return;
  window.__ct_render_stats__ = {};
}
