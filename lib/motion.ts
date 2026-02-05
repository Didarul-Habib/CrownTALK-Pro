export const MOTION = {
  ease: [0.2, 0.8, 0.2, 1] as const,
  dur: { fast: 0.16, base: 0.24, slow: 0.36 },
  spring: {
    soft: { type: "spring", stiffness: 260, damping: 26, mass: 0.9 } as const,
    snappy: { type: "spring", stiffness: 420, damping: 30, mass: 0.85 } as const,
  },
};

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

export type FxMode = "auto" | "full" | "lite";

function prefersReducedData(): boolean {
  if (typeof window === "undefined") return false;
  try {
    // Chromium-based browsers + some mobile browsers
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const conn: any = (navigator as any)?.connection;
    return Boolean(conn?.saveData);
  } catch {
    return false;
  }
}

/**
 * Used to disable heavy visual effects (glows, drifting backgrounds, confetti)
 * on low-power / data-saver / reduced-motion devices.
 */
export function shouldReduceEffects(mode: FxMode = "auto"): boolean {
  if (mode === "lite") return true;
  if (mode === "full") return false;
  return prefersReducedMotion() || prefersReducedData();
}

export function applyFxMode(mode: FxMode) {
  if (typeof document === "undefined") return;
  const lite = shouldReduceEffects(mode);
  document.documentElement.setAttribute("data-fx", lite ? "lite" : "full");
}
