import { NextResponse } from "next/server";
import { orderStore } from "@/lib/orders/store";
import type { OrderStatus } from "@/lib/orders/types";

export const dynamic = "force-dynamic";

const ALLOWED: OrderStatus[] = [
  "new",
  "scheduled",
  "in_progress",
  "ready",
  "on_delivery",
  "completed",
  "canceled",
];

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let status: OrderStatus | undefined;
  try {
    status = ((await req.json()) as { status?: OrderStatus }).status;
  } catch {
    /* ignore */
  }
  if (!status || !ALLOWED.includes(status)) {
    return NextResponse.json({ error: "Nieprawidłowy status." }, { status: 400 });
  }
  const updated = await orderStore.update(id, { status });
  if (!updated) return NextResponse.json({ error: "Nie znaleziono." }, { status: 404 });
  return NextResponse.json({ order: updated });
}
