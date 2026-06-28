import { NextResponse } from "next/server";
import { reverseGeocode } from "@/lib/geo";

export const dynamic = "force-dynamic";

/**
 * POST /api/geo/reverse { lat, lng }
 * Zwraca adres (ulica/miasto/kod) dla współrzędnych — gdy skonfigurowany klucz map.
 * Bez klucza: { available: false }.
 */
export async function POST(req: Request) {
  let body: { lat?: number; lng?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Nieprawidłowe dane." }, { status: 400 });
  }
  if (typeof body.lat !== "number" || typeof body.lng !== "number") {
    return NextResponse.json({ error: "Brak współrzędnych." }, { status: 400 });
  }
  const addr = await reverseGeocode(body.lat, body.lng);
  if (!addr) return NextResponse.json({ available: false });
  return NextResponse.json({ available: true, ...addr });
}
