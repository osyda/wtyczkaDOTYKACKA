import type { Metadata } from "next";

// Panel obsługi — poza indeksem Google (dodatkowo strzeże go hasło lokalu).
export const metadata: Metadata = {
  title: "Panel obsługi",
  robots: { index: false, follow: false },
};

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return children;
}
