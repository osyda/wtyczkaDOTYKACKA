/**
 * Magazyn zamówień.
 *
 * FAZA 2/3: implementacja in-memory (Map w pamięci procesu) — wystarcza do działania
 * całego przepływu lokalnie i na pojedynczej instancji.
 *
 * ⚠️ DO ZROBIENIA przy wdrożeniu na Vercel (środowisko serverless = wiele instancji):
 * podmienić na trwały magazyn (Postgres/Neon lub Vercel KV). Interfejs `OrderStore`
 * jest celowo wąski, żeby podmiana była prosta.
 */

import type { NewOrderInput, Order, OrderStatus } from "./types";

export interface OrderStore {
  create(input: NewOrderInput): Promise<Order>;
  get(id: string): Promise<Order | null>;
  list(): Promise<Order[]>;
  update(id: string, patch: Partial<Order>): Promise<Order | null>;
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
};

export const orderStore = memoryStore;

export function setEta(order: Order, minutes: number): Partial<Order> {
  const etaAt = new Date(Date.now() + minutes * 60_000).toISOString();
  const nextStatus: OrderStatus = "in_progress";
  return { etaMinutes: minutes, etaAt, status: nextStatus };
}
