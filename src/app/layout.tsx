import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Familyextracts",
  description: "Control financiero familiar a partir de extractos Excel."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
