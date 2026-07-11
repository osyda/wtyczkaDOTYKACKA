import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/staff/drivers — lista kierowców do przypisywania dostaw w panelu.
 * Źródło: zmienna DRIVERS ("Marek, Paweł, Jurek"). Docelowo (po podpięciu kluczy
 * i sprawdzeniu pól) można dołożyć pracowników z Dotykački oznaczonych jako kierowcy.
 */
export async function GET() {
  const drivers = (process.env.DRIVERS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return NextResponse.json({ drivers });
}
