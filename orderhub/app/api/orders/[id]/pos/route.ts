import { NextResponse } from "next/server";
import { orderStore } from "@/lib/orders/store";
import { sendOrderToPos } from "@/lib/dotykacka/pos";

export const dynamic = "force-dynamic";

/**
 * POST /api/orders/[id]/pos — PONOWNA wysyłka zamówienia do Dotykački.
 * Na wypadek chwilowego braku internetu / błędu API: zamówienie zostaje u nas
 * (Redis), a obsługa klika w panelu „Wyślij ponownie do POS".
 * Bezpieczne przy powtórkach: order/create idzie z Idempotency-Key =
 * external-id zamówienia, więc duplikat w POS nie powstanie.
 */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const order = await orderStore.get(id);
  if (!order) return NextResponse.json({ error: "Nie znaleziono." }, { status: 404 });

  if (order.pos?.sent && !order.pos.error) {
    return NextResponse.json({ order, info: "Zamówienie już jest w POS." });
  }

  const pos = await sendOrderToPos(order);
  const updated = await orderStore.update(id, { pos: { ...pos, deferred: false } });
  return NextResponse.json({ order: updated ?? order, ok: pos.sent && !pos.error });
}
