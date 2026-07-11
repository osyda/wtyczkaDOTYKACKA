/**
 * Automatyczne liczenie odległości dostawy.
 *
 * Provider: OpenRouteService (darmowy plan, klucz w ENV `ORS_API_KEY`).
 * Origin (restauracja) konfigurowalny: RESTAURANT_LAT / RESTAURANT_LNG (domyślnie centrum Kościerzyny).
 *
 * Zwraca odległość DROGOWĄ w km lub null, gdy nie da się policzyć
 * (brak klucza / błąd / brak sieci) — wtedy checkout używa fallbacku.
 *
 * ⚠️ DO ZROBIENIA z właścicielem: dodać `ORS_API_KEY` (darmowy z openrouteservice.org)
 *    oraz potwierdzić dokładne współrzędne lokalu (RESTAURANT_LAT/LNG).
 */

const ORS_KEY = process.env.ORS_API_KEY?.trim() || "";
const ORIGIN = {
  lat: Number(process.env.RESTAURANT_LAT) || 54.1226, // Kościerzyna (centrum) – domyślnie
  lng: Number(process.env.RESTAURANT_LNG) || 17.9766,
};

// Promień „terenu Kościerzyny" (stawka płaska) i współczynnik krętości dróg dla szacunku bez klucza.
export const CITY_RADIUS_KM = Number(process.env.DELIVERY_CITY_RADIUS_KM) || 3;
const ROAD_FACTOR = 1.3;

export function hasGeocoder(): boolean {
  return ORS_KEY.length > 0;
}

interface LatLng {
  lat: number;
  lng: number;
}

async function geocode(address: string): Promise<LatLng | null> {
  const url = new URL("https://api.openrouteservice.org/geocode/search");
  url.searchParams.set("api_key", ORS_KEY);
  url.searchParams.set("text", address);
  url.searchParams.set("boundary.country", "PL");
  // Kotwica na lokal: preferuj wyniki wokół Kościerzyny i ogranicz do 40 km,
  // żeby „Stężyca" znaczyła tę kaszubską, a nie inną w Polsce.
  url.searchParams.set("focus.point.lat", String(ORIGIN.lat));
  url.searchParams.set("focus.point.lon", String(ORIGIN.lng));
  url.searchParams.set("boundary.circle.lat", String(ORIGIN.lat));
  url.searchParams.set("boundary.circle.lon", String(ORIGIN.lng));
  url.searchParams.set("boundary.circle.radius", "40");
  url.searchParams.set("size", "1");

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    features?: { geometry?: { coordinates?: [number, number] } }[];
  };
  const coords = data.features?.[0]?.geometry?.coordinates;
  if (!coords) return null;
  return { lng: coords[0], lat: coords[1] };
}

async function drivingKm(dest: LatLng): Promise<number | null> {
  const res = await fetch("https://api.openrouteservice.org/v2/directions/driving-car", {
    method: "POST",
    headers: {
      Authorization: ORS_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      coordinates: [
        [ORIGIN.lng, ORIGIN.lat],
        [dest.lng, dest.lat],
      ],
    }),
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    routes?: { summary?: { distance?: number } }[];
  };
  const meters = data.routes?.[0]?.summary?.distance;
  if (typeof meters !== "number") return null;
  return meters / 1000;
}

/** Odległość drogowa restauracja → adres (km) lub null. */
export async function estimateDrivingKm(address: string): Promise<number | null> {
  if (!ORS_KEY) return null;
  try {
    const dest = await geocode(address);
    if (!dest) return null;
    return await drivingKm(dest);
  } catch {
    return null;
  }
}

export interface ReverseAddress {
  street?: string;
  city?: string;
  zip?: string;
}

/**
 * Reverse geocoding: współrzędne → adres (ulica/miasto/kod).
 * Wymaga klucza ORS. Bez klucza zwraca null (klient wpisuje adres ręcznie).
 */
export async function reverseGeocode(lat: number, lng: number): Promise<ReverseAddress | null> {
  if (!ORS_KEY) return null;
  try {
    const url = new URL("https://api.openrouteservice.org/geocode/reverse");
    url.searchParams.set("api_key", ORS_KEY);
    url.searchParams.set("point.lat", String(lat));
    url.searchParams.set("point.lon", String(lng));
    url.searchParams.set("size", "1");
    url.searchParams.set("boundary.country", "PL");

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      features?: { properties?: Record<string, string> }[];
    };
    const p = data.features?.[0]?.properties;
    if (!p) return null;

    const houseStreet = [p.street, p.housenumber].filter(Boolean).join(" ").trim();
    return {
      street: houseStreet || p.name || undefined,
      city: p.locality || p.localadmin || p.county || undefined,
      zip: p.postalcode || undefined,
    };
  } catch {
    return null;
  }
}

/** Odległość w linii prostej (km) — wzór haversine, bez żadnego API. */
export function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

/**
 * Odległość od restauracji do współrzędnych klienta (z GPS).
 * - z kluczem ORS → realna trasa drogowa (accurate=true),
 * - bez klucza → szacunek z linii prostej × współczynnik dróg (accurate=false).
 */
export async function distanceFromRestaurant(
  lat: number,
  lng: number
): Promise<{ km: number; accurate: boolean }> {
  if (ORS_KEY) {
    try {
      const km = await drivingKm({ lat, lng });
      if (km !== null) return { km: Math.round(km * 10) / 10, accurate: true };
    } catch {
      /* spadamy do szacunku */
    }
  }
  const straight = haversineKm(ORIGIN.lat, ORIGIN.lng, lat, lng);
  return { km: Math.round(straight * ROAD_FACTOR * 10) / 10, accurate: false };
}
