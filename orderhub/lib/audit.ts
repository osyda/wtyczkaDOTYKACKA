/**
 * DZIENNIK ZDARZEŃ (audit log) — życzenie właściciela 14.07.2026 po zgubionych
 * zamówieniach: każdy krok przepływu (przyjęcie, kierowca, wysyłka do POS,
 * statusy, usunięcia) zapisuje się do Redis z czasem trwania i wynikiem.
 * Podgląd: zakładka „Dziennik" w panelu (+ /api/audit). Ostatnie 600 wpisów.
 * Log nigdy nie blokuje właściwej operacji.
 */

import { Redis } from "@upstash/redis";

export interface AuditEvent {
  at: string; // ISO
  event: string; // np. "wysyłka do POS"
  order?: number | null; // numer zamówienia (#1085)
  ok?: boolean; // wynik (undefined = zdarzenie informacyjne)
  ms?: number; // czas trwania operacji
  details?: string; // szczegóły / treść błędu
}

const KEY = "audit:log";
const URL_KV = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN_KV = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
let kv: Redis | null = null;
function redis(): Redis | null {
  if (!URL_KV || !TOKEN_KV) return null;
  if (!kv) kv = new Redis({ url: URL_KV, token: TOKEN_KV });
  return kv;
}

export async function audit(
  event: string,
  data: { order?: number | null; ok?: boolean; ms?: number; details?: string } = {}
): Promise<void> {
  const entry: AuditEvent = {
    at: new Date().toISOString(),
    event,
    order: data.order ?? null,
    ...(data.ok !== undefined ? { ok: data.ok } : {}),
    ...(data.ms !== undefined ? { ms: Math.round(data.ms) } : {}),
    ...(data.details ? { details: data.details.slice(0, 400) } : {}),
  };
  // Zawsze też do logów Vercela (Runtime Logs) — drugi ślad.
  console.log(
    `[audit] ${entry.event}${entry.order ? ` #${entry.order}` : ""}${entry.ok === false ? " BŁĄD" : ""}${entry.ms ? ` ${entry.ms}ms` : ""}${entry.details ? ` | ${entry.details}` : ""}`
  );
  try {
    const r = redis();
    if (r) {
      await r.lpush(KEY, entry);
      await r.ltrim(KEY, 0, 599);
    }
  } catch {
    /* dziennik nie może wywracać operacji */
  }
}

export async function auditList(limit = 250): Promise<AuditEvent[]> {
  try {
    return (await redis()?.lrange<AuditEvent>(KEY, 0, limit - 1)) ?? [];
  } catch {
    return [];
  }
}
