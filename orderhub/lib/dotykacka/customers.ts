/**
 * Obsługa encji Customer w Dotykačce (Faza 2).
 * Cel: zamiast wrzucać klienta do notatki — znaleźć go po telefonie lub utworzyć,
 * a potem podpiąć przez customer-id do rachunku.
 *
 * Wg wzoru z docs/dotypos_api_brain.md §9.8 tworzenie wymaga m.in. _cloudId,
 * display/deleted/points/flags. POST przyjmuje TABLICĘ encji (konwencja list
 * w API v2) — wysyłamy [obiekt], a przy odmowie ponawiamy pojedynczym obiektem.
 *
 * DIAGNOSTYKA (14.07.2026, klient nie powstawał na żywo): każda próba zapisuje
 * przebieg (statusy HTTP + odpowiedzi API) do Redis — ostatnia próba jest
 * widoczna na /status, więc nie trzeba grzebać w logach Vercela.
 */

import { Redis } from "@upstash/redis";
import { dotykackaConfig } from "./config";
import { dotyRequest } from "./client";
import type { OrderCustomer } from "@/lib/orders/types";

interface DotyCustomer {
  id: number | string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

function splitName(full: string): { firstName: string; lastName: string } {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts.slice(0, -1).join(" "), lastName: parts.at(-1) ?? "" };
}

/* ---------- diagnostyka ostatniej próby (Redis → /status) ---------- */

export type CustomerDebug = {
  at: string;
  phone: string;
  steps: string[];
  customerId: string | null;
};

const DEBUG_KEY = "dotykacka:customerDebug";
const URL_KV = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN_KV = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
let kv: Redis | null = null;
function redis(): Redis | null {
  if (!URL_KV || !TOKEN_KV) return null;
  if (!kv) kv = new Redis({ url: URL_KV, token: TOKEN_KV });
  return kv;
}

async function saveDebug(d: CustomerDebug): Promise<void> {
  try {
    await redis()?.set(DEBUG_KEY, d);
  } catch {
    /* diagnostyka nie może blokować zamówienia */
  }
}

/** Ostatnia próba utworzenia/wyszukania klienta — do karty na /status. */
export async function lastCustomerDebug(): Promise<CustomerDebug | null> {
  try {
    return (await redis()?.get<CustomerDebug>(DEBUG_KEY)) ?? null;
  } catch {
    return null;
  }
}

/** Szybki test uprawnień: GET /customers?limit=1 (tylko odczyt, nic nie tworzy). */
export async function customersProbe(): Promise<{ ok: boolean; status: number; total: number | null; raw: string }> {
  const { cloudId } = dotykackaConfig;
  const res = await dotyRequest<{ totalItemsCount?: number | null; data?: unknown[] }>(
    `/clouds/${cloudId}/customers`,
    { query: { limit: 1 } }
  );
  return {
    ok: res.ok,
    status: res.status,
    total: res.data?.totalItemsCount ?? (Array.isArray(res.data?.data) ? res.data.data.length : null),
    raw: res.ok ? "" : res.raw.slice(0, 200),
  };
}

/* ---------- właściwy upsert ---------- */

/** Znajdź klienta po telefonie albo utwórz nowego. Zwraca customerId lub null. */
export async function upsertCustomerByPhone(customer: OrderCustomer): Promise<string | null> {
  const { cloudId } = dotykackaConfig;
  const phone = customer.phone.replace(/\s+/g, "");
  if (!phone) return null;

  const steps: string[] = [];
  const finish = async (id: string | null): Promise<string | null> => {
    await saveDebug({ at: new Date().toISOString(), phone, steps, customerId: id });
    return id;
  };

  // 1) Szukaj po telefonie (składnia filtra: attribute|operation|value).
  const search = await dotyRequest<{ data?: DotyCustomer[] }>(`/clouds/${cloudId}/customers`, {
    query: { filter: `phone|eq|${phone}`, limit: 1 },
  });
  const found = search.data?.data?.[0];
  if (found) {
    steps.push(`szukanie: HTTP ${search.status}, znaleziony id ${found.id}`);
    return finish(String(found.id));
  }
  steps.push(
    search.ok
      ? `szukanie: HTTP ${search.status}, brak klienta z tym numerem`
      : `szukanie: HTTP ${search.status} → ${search.raw.slice(0, 200)}`
  );

  // 2) Brak — utwórz (wzór z dokumentacji §9.8; pól pustych NIE wysyłamy,
  // bo puste stringi potrafią nie przejść walidacji, np. email).
  const { firstName, lastName } = splitName(customer.name);
  const opt = (k: string, v: string | undefined | null) => (v && v.trim() ? { [k]: v.trim() } : {});
  const entity = {
    _cloudId: Number(cloudId) || cloudId,
    firstName: firstName || "Klient",
    ...(lastName ? { lastName } : {}),
    ...opt("email", customer.email),
    phone,
    ...opt("addressLine1", customer.street),
    ...opt("city", customer.city),
    ...opt("zip", customer.zip),
    country: "PL",
    display: true,
    deleted: false,
    points: 0,
    flags: 0,
    tags: ["WWW"],
    note: "Klient z zamówień online (Mammarosa OrderHub)",
  };

  type CreateResp = DotyCustomer | DotyCustomer[] | { data?: DotyCustomer[] };
  const pickId = (data: CreateResp | null): string | null => {
    if (!data) return null;
    if (Array.isArray(data)) return data[0]?.id !== undefined ? String(data[0].id) : null;
    if ("id" in data && data.id !== undefined) return String(data.id);
    if ("data" in data && Array.isArray(data.data) && data.data[0]?.id !== undefined) return String(data.data[0].id);
    return null;
  };

  // Najpierw tablica (konwencja API v2), potem pojedynczy obiekt.
  const asArray = await dotyRequest<CreateResp>(`/clouds/${cloudId}/customers`, {
    method: "POST",
    body: [entity],
  });
  let id = asArray.ok ? pickId(asArray.data) : null;
  steps.push(
    id
      ? `tworzenie (tablica): HTTP ${asArray.status}, id ${id}`
      : `tworzenie (tablica): HTTP ${asArray.status} → ${asArray.raw.slice(0, 300)}`
  );
  if (!id) {
    const asObject = await dotyRequest<CreateResp>(`/clouds/${cloudId}/customers`, {
      method: "POST",
      body: entity,
    });
    id = asObject.ok ? pickId(asObject.data) : null;
    steps.push(
      id
        ? `tworzenie (obiekt): HTTP ${asObject.status}, id ${id}`
        : `tworzenie (obiekt): HTTP ${asObject.status} → ${asObject.raw.slice(0, 300)}`
    );
  }
  if (!id) console.error(`[dotykacka] klient ${phone} nie powstał: ${steps.join(" | ")}`);
  return finish(id);
}
