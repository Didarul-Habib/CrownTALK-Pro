import type { Metadata } from "next";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/inter/latin-700.css";
import "./globals.css";

import { Toaster } from "sonner";
import Providers from "@/components/Providers";
import PwaRegister from "@/components/PwaRegister";

export const metadata: Metadata = {
  title: "CrownTALK",
  description: "Professional X comment generator",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          {children}
        </Providers>
        <PwaRegister />
        <Toaster
          richColors
          position="top-right"
          toastOptions={{
            className:
              "rounded-2xl border border-white/10 bg-black/60 text-white backdrop-blur-xl",
          }}
        />
      </body>
    </html>
  );
}
