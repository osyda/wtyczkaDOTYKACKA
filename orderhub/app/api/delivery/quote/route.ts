import { NextResponse } from "next/server";
import {
  flatCityQuote,
  isKoscierzyna,
  kmQuote,
  pickupQuote,
  type DeliveryQuote,
} from "@/lib/delivery";
import { estimateDrivingKm, hasGeocoder } from "@/lib/geo";

export const dynamic = "force-dynamic";

/**
 * POST /api/delivery/quote
 * body: { mode, street, city, zip, manualKm? }
 * Zwraca automatycznie policzoną opłatę za dostawę.
 */
export async function POST(req: Request) {
  let body: {
    mode?: "delivery" | "pickup";
    street?: string;
    city?: string;
    zip?: string;
    manualKm?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Nieprawidłowe dane." }, { status: 400 });
  }

  if (body.mode === "pickup") {
    return NextResponse.json(pickupQuote());
  }

  // Kościerzyna → płaska stawka, bez liczenia odległości.
  if (isKoscierzyna(body.city)) {
    return NextResponse.json(flatCityQuote());
  }

  // Poza miastem → automatyczne liczenie odległości drogowej.
  const address = [body.street, body.zip, body.city, "Polska"].filter(Boolean).join(", ");
  const km = await estimateDrivingKm(address);

  if (km !== null) {
    return NextResponse.json(kmQuote(km));
  }

  // Fallback: brak geokodera (np. tryb DEMO bez klucza ORS).
  if (typeof body.manualKm === "number" && body.manualKm > 0) {
    return NextResponse.json(kmQuote(body.manualKm, true));
  }

  const resp: DeliveryQuote & { needsManual: boolean; geocoder: boolean } = {
    available: true,
    fee: 0,
    inCity: false,
    estimated: true,
    label: "Podaj odległość (km) — automatyczne liczenie wymaga klucza map",
    needsManual: true,
    geocoder: hasGeocoder(),
  };
  return NextResponse.json(resp);
}
