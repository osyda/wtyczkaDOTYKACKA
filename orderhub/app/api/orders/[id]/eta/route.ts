import { NextResponse } from "next/server";
import { orderStore, setEta } from "@/lib/orders/store";

export const dynamic = "force-dynamic";

/** Kelnerka ustawia czas przygotowania (minuty) dla zamówienia ASAP. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const order = await orderStore.get(id);
  if (!order) return NextResponse.json({ error: "Nie znaleziono." }, { status: 404 });

  let minutes = 0;
  try {
    const body = (await req.json()) as { minutes?: number };
    minutes = Number(body.minutes);
  } catch {
    /* ignore */
  }
  if (!Number.isFinite(minutes) || minutes <= 0) {
    return NextResponse.json({ error: "Nieprawidłowy czas." }, { status: 400 });
  }

  const updated = await orderStore.update(id, setEta(order, minutes));
  return NextResponse.json({ order: updated });
}
