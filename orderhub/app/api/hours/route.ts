import { NextResponse } from "next/server";
import { getOpenState } from "@/lib/hours";

export const dynamic = "force-dynamic";

/** GET /api/hours — czy lokal przyjmuje teraz zamówienia + godziny tygodnia. */
export async function GET() {
  const state = await getOpenState();
  return NextResponse.json(state);
}
