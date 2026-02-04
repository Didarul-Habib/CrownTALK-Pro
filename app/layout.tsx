import "./globals.css";

export const metadata = {
  title: "CrownTALK",
  description: "Professional comment generator for X",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
