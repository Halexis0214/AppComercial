import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IMPACTARCO - Portal Comercial",
  description: "Plataforma de mapeo y cotizaciones",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}