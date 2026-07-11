import { NextResponse } from "next/server";
import {
  flatCityQuote,
  isKoscierzyna,
  kmQuote,
  pickupQuote,
  type DeliveryQuote,
} from "@/lib/delivery";
import { estimateDrivingKm, distanceFromRestaurant, hasGeocoder, CITY_RADIUS_KM } from "@/lib/geo";
import { getPlaceKm, setPlaceKm } from "@/lib/placeKm";

export const dynamic = "force-dynamic";

/**
 * POST /api/delivery/quote
 * body: { mode, lat?, lng?, street?, city?, zip?, manualKm? }
 * Zwraca automatycznie policzoną opłatę za dostawę.
 * Priorytet: lokalizacja GPS (lat/lng) → adres → fallback ręczny.
 */
export async function POST(req: Request) {
  let body: {
    mode?: "delivery" | "pickup";
    lat?: number;
    lng?: number;
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

  // 1) Lokalizacja klienta z GPS — najdokładniejsze, działa też bez klucza (szacunek).
  if (typeof body.lat === "number" && typeof body.lng === "number") {
    const { km, accurate } = await distanceFromRestaurant(body.lat, body.lng);
    if (km <= CITY_RADIUS_KM) {
      return NextResponse.json(flatCityQuote()); // w obrębie Kościerzyny
    }
    return NextResponse.json(kmQuote(km, !accurate));
  }

  // 2) Adres w Kościerzynie → płaska stawka.
  if (isKoscierzyna(body.city)) {
    return NextResponse.json(flatCityQuote());
  }

  // Poza miastem → automatyczne liczenie odległości drogowej (geokoder z kotwicą na lokal).
  const address = [body.street, body.zip, body.city, "Polska"].filter(Boolean).join(", ");
  const km = await estimateDrivingKm(address);

  if (km !== null) {
    // Zapamiętaj miejscowość — będzie działać nawet przy chwilowej awarii map.
    void setPlaceKm(body.city, km);
    return NextResponse.json(kmQuote(km));
  }

  // Ręcznie podana odległość → użyj i ZAPAMIĘTAJ dla tej miejscowości.
  if (typeof body.manualKm === "number" && body.manualKm > 0) {
    await setPlaceKm(body.city, body.manualKm);
    return NextResponse.json(kmQuote(body.manualKm, true));
  }

  // Samoucząca się tabela: miejscowość podawana wcześniej liczy się sama.
  const savedKm = await getPlaceKm(body.city);
  if (savedKm !== null) {
    const q = kmQuote(savedKm, true);
    return NextResponse.json({ ...q, remembered: true, label: `${q.label} — zapamiętana odległość` });
  }

  const resp: DeliveryQuote & { needsManual: boolean; geocoder: boolean } = {
    available: true,
    fee: 0,
    inCity: false,
    estimated: true,
    label: "Nowa miejscowość — podaj odległość w km (zapamiętamy ją)",
    needsManual: true,
    geocoder: hasGeocoder(),
  };
  return NextResponse.json(resp);
}
