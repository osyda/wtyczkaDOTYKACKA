import { NextResponse } from "next/server";
import { audit } from "@/lib/audit";
import { orderStore } from "@/lib/orders/store";
import { issueAndPayInPos, fiscalizeMoment } from "@/lib/dotykacka/pos";
import type { OrderStatus } from "@/lib/orders/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const STATUS_PL: Record<OrderStatus, string> = {
  new: "nowe",
  scheduled: "na godzinę",
  in_progress: "w realizacji",
  ready: "gotowe",
  on_delivery: "w drodze",
  completed: "zrealizowane",
  canceled: "anulowane",
};

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
  let driver: string | undefined;
  try {
    const body = (await req.json()) as { status?: OrderStatus; by?: string; reason?: string; driver?: string };
    status = body.status;
    by = body.by?.trim() || undefined;
    reason = body.reason?.trim() || undefined;
    driver = body.driver?.trim() || undefined;
  } catch {
    /* ignore */
  }
  if (!status || !ALLOWED.includes(status)) {
    return NextResponse.json({ error: "Nieprawidłowy status." }, { status: 400 });
  }
  const patch: Record<string, unknown> = { status };
  if (by) patch.staff = by;
  if (status === "canceled" && reason) patch.cancelReason = reason;
  if (status === "on_delivery" && driver) patch.driver = driver;
  const updated = await orderStore.update(id, patch);
  if (!updated) return NextResponse.json({ error: "Nie znaleziono." }, { status: 404 });
  await audit(`status: ${STATUS_PL[status]}`, {
    order: updated.number,
    details: `${reason ? `powód: ${reason}` : ""}${driver ? ` kierowca: ${driver}` : ""}${by ? ` (przez: ${by})` : ""}`.trim() || undefined,
  });

  // Tryb fiskalizacji "delivered": kierowca klika „Dostarczone" → dopiero teraz
  // wystawiamy i płacimy w POS (paragon fiskalny drukuje się w lokalu).
  if (
    status === "completed" &&
    updated.mode === "delivery" &&
    updated.driver &&
    fiscalizeMoment() === "delivered"
  ) {
    const issue = await issueAndPayInPos(updated);
    if (!issue.ok && issue.error) {
      const withErr = await orderStore.update(id, { pos: { ...updated.pos, error: issue.error } });
      return NextResponse.json({ order: withErr ?? updated, posIssueError: issue.error });
    }
  }

  return NextResponse.json({ order: updated });
}
