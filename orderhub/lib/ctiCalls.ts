/**
 * Centralka telefoniczna — stan „teraz dzwoni" + dziennik połączeń.
 *
 * Zdarzenia wpadają webhookiem POST/GET /api/cti/call (z centralki VoIP,
 * aplikacji na telefonie w lokalu itp.). Panel odpytuje /api/cti/ring co parę
 * sekund i pokazuje baner z rozpoznanym klientem.
 *
 * Magazyn: Redis (Upstash/Vercel KV) gdy skonfigurowany, inaczej pamięć procesu.
 */

import { Redis } from "@upstash/redis";

export type RingState = { phone: string; at: string };
export type CallLogEntry = { id: string; phone: string; at: string };

/** Ile sekund „dzwoni" wisi bez kolejnych zdarzeń (centralki rzadko ślą „koniec"). */
export const RING_TTL_S = 90;
const LOG_MAX = 100;

const URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
let client: Redis | null = null;
function redis(): Redis | null {
  if (!URL || !TOKEN) return null;
  if (!client) client = new Redis({ url: URL, token: TOKEN });
  return client;
}

type Mem = { ring: RingState | null; log: CallLogEntry[] };
declare global {
  // eslint-disable-next-line no-var
  var __mrCti: Mem | undefined;
}
const g = globalThis as typeof globalThis & { __mrCti?: Mem };
if (!g.__mrCti) g.__mrCti = { ring: null, log: [] };
const mem = g.__mrCti;

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "").replace(/^48/, "");
}

function freshRing(r: RingState | null): RingState | null {
  if (!r) return null;
  return Date.now() - new Date(r.at).getTime() < RING_TTL_S * 1000 ? r : null;
}

/** Zdarzenie „dzwoni telefon". Zwraca false, gdy to duplikat trwającego dzwonka. */
export async function reportRing(phoneRaw: string): Promise<boolean> {
  const phone = normalizePhone(phoneRaw);
  if (phone.length < 6) return false;

  const current = await getRing();
  const duplicate = current !== null && normalizePhone(current.phone) === phone;

  const ring: RingState = { phone, at: duplicate ? current.at : new Date().toISOString() };
  mem.ring = ring;
  const r = redis();
  if (r) {
    try {
      await r.set("cti:ring", ring, { ex: RING_TTL_S });
    } catch {
      /* pamięć już ma */
    }
  }

  if (!duplicate) {
    const entry: CallLogEntry = { id: `c_${Date.now()}_${phone.slice(-4)}`, phone, at: ring.at };
    mem.log = [entry, ...mem.log].slice(0, LOG_MAX);
    if (r) {
      try {
        await r.lpush("cti:calls", entry);
        await r.ltrim("cti:calls", 0, LOG_MAX - 1);
      } catch {
        /* pamięć już ma */
      }
    }
  }
  return !duplicate;
}

/** Zdarzenie „koniec połączenia" — chowa baner. */
export async function reportEnd(): Promise<void> {
  mem.ring = null;
  const r = redis();
  if (r) {
    try {
      await r.del("cti:ring");
    } catch {
      /* trudno */
    }
  }
}

export async function getRing(): Promise<RingState | null> {
  const r = redis();
  if (r) {
    try {
      return freshRing(await r.get<RingState>("cti:ring"));
    } catch {
      /* pamięć niżej */
    }
  }
  return freshRing(mem.ring);
}

export async function listCalls(limit = 30): Promise<CallLogEntry[]> {
  const r = redis();
  if (r) {
    try {
      const rows = await r.lrange<CallLogEntry>("cti:calls", 0, limit - 1);
      if (rows.length > 0 || mem.log.length === 0) return rows;
    } catch {
      /* pamięć niżej */
    }
  }
  return mem.log.slice(0, limit);
}

/** Klucz webhooka: gdy ustawiony, każde zdarzenie musi go podać (?key= / nagłówek). */
export function webhookKey(): string {
  return process.env.CTI_WEBHOOK_KEY || "";
}
