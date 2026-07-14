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
  // PIZZE — menu od właściciela (zdjęcie, 13.07.2026), nr 1 podany w wiadomości.
  "margherita": "Sos pomidorowy, ser, oregano",
  "neapolitana": "Sos pomidorowy, ser, pieczarki, oregano",
  "vesuvio": "Sos pomidorowy, ser, szynka mielona, oregano",
  "campagnola": "Sos pomidorowy, ser, salami, cebula, oregano",
  "tropicana": "Sos pomidorowy, ser, szynka mielona, ananas, curry",
  "vegetariana": "Sos pomidorowy, ser, pieczarki, papryka, cebula, por, oregano",
  "capricciosa": "Sos pomidorowy, ser, szynka mielona, pieczarki, oregano",
  "bolognese": "Sos pomidorowy, ser, sos bolognese, oregano",
  "spinaci": "Sos pomidorowy, ser, kurczak, papryka, szpinak, oregano",
  "polonez": "Sos pomidorowy, ser, pieczarki, tuńczyk, cebula, por",
  "mista": "Sos pomidorowy, ser, pieczarki, salami, cebula",
  "formaggi": "Sos pomidorowy, 4 rodzaje sera, oliwa, bazylia",
  "milanese": "Sos pomidorowy, ser, pieczarki, kurczak, kukurydza",
  "palermo": "Sos pomidorowy, ser, salami, bekon, szynka mielona, papryka pepperoni",
  "la bussola": "Sos pomidorowy, ser, szynka mielona, krewetki",
  "hawaii": "Sos pomidorowy, ser, kurczak, ananas, banan, brzoskwinia, curry",
  "prosciutto": "Sos pomidorowy, ser, prosciutto, pomidory koktajlowe, bazylia",
  "mammarosa": "Sos pomidorowy, ser, pieczarki, bekon, jajko sadzone, por",
  "frutti di mare": "Sos pomidorowy, ser, krewetki, małże, kraby",
  "pepperoni": "Sos pomidorowy, ser, pieczarki, szynka mielona, cebula, papryka pepperoni",
  "carbonara": "Sos śmietanowy, ser, boczek, pieczarki, cebula, oregano",
  "venezia": "Sos pomidorowy, ser, pieczarki, szynka mielona, cebula, papryka, oregano",
  "familiare": "Sos pomidorowy, ser, bekon, jajko sadzone, ogórek konserwowy, cebula, oregano",
  "diabolo": "Sos pomidorowy, ser, bekon, jajko gotowane, papryka pepperoni ostra, oregano",
  "diabolo ostra": "Sos pomidorowy, ser, bekon, jajko gotowane, papryka pepperoni ostra, oregano",
  "ruccola": "Sos pomidorowy, mozzarella, prosciutto, pomidory suszone, rukola",
  "gyros": "Sos pomidorowy, ser, kurczak-gyros, cebula czerwona, pomidory koktajlowe",
};

function norm(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ł/g, "l")
    .replace(/\s+/g, " ")
    .trim();
}

/** Wersja „ścieśniona": tylko litery/cyfry — odporna na podwójne spacje,
 *  myślniki, kropki itp. (np. „FRUTTI  DI-MARE" ≈ „frutti di mare"). */
function squash(name: string): string {
  return norm(name).replace(/[^a-z0-9]/g, "");
}

const SQUASHED = new Map(Object.entries(DESCRIPTIONS).map(([k, v]) => [squash(k), v]));

export function descriptionFor(productName: string): string {
  const n = norm(productName);
  if (DESCRIPTIONS[n]) return DESCRIPTIONS[n];
  const sq = squash(productName);
  const bySquash = SQUASHED.get(sq);
  if (bySquash) return bySquash;
  // Nazwy w POS bywają dłuższe niż w menu (np. „BOLOGNESE PIZZA",
  // „DIABOLO - OSTRA") — dopasuj po prefiksie, ale TYLKO gdy końcówka to
  // dopisek typu „pizza" / „- ostra" (żeby „GYROS Z KURCZAKA" z dań
  // obiadowych nie łapał opisu pizzy Gyros).
  for (const [key, desc] of Object.entries(DESCRIPTIONS)) {
    if (!n.startsWith(key + " ")) continue;
    const rest = n.slice(key.length).trim();
    if (rest === "pizza" || rest.startsWith("-") || rest.startsWith("(")) return desc;
  }
  return "";
}
