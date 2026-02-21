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
      const mode = (localStorage.getItem(LS.fxMode) as FxMode) || "auto";
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
