"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import InstallPrompt from "@/components/InstallPrompt";
import PwaRegister from "@/components/PwaRegister";
import { initAnalytics } from "@/lib/analytics";
import { applyFxMode, FxMode } from "@/lib/motion";
import { LS } from "@/lib/storage";

/**
 * App-wide client providers for the Next.js App Router.
 *
 * - React Query (`QueryClientProvider`)
 * - PWA service worker registration
 * - (Optional) install prompt banner
 * - Analytics bootstrap
 */
export default function Providers({ children }: { children: React.ReactNode }) {
  // Create the client once per browser session.
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  React.useEffect(() => {
    try {
      initAnalytics();
    } catch {
      // no-op
    }
  }, []);

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem(LS.fxMode) as FxMode | null;
      let mode: FxMode = saved || "auto";
      // Auto-detect: if running on a mobile/tablet device and no explicit user override,
      // default to "lite" to avoid backdrop-blur and heavy compositing layers that
      // cause scroll jank on most Android/iOS devices.
      if (!saved || saved === "auto") {
        const isMobile = /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        );
        const isSmallScreen = window.matchMedia("(max-width: 768px)").matches;
        const prefersLow = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (isMobile || isSmallScreen || prefersLow) {
          mode = "lite";
        }
      }
      applyFxMode(mode);
    } catch {
      // no-op
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <PwaRegister />
      <InstallPrompt />
    </QueryClientProvider>
  );
}
