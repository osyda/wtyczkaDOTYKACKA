/**
 * Godziny otwarcia i okno przyjmowania zamówień.
 *
 * Źródła (w kolejności):
 *  1. Wizytówka Google (Places API, klucz GOOGLE_MAPS_API_KEY) — godziny same
 *     aktualizują się po zmianie w profilu firmy; wynik trzymamy w cache 6 h.
 *  2. Zmienna OPENING_HOURS, np. "pn-czw 11:00-21:00; pt-sb 11:00-22:00; nd 12:00-21:00".
 *  3. Domyślne (codziennie 11:00–21:00) — do czasu skonfigurowania.
 *
 * Ostatnie zamówienie: LAST_ORDER_MIN minut przed zamknięciem (domyślnie 20).
 * Wszystkie obliczenia w strefie Europe/Warsaw (Vercel liczy w UTC).
 */

import { Redis } from "@upstash/redis";

export type DayHours = { open: string; close: string } | null; // null = zamknięte
export type WeekHours = DayHours[]; // 0 = poniedziałek … 6 = niedziela
export type HoursSource = "google" | "env" | "default";

export type OpenState = {
  open: boolean; // lokal otwarty w tej chwili
  acceptingOrders: boolean; // można jeszcze złożyć zamówienie
  today: DayHours; // dzisiejsze godziny
  lastOrder: string | null; // "20:40" — koniec przyjmowania zamówień
  message: string; // komunikat dla klienta, gdy nie przyjmujemy
  source: HoursSource;
  week: WeekHours;
};

export const LAST_ORDER_MIN = (() => {
  const v = Number(process.env.LAST_ORDER_MIN);
  return Number.isFinite(v) && v >= 0 && v <= 120 ? v : 20;
})();

const GOOGLE_KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_PLACES_API_KEY || "";
const GOOGLE_QUERY = process.env.GOOGLE_PLACE_QUERY || "Pizzeria Mammarosa Kościerzyna";
const GOOGLE_TTL_MS = 6 * 60 * 60 * 1000; // 6 h
const GOOGLE_FAIL_TTL_MS = 10 * 60 * 1000; // po błędzie nie męczymy API przez 10 min

const DAY_NAMES = ["poniedziałek", "wtorek", "środa", "czwartek", "piątek", "sobota", "niedziela"];

const DEFAULT_WEEK: WeekHours = Array.from({ length: 7 }, () => ({ open: "11:00", close: "21:00" }));

export function hasGoogleHours(): boolean {
  return Boolean(GOOGLE_KEY);
}

/* ---------- czas w Polsce ---------- */

/** Dzień (0=pn) i minuta doby w strefie Europe/Warsaw. */
export function nowInPoland(): { day: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Warsaw",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const dayIdx = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(get("weekday"));
  const hour = Number(get("hour")) % 24; // Intl potrafi zwrócić "24"
  return { day: dayIdx < 0 ? 0 : dayIdx, minutes: hour * 60 + Number(get("minute")) };
}

function toMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

