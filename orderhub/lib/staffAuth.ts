/**
 * Autoryzacja obsługi.
 *
 * Do panelu wpuszczają DWA rodzaje kodów:
 *  1. STAFF_PIN — wspólny PIN zapasowy (Vercel env),
 *  2. osobiste kody pracowników z Dotykački (te same, którymi logują się do POS),
 *     pobierane przez API — działa automatycznie po podpięciu kluczy.
 *
 * Ciasteczko sesji nie przechowuje żadnego PIN-u — trzyma token pochodny
 * z sekretu serwera, więc kod pracownika nie wycieka do przeglądarki.
 */

export function staffProtectionEnabled(): boolean {
  return Boolean(process.env.STAFF_PIN?.trim());
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
