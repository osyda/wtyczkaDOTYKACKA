/**
 * Opisy/składniki produktów pokazywane klientom w menu online.
 *
 * Priorytet: pole „Opis" z karty produktu w Dotykačce (jeśli właściciel je
 * uzupełni, synchronizuje się samo). Gdy w POS pusto — bierzemy stąd.
 * Klucz = nazwa produktu znormalizowana (małe litery, bez polskich znaków).
 *
 * UZUPEŁNIANE na podstawie menu od właściciela — patrz docs/STAN_PROJEKTU.md.
 */

const DESCRIPTIONS: Record<string, string> = {
  // przykład: "margherita": "sos pomidorowy, ser mozzarella, bazylia",
};

function norm(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ł/g, "l")
    .trim();
}

export function descriptionFor(productName: string): string {
  return DESCRIPTIONS[norm(productName)] ?? "";
}
