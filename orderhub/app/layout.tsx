import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/lib/cart/CartProvider";

// CARTA używa systemowych fontów (Didot/Georgia + systemowy sans) —
// zero pobierania fontów w buildzie, idealna ostrość na każdym urządzeniu.

export const metadata: Metadata = {
  title: "Mammarosa — Zamów online",
  description: "Zamów pizzę z dostawą lub na wynos — Mammarosa, Kościerzyna.",
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
