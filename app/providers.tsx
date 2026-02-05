"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * React Query provider for the Next.js App Router.
 *
 * Netlify/Next prerenders routes during build. Any component using
 * `useQuery`/`useMutation` must be under a `QueryClientProvider`.
 */
export default function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  // Create the client once per browser session.
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Safe defaults for most apps; adjust as needed.
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
