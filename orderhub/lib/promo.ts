/**
 * Kody rabatowe — faza R1 (patrz docs/PLAN_KODY_RABATOWE.md).
 *
 * Zasady: rabat liczony od koszyka (nigdy od dostawy), minimum dostawy
 * sprawdzane PRZED rabatem, walidacja zawsze po stronie serwera,
 * jeden kod na zamówienie. Zarządzanie: karta „Rabaty" w panelu.
 *
 * Magazyn: Redis (Upstash/Vercel KV) gdy skonfigurowany, inaczej pamięć procesu.
 * Skala pizzerii — całość trzymamy pod jednym kluczem `promo:codes`.
 */

import { Redis } from "@upstash/redis";
import { orderStore } from "@/lib/orders/store";
import type { FulfillmentMode } from "@/lib/orders/types";

export interface PromoCode {
  code: string; // znormalizowany: wielkie litery, bez spacji
  kind: "percent" | "amount"; // −X% albo −X zł
  value: number;
  minSubtotal?: number; // minimalny koszyk (przed rabatem)
  scope: "all" | "delivery" | "pickup";
  onlineOnly?: boolean; // tylko strona klienta (nie telefon)
  oncePerPhone?: boolean; // jeden raz na numer telefonu
  firstOrderOnly?: boolean; // tylko pierwsze zamówienie z tego numeru
  validUntil?: string; // "2026-08-31" (koniec dnia, czas polski)
  maxUses?: number;
  active: boolean;
  usedCount: number;
  usedPhones?: string[]; // znormalizowane numery (dla oncePerPhone/first)
  createdAt: string;
}

export type PromoCheck =
  | { ok: true; code: string; discount: number; label: string }
  | { ok: false; reason: string };

const KEY = "promo:codes";
const MAX_PHONES = 5000;

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
  var __mrPromo: PromoCode[] | undefined;
}
const g = globalThis as typeof globalThis & { __mrPromo?: PromoCode[] };

export function normalizeCode(code: string): string {
  return code.toUpperCase().replace(/\s+/g, "");
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "").replace(/^48/, "");
}

/** Dzisiejsza data w Polsce jako "YYYY-MM-DD" (do porównań z validUntil). */
function todayInPoland(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Warsaw" }).format(new Date());
}

/** Startowe kody (zatwierdzone przez właściciela 12.07.2026) — tylko przy pustym magazynie. */
function starterCodes(): PromoCode[] {
  const now = new Date().toISOString();
  return [
    {
      code: "WITAJ10",
      kind: "percent",
      value: 10,
      scope: "all",
      onlineOnly: true,
      oncePerPhone: true,
      firstOrderOnly: true,
      active: true,
      usedCount: 0,
      createdAt: now,
    },
    { code: "ULOTKA15", kind: "amount", value: 15, minSubtotal: 60, scope: "all", active: true, usedCount: 0, createdAt: now },
    { code: "ODBIOR10", kind: "percent", value: 10, scope: "pickup", active: true, usedCount: 0, createdAt: now },
  ];
}

async function load(): Promise<PromoCode[]> {
  const r = redis();
  if (r) {
    try {
      const list = await r.get<PromoCode[]>(KEY);
      if (list) return list;
      const seeded = starterCodes();
      await r.set(KEY, seeded);
      return seeded;
    } catch {
      /* pamięć niżej */
    }
  }
  if (!g.__mrPromo) g.__mrPromo = starterCodes();
  return g.__mrPromo;
}

async function save(list: PromoCode[]): Promise<void> {
  g.__mrPromo = list;
  const r = redis();
  if (r) {
    try {
      await r.set(KEY, list);
    } catch {
      /* pamięć już ma */
    }
  }
}

export async function listPromoCodes(): Promise<PromoCode[]> {
  return load();
}