function toHHMM(min: number): string {
  const m = ((min % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/* ---------- źródło: OPENING_HOURS ---------- */

const DAY_TOKENS: Record<string, number> = {
  pn: 0, pon: 0, poniedzialek: 0,
  wt: 1, wto: 1, wtorek: 1,
  sr: 2, sro: 2, sroda: 2,
  cz: 3, czw: 3, czwartek: 3,
  pt: 4, pia: 4, piatek: 4,
  sb: 5, sob: 5, sobota: 5,
  nd: 6, ndz: 6, nie: 6, niedz: 6, niedziela: 6,
};

function normToken(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ł/g, "l")
    .trim();
}

/** "pn-czw 11:00-21:00; pt-sb 11-22; nd zamknięte" → WeekHours (null przy błędzie składni). */
export function parseOpeningHours(raw: string): WeekHours | null {
  const week: WeekHours = Array.from({ length: 7 }, () => null);
  let any = false;
  for (const seg of raw.split(/[;,]/)) {
    const s = seg.trim();
    if (!s) continue;
    const m = s.match(/^(\S+)\s+(.+)$/);
    if (!m) return null;
    const [, daysRaw, hoursRaw] = m;
    const range = daysRaw.split("-").map(normToken);
    const from = DAY_TOKENS[range[0]];
    const to = DAY_TOKENS[range[range.length - 1]];
    if (from === undefined || to === undefined) return null;

    let hours: DayHours = null;
    const hr = normToken(hoursRaw);
    if (!/zamk/.test(hr)) {
      const hm = hoursRaw.replace(/\s/g, "").match(/^(\d{1,2}(?::\d{2})?)-(\d{1,2}(?::\d{2})?)$/);
      if (!hm) return null;
      const norm = (t: string) => (t.includes(":") ? t.padStart(5, "0") : `${t.padStart(2, "0")}:00`);
      hours = { open: norm(hm[1]), close: norm(hm[2]) };
    }
    for (let d = from; ; d = (d + 1) % 7) {
      week[d] = hours;
      any = true;
      if (d === to) break;
    }
  }
  return any ? week : null;
}

/* ---------- źródło: wizytówka Google ---------- */

const URL_KV = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN_KV = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
let kv: Redis | null = null;
function redis(): Redis | null {
  if (!URL_KV || !TOKEN_KV) return null;
  if (!kv) kv = new Redis({ url: URL_KV, token: TOKEN_KV });
  return kv;
}

declare global {
  // eslint-disable-next-line no-var
  var __mrHoursCache: { week: WeekHours | null; at: number } | undefined;
}
const g = globalThis as typeof globalThis & { __mrHoursCache?: { week: WeekHours | null; at: number } };

type GooglePeriod = {
  open?: { day?: number; hour?: number; minute?: number };
  close?: { day?: number; hour?: number; minute?: number };
};

function weekFromGooglePeriods(periods: GooglePeriod[]): WeekHours | null {
  const week: WeekHours = Array.from({ length: 7 }, () => null);
  let any = false;
  for (const p of periods) {
    if (!p.open || typeof p.open.day !== "number") continue;
    const d = (p.open.day + 6) % 7; // Google: 0=niedziela → nasze 0=poniedziałek
    const open = toHHMM((p.open.hour ?? 0) * 60 + (p.open.minute ?? 0));
    // Brak "close" = całą dobę; zamknięcie następnego dnia obsługuje logika "przez północ".
    const close = p.close ? toHHMM((p.close.hour ?? 0) * 60 + (p.close.minute ?? 0)) : "23:59";
    week[d] = { open, close };
    any = true;
  }
  return any ? week : null;
}

/** Pobiera godziny z wizytówki Google (Places API — Text Search, jedno zapytanie na 6 h). */
async function fetchGoogleWeek(): Promise<WeekHours | null> {
  if (!GOOGLE_KEY) return null;

  // Cache w pamięci procesu…
  if (g.__mrHoursCache) {
    const ttl = g.__mrHoursCache.week ? GOOGLE_TTL_MS : GOOGLE_FAIL_TTL_MS;
    if (Date.now() - g.__mrHoursCache.at < ttl) return g.__mrHoursCache.week;
  }
  // …i w Redis (przeżywa zimny start funkcji).
  const r = redis();
  if (r) {
    try {
      const cached = await r.get<WeekHours>("hours:google");
      if (cached) {
        g.__mrHoursCache = { week: cached, at: Date.now() };
        return cached;
      }
    } catch {
      /* lecimy do API */
    }
  }

  let week: WeekHours | null = null;
  try {
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_KEY,
        "X-Goog-FieldMask": "places.id,places.displayName,places.regularOpeningHours",
      },
      body: JSON.stringify({ textQuery: GOOGLE_QUERY, languageCode: "pl" }),
      signal: AbortSignal.timeout(6000),
    });
    if (res.ok) {
      const data = (await res.json()) as {
        places?: { regularOpeningHours?: { periods?: GooglePeriod[] } }[];
      };
      const periods = data.places?.[0]?.regularOpeningHours?.periods;
      if (periods?.length) week = weekFromGooglePeriods(periods);
    }
  } catch {
    week = null;
  }

  g.__mrHoursCache = { week, at: Date.now() };
  if (week && r) {
    try {
      await r.set("hours:google", week, { ex: Math.floor(GOOGLE_TTL_MS / 1000) });
    } catch {
      /* pamięć już ma */
    }
  }
  return week;
}

