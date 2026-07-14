import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/lib/cart/CartProvider";

// CARTA używa systemowych fontów (Didot/Georgia + systemowy sans) —
// zero pobierania fontów w buildzie, idealna ostrość na każdym urządzeniu.

/**
 * SEO (14.07.2026): zamow.mammarosa.pl to serwis POMOCNICZY wizytówki
 * mammarosa.pl (WordPress) — nie konkurujemy z nią o frazy, tylko domykamy
 * ścieżkę „zamów online". metadataBase ustawia domenę kanoniczną, więc
 * adres techniczny *.vercel.app nie zrobi Google'owi duplikatu treści.
 */
export const metadata: Metadata = {
  metadataBase: new URL("https://zamow.mammarosa.pl"),
  title: {
    default: "Mammarosa Kościerzyna — zamów online pizzę i obiady z dostawą",
    template: "%s · Mammarosa Kościerzyna",
  },
  description:
    "Oficjalne zamówienia online pizzerii Mammarosa w Kościerzynie: pizza, zapiekanki, dania obiadowe. Dostawa do domu i odbiór osobisty — zamów bez dzwonienia.",
  keywords: [
    "pizza Kościerzyna",
    "pizzeria Kościerzyna",
    "zamów pizzę Kościerzyna",
    "jedzenie z dowozem Kościerzyna",
    "Mammarosa",
    "obiady Kościerzyna",
  ],
  openGraph: {
    type: "website",
    locale: "pl_PL",
    url: "https://zamow.mammarosa.pl",
    siteName: "Mammarosa Kościerzyna",
    title: "Mammarosa Kościerzyna — zamów online z dostawą",
    description:
      "Pizza, zapiekanki i domowe obiady z pieca Mammarosy. Zamów online — dostawa lub odbiór osobisty.",
    images: [{ url: "/brand/logo-tomato.png", width: 1200, height: 630, alt: "Mammarosa — Restauracja Pizzeria, Kościerzyna" }],
  },
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
