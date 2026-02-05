"use client";

import { useEffect } from "react";
import { prefersReducedEffects } from "@/lib/motion";

/**
 * Applies a global class to the <html> element so CSS can safely disable
 * heavy effects in battery-saver / reduced-motion contexts.
 */
export default function EffectMode() {
  useEffect(() => {
    const el = document.documentElement;
    const apply = () => {
      if (prefersReducedEffects()) el.classList.add("ct-reduce");
      else el.classList.remove("ct-reduce");
    };
    apply();

    // Re-check if user changes OS motion preferences while page is open.
    try {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      const onChange = () => apply();
      mq.addEventListener?.("change", onChange);
      return () => mq.removeEventListener?.("change", onChange);
    } catch {
      return;
    }
  }, []);

  return null;
}
