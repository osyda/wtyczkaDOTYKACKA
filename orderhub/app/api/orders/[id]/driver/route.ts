import { NextResponse } from "next/server";
import { orderStore } from "@/lib/orders/store";
import { issueAndPayInPos, sendOrderToPos, fiscalizeMoment } from "@/lib/dotykacka/pos";

export const dynamic = "force-dynamic";

/**
 * POST /api/orders/[id]/driver { driver, by }
 * Przypisanie kierowcy do dostawy (bez zmiany statusu — kuchnia dalej gotuje).
 * Zamówienie znika z ekranu kelnerki i pojawia się w panelu kierowcy.
 * DOPIERO teraz dostawa trafia do POS (na konto kierowcy) — rachunek zamyka
 * obsługa ręcznie w POS (DOTYKACKA_FISCALIZE_ON domyślnie "manual").
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
  let updated = await orderStore.update(id, patch);
  if (!updated) return NextResponse.json({ error: "Nie znaleziono." }, { status: 404 });

  // Wysyłka odroczona do kierowcy: zamówienie powstaje w POS DOPIERO teraz,
  // od razu z user-id kierowcy → rachunek liczy się na jego konto.
  if (updated.pos?.deferred && !updated.pos.posOrderId) {
    const pos = await sendOrderToPos(updated);
    updated = (await orderStore.update(id, { pos: { ...pos, deferred: false } })) ?? updated;
  }

  // Wystawienie+zapłata przez API tylko w trybie "driver" (nieużywany domyślnie —
  // rachunki zamyka obsługa ręcznie w POS; tryb zostaje na wypadek, gdyby
  // Dotykačka odpowiedziała, jak wystawiać niefiskalnie przez API).
  if (fiscalizeMoment() === "driver") {
    const issue = await issueAndPayInPos(updated);
    if (!issue.ok && issue.error) {
      const withErr = await orderStore.update(id, { pos: { ...updated.pos, error: issue.error } });
      return NextResponse.json({ order: withErr ?? updated, posIssueError: issue.error });
    }
  }

  return NextResponse.json({ order: updated });
}
