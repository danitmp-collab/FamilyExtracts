import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { BackButton } from "./back-button";
import "./globals.css";

export const metadata: Metadata = {
  title: "Family_extracts",
  description: "Control financiero familiar a partir de extractos Excel.",
  applicationName: "Family_extracts",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }]
  },
  appleWebApp: {
    capable: true,
    title: "Family_extracts",
    statusBarStyle: "black-translucent"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        <Suspense fallback={null}>
          <BackButton />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
