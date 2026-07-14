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

/**
 * Znajdź klienta po telefonie albo utwórz nowego. Zwraca customerId lub null.
 *
 * USTALONE NA ŻYWO (14.07.2026, /status):
 * - filtrowanie klientów po phone/externalId NIE działa (404/400) → własna
 *   mapa telefon→id w Redis chroni przed duplikatami,
 * - tworzenie wymaga WSZYSTKICH pól nie-null (barcode, companyName, hexColor,
 *   headerPrint, …), POST przyjmuje WYŁĄCZNIE tablicę („json array expected").
 */
export async function upsertCustomerByPhone(customer: OrderCustomer): Promise<string | null> {
  const { cloudId } = dotykackaConfig;
  const phone = customer.phone.replace(/\s+/g, "");
  if (!phone) return null;

  const steps: string[] = [];
  const finish = async (id: string | null): Promise<string | null> => {
    await saveDebug({ at: new Date().toISOString(), phone, steps, customerId: id });
    return id;
  };

  // 1) Nasza mapa telefon→id (Redis) — jedyny pewny sposób deduplikacji,
  // bo API nie wspiera filtrowania klientów po telefonie.
  const mapKey = `dotykacka:custId:${phone}`;
  try {
    const cached = await redis()?.get<string>(mapKey);
    if (cached) {
      steps.push(`Redis: znany klient, id ${cached}`);
      return finish(String(cached));
    }
  } catch {
    /* brak Redis nie blokuje */
  }

  // 2) Filtry API (na wypadek, gdyby któryś jednak działał / zaczął działać).
  const extId = `WWW-${phone}`;
  for (const filter of [`barcode|eq|${extId}`, `phone|eq|${phone}`]) {
    const search = await dotyRequest<{ data?: DotyCustomer[] }>(`/clouds/${cloudId}/customers`, {
      query: { filter, limit: 1 },
    });
    const found = search.data?.data?.[0];
    const label = filter.split("|").slice(0, 2).join("|");
    if (found) {
      steps.push(`szukanie ${label}: HTTP ${search.status}, znaleziony id ${found.id}`);
      try {
        await redis()?.set(mapKey, String(found.id));
      } catch {}
      return finish(String(found.id));
    }
    steps.push(
      search.ok
        ? `szukanie ${label}: HTTP ${search.status}, brak`
        : `szukanie ${label}: HTTP ${search.status} → ${search.raw.slice(0, 120)}`
    );
  }

  // 3) Tworzenie: komplet pól ("" / wartości domyślne — walidacja: must not be null).
  const { firstName, lastName } = splitName(customer.name);
  const entity = {
    _cloudId: Number(cloudId) || cloudId,
    firstName: firstName || "Klient",
    lastName: lastName || "",
    companyName: "",
    companyId: "",
    vatId: "",
    email: customer.email?.trim() || "",
    phone,
    addressLine1: customer.street?.trim() || "",
    addressLine2: "",
    city: customer.city?.trim() || "",
    zip: customer.zip?.trim() || "",
    country: "PL",
    barcode: extId,
    hexColor: "#8E3B2F",
    headerPrint: "",
    points: 0,
    flags: 0,
    display: true,
    deleted: false,
    tags: ["WWW"],
    note: "Klient z zamówień online (Mammarosa OrderHub)",
    internalNote: "",
  };

  type CreateResp = DotyCustomer[] | { data?: DotyCustomer[] };
  const pickId = (data: CreateResp | null): string | null => {
    if (!data) return null;
    if (Array.isArray(data)) return data[0]?.id !== undefined ? String(data[0].id) : null;
    if (Array.isArray(data.data) && data.data[0]?.id !== undefined) return String(data.data[0].id);
    return null;
  };

  const create = await dotyRequest<CreateResp>(`/clouds/${cloudId}/customers`, {
    method: "POST",
    body: [entity],
  });
  const id = create.ok ? pickId(create.data) : null;
  steps.push(
    id ? `tworzenie: HTTP ${create.status}, id ${id}` : `tworzenie: HTTP ${create.status} → ${create.raw.slice(0, 300)}`
  );

  if (id) {
    try {
      await redis()?.set(mapKey, id);
    } catch {}
  } else {
    console.error(`[dotykacka] klient ${phone} nie powstał: ${steps.join(" | ")}`);
  }
  return finish(id);
}
