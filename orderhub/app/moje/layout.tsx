import type { Metadata } from "next";

// Historia zamówień klienta (prywatna, na urządzeniu) — bez indeksowania.
export const metadata: Metadata = {
  title: "Twoje zamówienia",
  robots: { index: false, follow: false },
};

export default function MojeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
