// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { CartProvider } from "@/context/CartContext";
import { LanguageProvider } from "@/context/LanguageContext";

// Configuración optimizada de la fuente Inter
const inter = Inter({ 
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-inter',
});

// Metadatos profesionales expandidos
export const metadata: Metadata = {
  title: "TelecomB2B - Distribución de Fibra Óptica",
  description: "Plataforma profesional de comercio electrónico B2B para equipos y materiales.",
  keywords: "e-commerce, B2B, fibra óptica, telecomunicaciones, venta mayorista",
  authors: [{ name: "TelecomB2B" }],
  robots: "index, follow",
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: "https://telecomb2b.com",
    title: "TelecomB2B - Distribución de Fibra Óptica   ",
    description: "Plataforma profesional de comercio electrónico B2B para equipos y materiales.",
    siteName: "TelecomB2B",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={inter.variable}>
      <body className={`${inter.className} antialiased`}>
        {/* LanguageProvider envuelve todo para proveer el contexto de idioma */}
        <LanguageProvider>
          {/* CartProvider dentro de LanguageProvider para que ambos estén disponibles */}
          <CartProvider>
            <Navbar />
            <main className="min-h-screen bg-gray-50">
              {children}
            </main>
          </CartProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}