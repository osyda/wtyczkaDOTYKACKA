/**
 * Autoryzacja obsługi — DWIE WARSTWY (decyzja właściciela 13.07.2026):
 *
 *  1. HASŁO URZĄDZENIA (STAFF_PIN) — wpisywane raz na 90 dni na każdym
 *     urządzeniu; chroni /panel, /panel/telefon, /panel/kierowca i /status.
 *     Obcy bez hasła nie zobaczy nawet ekranu kodów.
 *  2. OSOBISTE KODY personelu (STAFF_CODES = "Ania:1234, Kasia:5678") —
 *     wpisywane ZA bramką urządzenia; identyfikują, kto obsługuje (podpis
 *     przy zamówieniach). Dotykačka nie udostępnia PIN-ów przez API
 *     (sprawdzone 13.07.2026), więc kody ustawia się ręcznie w Vercelu —
 *     mogą być te same, co w POS.
 *
 * Ciasteczko sesji nie przechowuje żadnego hasła — trzyma token pochodny
 * z sekretu serwera.
 */

export function staffProtectionEnabled(): boolean {
  return Boolean(process.env.STAFF_PIN?.trim());
}

/** Czy skonfigurowano osobiste kody personelu (warstwa 2). */
export function staffCodesEnabled(): boolean {
  return Boolean(process.env.STAFF_CODES?.trim());
}

/** Dopasowanie osobistego kodu do imienia: STAFF_CODES="Ania:1234, Kasia:5678". */
export function findStaffByCode(code: string): string | null {
  const wanted = code.trim();
  if (!wanted) return null;
  for (const pair of (process.env.STAFF_CODES ?? "").split(",")) {
    const idx = pair.lastIndexOf(":");
    if (idx < 1) continue;
    const name = pair.slice(0, idx).trim();
    const c = pair.slice(idx + 1).trim();
    if (name && c && c === wanted) return name;
  }
  return null;
}

/** Token sesji: skrót sekretu serwera (STAFF_PIN + refresh token). */
export async function staffToken(): Promise<string | null> {
  const secret =
    (process.env.STAFF_PIN?.trim() || "") + "|" + (process.env.DOTYKACKA_REFRESH_TOKEN?.trim() || "");
  if (secret === "|") return null;
  const data = new TextEncoder().encode(secret + "|mammarosa-staff-v1");
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/* ---------- KODY KIEROWCÓW (15.07.2026) ----------
 * Każdy kierowca loguje się na SWOIM telefonie własnym kodem
 * (DRIVER_CODES="Marcin /WYNOS=1111,Dominik J/WYNOS=2222,...") i widzi tylko
 * swoje kursy. Ciasteczko driver_auth = imię.podpis (90 dni), bez kodu w środku.
 * Imiona muszą brzmieć DOKŁADNIE tak jak w zmiennej DRIVERS. */

export function driverCodesEnabled(): boolean {
  return Boolean(process.env.DRIVER_CODES?.trim());
}

/** Dopasowanie kodu kierowcy do imienia: DRIVER_CODES="Imię=kod,Imię2=kod2". */
export function findDriverByCode(code: string): string | null {
  const wanted = code.trim();
  if (!wanted) return null;
  for (const pair of (process.env.DRIVER_CODES ?? "").split(",")) {
    const idx = pair.lastIndexOf("=");
    if (idx < 1) continue;
    const name = pair.slice(0, idx).trim();
    const c = pair.slice(idx + 1).trim();
    if (name && c && c === wanted) return name;
  }
  return null;
}

/** Podpis imienia kierowcy do ciasteczka (pochodna sekretu serwera, bez kodu). */
export async function driverSig(name: string): Promise<string | null> {
  const secret =
    (process.env.STAFF_PIN?.trim() || "") + "|" + (process.env.DOTYKACKA_REFRESH_TOKEN?.trim() || "");
  if (secret === "|") return null;
  const data = new TextEncoder().encode(`${secret}|driver|${name}|mammarosa-driver-v1`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/* base64url bez Buffera — działa i w Node, i w Edge (middleware). */
function b64urlEncode(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlDecode(s: string): string {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

/** Wartość ciasteczka driver_auth: "imię.podpis" (imię w base64url — polskie znaki). */
export async function driverCookieValue(name: string): Promise<string | null> {
  const sig = await driverSig(name);
  if (!sig) return null;
  return `${b64urlEncode(name)}.${sig}`;
}

/** Weryfikacja ciasteczka driver_auth → imię kierowcy albo null. */
export async function verifyDriverCookie(value: string | undefined): Promise<string | null> {
  if (!value) return null;
  const dot = value.lastIndexOf(".");
  if (dot < 1) return null;
  try {
    const name = b64urlDecode(value.slice(0, dot));
    const sig = await driverSig(name);
    return sig && sig === value.slice(dot + 1) ? name : null;
  } catch {
    return null;
  }
}
