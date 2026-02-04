import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CrownTALK",
  description: "Professional X comment generator",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
