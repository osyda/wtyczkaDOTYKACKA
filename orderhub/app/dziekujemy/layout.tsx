import type { Metadata } from "next";

// Strona statusu pojedynczego zamówienia — bez indeksowania.
export const metadata: Metadata = {
  title: "Status zamówienia",
  robots: { index: false, follow: false },
};

export default function DziekujemyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
