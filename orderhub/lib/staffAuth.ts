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
