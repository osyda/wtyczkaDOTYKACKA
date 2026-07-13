import { NextResponse } from "next/server";
import { orderStore } from "@/lib/orders/store";
import { issueOrderInPos } from "@/lib/dotykacka/pos";

export const dynamic = "force-dynamic";

/**
 * POST /api/orders/[id]/driver { driver, by }
 * Przypisanie kierowcy do dostawy (bez zmiany statusu — kuchnia dalej gotuje).
 * Zamówienie znika z ekranu kelnerki i pojawia się w panelu kierowcy.
 * Przy włączonym bezpieczniku + DOTYKACKA_ISSUE_ON_DRIVER=true dodatkowo
 * wystawia (drukuje) rachunek w POS — do przetestowania przy go-live.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let driver: string | undefined;
  let by: string | undefined;
  try {
    const body = (await req.json()) as { driver?: string; by?: string };
    driver = body.driver?.trim() || undefined;
    by = body.by?.trim() || undefined;
  } catch {
    /* ignore */
  }
  if (!driver) return NextResponse.json({ error: "Podaj kierowcę." }, { status: 400 });

  const patch: Record<string, unknown> = { driver };
  if (by) patch.staff = by;
  const updated = await orderStore.update(id, patch);
  if (!updated) return NextResponse.json({ error: "Nie znaleziono." }, { status: 404 });

  // Druk w POS przy wydaniu kierowcy (za podwójnym bezpiecznikiem).
  const issue = await issueOrderInPos(updated);
  if (!issue.ok && issue.error) {
    const withErr = await orderStore.update(id, { pos: { ...updated.pos, error: issue.error } });
    return NextResponse.json({ order: withErr ?? updated, posIssueError: issue.error });
  }

  return NextResponse.json({ order: updated });
}
