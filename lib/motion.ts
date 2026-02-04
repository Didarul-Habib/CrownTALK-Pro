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