/** Dodaje lub nadpisuje kod (po znormalizowanej nazwie). Zachowuje licznik użyć. */
export async function upsertPromoCode(input: Omit<PromoCode, "usedCount" | "usedPhones" | "createdAt"> ): Promise<PromoCode> {
  const list = await load();
  const code = normalizeCode(input.code);
  const existing = list.find((c) => c.code === code);
  const saved: PromoCode = {
    ...input,
    code,
    value: Math.max(0, input.value),
    usedCount: existing?.usedCount ?? 0,
    usedPhones: existing?.usedPhones,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  };
  await save([saved, ...list.filter((c) => c.code !== code)]);
  return saved;
}

export async function deletePromoCode(code: string): Promise<boolean> {
  const list = await load();
  const norm = normalizeCode(code);
  const next = list.filter((c) => c.code !== norm);
  if (next.length === list.length) return false;
  await save(next);
  return true;
}

/**
 * Sprawdza kod dla danego koszyka. Nie zużywa kodu — od tego jest redeemPromoCode
 * (wołane dopiero przy zapisie zamówienia).
 */
export async function checkPromoCode(input: {
  code: string;
  subtotal: number;
  mode: FulfillmentMode;
  phone?: string;
  source?: "online" | "phone";
}): Promise<PromoCheck> {
  const list = await load();
  const promo = list.find((c) => c.code === normalizeCode(input.code));
  if (!promo || !promo.active) return { ok: false, reason: "Nieznany albo wyłączony kod." };

  if (promo.validUntil && todayInPoland() > promo.validUntil) {
    return { ok: false, reason: "Kod stracił ważność." };
  }
  if (promo.maxUses && promo.usedCount >= promo.maxUses) {
    return { ok: false, reason: "Kod został już wykorzystany (limit użyć)." };
  }
  if (promo.scope !== "all" && promo.scope !== input.mode) {
    return {
      ok: false,
      reason: promo.scope === "pickup" ? "Ten kod działa tylko przy odbiorze osobistym." : "Ten kod działa tylko przy dostawie.",
    };
  }
  if (promo.onlineOnly && input.source === "phone") {
    return { ok: false, reason: "Ten kod działa tylko na stronie internetowej." };
  }
  if (promo.minSubtotal && input.subtotal < promo.minSubtotal) {
    return { ok: false, reason: `Ten kod działa od ${promo.minSubtotal} zł (wartość koszyka).` };
  }

  const phone = input.phone ? normalizePhone(input.phone) : "";
  if (phone && promo.oncePerPhone && promo.usedPhones?.includes(phone)) {
    return { ok: false, reason: "Ten kod był już użyty z tym numerem telefonu." };
  }
  if (phone && promo.firstOrderOnly) {
    const all = await orderStore.list();
    const hadOrder = all.some(
      (o) => o.status !== "canceled" && normalizePhone(o.customer.phone) === phone
    );
    if (hadOrder) return { ok: false, reason: "Ten kod jest tylko dla nowych klientów (pierwsze zamówienie)." };
  }

  const raw = promo.kind === "percent" ? (input.subtotal * promo.value) / 100 : promo.value;
  const discount = Math.min(Math.round(raw * 100) / 100, input.subtotal);
  if (discount <= 0) return { ok: false, reason: "Dodaj coś do koszyka, aby użyć kodu." };

  const label = promo.kind === "percent" ? `${promo.code} (−${promo.value}%)` : `${promo.code} (−${promo.value} zł)`;
  return { ok: true, code: promo.code, discount, label };
}

/** Zużywa kod (licznik + numer telefonu). Wołać dopiero po przyjęciu zamówienia. */
export async function redeemPromoCode(code: string, phone?: string): Promise<void> {
  const list = await load();
  const promo = list.find((c) => c.code === normalizeCode(code));
  if (!promo) return;
  promo.usedCount += 1;
  if (phone && (promo.oncePerPhone || promo.firstOrderOnly)) {
    const norm = normalizePhone(phone);
    promo.usedPhones = [...(promo.usedPhones ?? []), norm].slice(-MAX_PHONES);
  }
  await save(list);
}
