/**
 * CARTA — system wizualny sklepu (jasna, redakcyjna karta menu).
 * Wspólne stałe typografii i kolorów dla wszystkich ekranów klienta.
 */

export const SERIF =
  "'Didot','Bodoni 72','Playfair Display','Iowan Old Style',Georgia,'Bitstream Charter',serif";

export const SANS =
  "-apple-system,BlinkMacSystemFont,'Helvetica Neue','Liberation Sans',Arial,sans-serif";

export const C = {
  ivory: "#F7F3EB",
  paper: "#FFFEFA",
  ink: "#1B1710",
  muted: "#7A7060",
  faint: "#A99D87",
  hairline: "#E3DAC6",
  hairlineSoft: "#EDE5D5",
  border: "#EAE2D2",
  leader: "#C9BEA6",
  accent: "#8E3B2F",
} as const;

/** Dobór zestawu spadających składników po nazwie dodatku. */
export function toppingKind(addonName: string): string | null {
  const s = addonName.toLowerCase();
  if (s.includes("ser")) return "ser";
  if (s.includes("pieczar")) return "pieczarki";
  if (s.includes("szynk")) return "szynka";
  if (s.includes("salami")) return "salami";
  if (s.includes("oliw")) return "oliwki";
  return null;
}

/** Warianty grafik (pliki w /public/toppings) dla każdego rodzaju składnika. */
export const TOPPING_VARIANTS: Record<string, number> = {
  ser: 3,
  pieczarki: 3,
  szynka: 3,
  salami: 2,
  oliwki: 3,
};

/** Szerokość składnika w % szerokości zdjęcia pizzy. */
export const TOPPING_SIZE: Record<string, number> = {
  ser: 20,
  pieczarki: 15,
  szynka: 19,
  salami: 16,
  oliwki: 10,
};

/** Rozrzut [left%, top%, obrót°] — pozycje na cieście, poza brzegiem. */
export const TOPPING_SCATTER: Record<string, [number, number, number][]> = {
  ser: [[22, 24, -15], [56, 20, 20], [44, 50, 5], [20, 54, 25], [60, 56, -10]],
  pieczarki: [[40, 17, -20], [18, 38, 15], [64, 34, 40], [32, 60, -10], [52, 44, 70]],
  szynka: [[26, 22, -12], [55, 26, 22], [38, 46, 8], [18, 52, -30], [58, 58, 12]],
  salami: [[30, 18, 10], [56, 28, -25], [20, 42, 45], [48, 52, 0], [38, 34, -60], [64, 48, 30]],
  oliwki: [[28, 26, 0], [52, 17, 40], [68, 38, -30], [30, 56, 15], [47, 40, -15], [58, 62, 60]],
};
