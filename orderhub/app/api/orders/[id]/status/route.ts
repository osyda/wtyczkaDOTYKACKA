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
  let by: string | undefined;
  let reason: string | undefined;
  try {
    const body = (await req.json()) as { status?: OrderStatus; by?: string; reason?: string };
    status = body.status;
    by = body.by?.trim() || undefined;
    reason = body.reason?.trim() || undefined;
  } catch {
    /* ignore */
  }
  if (!status || !ALLOWED.includes(status)) {
    return NextResponse.json({ error: "Nieprawidłowy status." }, { status: 400 });
  }
  const patch: Record<string, unknown> = { status };
  if (by) patch.staff = by;
  if (status === "canceled" && reason) patch.cancelReason = reason;
  const updated = await orderStore.update(id, patch);
  if (!updated) return NextResponse.json({ error: "Nie znaleziono." }, { status: 404 });
  return NextResponse.json({ order: updated });
}
