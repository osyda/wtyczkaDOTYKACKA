import type { Metadata } from "next";

// Koszyk/kasa — bez indeksowania (strona procesu, nie treści).
export const metadata: Metadata = {
  title: "Twoje zamówienie",
  robots: { index: false, follow: false },
};

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
