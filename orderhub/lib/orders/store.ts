/**
 * Magazyn zamówień.
 *
 * Dwie implementacje wybierane automatycznie (patrz `pickStore`):
 * - in-memory (Map) — lokalnie / gdy brak konfiguracji Redis,
 * - Redis (Vercel KV / Upstash) — produkcja, gdy ustawione KV_REST_API_URL/TOKEN
 *   (trwałość + działanie na wielu instancjach serverless). Patrz `kvStore.ts`.
 */

import type { NewOrderInput, Order, OrderStatus } from "./types";

export interface OrderStore {
  create(input: NewOrderInput): Promise<Order>;
  get(id: string): Promise<Order | null>;
  list(): Promise<Order[]>;
  update(id: string, patch: Partial<Order>): Promise<Order | null>;
  /** Trwałe usunięcie (historia w panelu) — NIE cofa niczego w Dotykačce. */
  remove(id: string): Promise<boolean>;
}

// --- Implementacja in-memory ---

declare global {
  // eslint-disable-next-line no-var
  var __mrOrderStore: { orders: Map<string, Order>; seq: number } | undefined;
}

const g = globalThis as typeof globalThis & {
  __mrOrderStore?: { orders: Map<string, Order>; seq: number };
};
if (!g.__mrOrderStore) {
  g.__mrOrderStore = { orders: new Map(), seq: 1042 };
}
const db = g.__mrOrderStore;

function genId(): string {
  return `o_${db.seq}_${Math.floor(performance.now())}`;
}

export const memoryStore: OrderStore = {
  async create(input) {
    db.seq += 1;
    const number = db.seq;
    const id = genId();
    const order: Order = {
      id,
      number,
      externalId: `mr-${number}`,
      createdAt: new Date().toISOString(),
      status: input.timeMode === "scheduled" ? "scheduled" : "new",
      mode: input.mode,
      timeMode: input.timeMode,
      scheduledTime: input.scheduledTime,
      customer: input.customer,
      items: input.items,
      subtotal: input.subtotal,
      deliveryFee: input.deliveryFee,
      total: input.total,
      payment: input.payment,
      pos: { sent: false, simulated: false },
    };
    db.orders.set(id, order);
    return order;
  },

  async get(id) {
    return db.orders.get(id) ?? null;
  },

  async list() {
    return [...db.orders.values()].sort((a, b) => b.number - a.number);
  },

  async update(id, patch) {
    const cur = db.orders.get(id);
    if (!cur) return null;
    const next = { ...cur, ...patch, pos: { ...cur.pos, ...(patch.pos ?? {}) } };
    db.orders.set(id, next);
    return next;
  },

  async remove(id) {
    return db.orders.delete(id);
  },
};

// Wybór magazynu: trwały Redis (Vercel KV / Upstash) gdy skonfigurowany, inaczej pamięć.
function pickStore(): OrderStore {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    // Import dynamiczny, by nie inicjalizować klienta bez konfiguracji.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { makeKvStore } = require("./kvStore") as typeof import("./kvStore");
    return makeKvStore();
  }
  return memoryStore;
}

export const orderStore: OrderStore = pickStore();

export function setEta(order: Order, minutes: number): Partial<Order> {
  const etaAt = new Date(Date.now() + minutes * 60_000).toISOString();
  const nextStatus: OrderStatus = "in_progress";
  return { etaMinutes: minutes, etaAt, status: nextStatus };
}
