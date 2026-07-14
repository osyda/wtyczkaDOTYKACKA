import { NextResponse } from "next/server";
import { orderStore } from "@/lib/orders/store";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const order = await orderStore.get(id);
  if (!order) return NextResponse.json({ error: "Nie znaleziono." }, { status: 404 });
  return NextResponse.json({ order });
}

/**
 * Trwałe usunięcie zamówienia z historii panelu (chronione hasłem obsługi
 * w proxy). NIE dotyka Dotykački — tamtejszy rachunek zostaje bez zmian.
 */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const ok = await orderStore.remove(id);
  if (!ok) return NextResponse.json({ error: "Nie znaleziono." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
