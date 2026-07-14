/**
 * Trwały magazyn zamówień na Redis (Vercel KV / Upstash).
 * Aktywny, gdy ustawione są zmienne KV_REST_API_URL + KV_REST_API_TOKEN
 * (albo UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN).
 * Dzięki temu zamówienia przeżywają restarty i działają na wielu instancjach serverless.
 */

import { Redis } from "@upstash/redis";
import type { NewOrderInput, Order } from "./types";
import type { OrderStore } from "./store";

const URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

export function hasKv(): boolean {
  return Boolean(URL && TOKEN);
}

const KEY = (id: string) => `order:${id}`;
const IDS = "orders:ids";
const SEQ = "orders:seq";

let client: Redis | null = null;
function redis(): Redis {
  if (!client) client = new Redis({ url: URL!, token: TOKEN! });
  return client;
}

export function makeKvStore(): OrderStore {
  return {
    async create(input: NewOrderInput): Promise<Order> {
      const r = redis();
      await r.setnx(SEQ, 1042);
      const number = await r.incr(SEQ);
      const id = `o_${number}`;
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
      await r.set(KEY(id), order);
      await r.sadd(IDS, id);
      return order;
    },

    async get(id: string): Promise<Order | null> {
      return (await redis().get<Order>(KEY(id))) ?? null;
    },

    async list(): Promise<Order[]> {
      const r = redis();
      const ids = await r.smembers(IDS);
      if (!ids.length) return [];
      const orders = await r.mget<Order[]>(...ids.map((i) => KEY(i)));
      return (orders.filter(Boolean) as Order[]).sort((a, b) => b.number - a.number);
    },

    async update(id: string, patch: Partial<Order>): Promise<Order | null> {
      const r = redis();
      const cur = await r.get<Order>(KEY(id));
      if (!cur) return null;
      const next = { ...cur, ...patch, pos: { ...cur.pos, ...(patch.pos ?? {}) } };
      await r.set(KEY(id), next);
      return next;
    },

    async remove(id: string): Promise<boolean> {
      const r = redis();
      const deleted = await r.del(KEY(id));
      await r.srem(IDS, id);
      return deleted > 0;
    },
  };
}
