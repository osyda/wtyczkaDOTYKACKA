import { NextResponse } from "next/server";
import { listCalls, normalizePhone } from "@/lib/ctiCalls";
import { orderStore } from "@/lib/orders/store";

export const dynamic = "force-dynamic";

/** GET /api/cti/calls — dziennik połączeń z dopiętymi nazwiskami stałych klientów. */
export async function GET() {
  const [calls, orders] = await Promise.all([listCalls(30), orderStore.list()]);

  const names = new Map<string, string>();
  for (const o of orders) {
    const key = normalizePhone(o.customer.phone);
    if (key && !names.has(key)) names.set(key, o.customer.name);
  }

  return NextResponse.json({
    calls: calls.map((c) => ({ ...c, name: names.get(normalizePhone(c.phone)) ?? null })),
  });
}
