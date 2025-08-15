import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GeoValuate AI",
  description: "AI-Powered Real Estate Analysis",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
