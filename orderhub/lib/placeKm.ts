/**
 * Samoucząca się tabela odległości miejscowości.
 *
 * Bez klucza map (i jako uzupełnienie geokodera): pierwszy raz obsługa podaje
 * odległość dla np. „Stężyca" ręcznie — zapamiętujemy ją na stałe i każde
 * kolejne zamówienie z tej miejscowości wycenia się samo.
 *
 * Magazyn: Redis (Upstash/Vercel KV) gdy skonfigurowany, inaczej pamięć procesu.
 */

import { Redis } from "@upstash/redis";

const URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

let client: Redis | null = null;
function redis(): Redis | null {
  if (!URL || !TOKEN) return null;
  if (!client) client = new Redis({ url: URL, token: TOKEN });
  return client;
}

declare global {
  // eslint-disable-next-line no-var
  var __mrPlaceKm: Map<string, number> | undefined;
}
const g = globalThis as typeof globalThis & { __mrPlaceKm?: Map<string, number> };
if (!g.__mrPlaceKm) g.__mrPlaceKm = new Map();
const mem = g.__mrPlaceKm;

/** Klucz miejscowości: małe litery, bez ogonków i śmieci — „Stara  Kiszewa" === „stara kiszewa". */
export function placeKey(city: string): string {
  return city
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ł/g, "l")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export async function getPlaceKm(city?: string): Promise<number | null> {
  const key = city ? placeKey(city) : "";
  if (!key) return null;
  const r = redis();
  if (r) {
    try {
      const v = await r.get<number>(`placekm:${key}`);
      return typeof v === "number" && v > 0 ? v : null;
    } catch {
      /* spadamy na pamięć */
    }
  }
  return mem.get(key) ?? null;
}

export async function setPlaceKm(city: string | undefined, km: number): Promise<void> {
  const key = city ? placeKey(city) : "";
  if (!key || !(km > 0) || km > 100) return;
  mem.set(key, km);
  const r = redis();
  if (r) {
    try {
      await r.set(`placekm:${key}`, km);
    } catch {
      /* pamięć już ma */
    }
  }
}