/* ---------- godziny tygodnia + stan „czy przyjmujemy" ---------- */

export async function getWeekHours(): Promise<{ week: WeekHours; source: HoursSource }> {
  const fromGoogle = await fetchGoogleWeek();
  if (fromGoogle) return { week: fromGoogle, source: "google" };

  const env = process.env.OPENING_HOURS;
  if (env) {
    const parsed = parseOpeningHours(env);
    if (parsed) return { week: parsed, source: "env" };
  }
  return { week: DEFAULT_WEEK, source: "default" };
}

/** Najbliższy termin otwarcia: „dziś od 11:00", „jutro od 11:00", „w piątek od 12:00". */
function nextOpening(week: WeekHours, day: number, minutes: number): string | null {
  for (let off = 0; off < 8; off++) {
    const d = (day + off) % 7;
    const h = week[d];
    if (!h) continue;
    if (off === 0 && minutes >= toMin(h.open)) continue; // dzisiejsze otwarcie już było
    const when = off === 0 ? "dziś" : off === 1 ? "jutro" : `w ${DAY_NAMES[d] === "środa" ? "środę" : DAY_NAMES[d].replace(/a$/, "ę")}`;
    return `${when} od ${h.open}`;
  }
  return null;
}

export async function getOpenState(): Promise<OpenState> {
  const { week, source } = await getWeekHours();
  const { day, minutes } = nowInPoland();

  const evaluate = (h: DayHours, nowMin: number): { open: boolean; accepting: boolean; lastOrder: number } | null => {
    if (!h) return null;
    const openMin = toMin(h.open);
    let closeMin = toMin(h.close);
    if (closeMin <= openMin) closeMin += 1440; // zamknięcie po północy
    const lastOrder = closeMin - LAST_ORDER_MIN;
    if (nowMin < openMin || nowMin >= closeMin) return null;
    return { open: true, accepting: nowMin <= lastOrder, lastOrder };
  };

  // Dziś oraz „wczorajsza" zmiana ciągnąca się przez północ.
  const today = week[day];
  const yesterday = week[(day + 6) % 7];
  const active = evaluate(today, minutes) ?? evaluate(yesterday, minutes + 1440);

  const lastOrderStr = today
    ? toHHMM((toMin(today.close) <= toMin(today.open) ? toMin(today.close) + 1440 : toMin(today.close)) - LAST_ORDER_MIN)
    : null;

  if (active?.accepting) {
    return {
      open: true,
      acceptingOrders: true,
      today,
      lastOrder: toHHMM(active.lastOrder),
      message: "",
      source,
      week,
    };
  }

  const next = nextOpening(week, day, minutes);
  const message = active
    ? `Kuchnia kończy pracę — ostatnie zamówienia przyjmowaliśmy do ${toHHMM(active.lastOrder)}.${next ? ` Zapraszamy ${next}.` : ""}`
    : `Lokal jest teraz zamknięty.${next ? ` Zamówienia przyjmujemy ${next}.` : ""}`;

  return {
    open: Boolean(active),
    acceptingOrders: false,
    today,
    lastOrder: lastOrderStr,
    message,
    source,
    week,
  };
}

/** Etykieta dnia do wyświetlenia, np. „pon 11:00–21:00" / „ndz zamknięte". */
export function dayLabel(week: WeekHours, day: number): string {
  const short = ["pon", "wt", "śr", "czw", "pt", "sob", "ndz"][day];
  const h = week[day];
  return h ? `${short} ${h.open}–${h.close}` : `${short} zamknięte`;
}
