/**
 * Reguła dostawy Mamma Rosa (automatyczne wyliczanie):
 * - Kościerzyna: 5 zł (stała, płaska),
 * - poza Kościerzyną: 2 zł za każdy km, do 15 km od Kościerzyny,
 * - powyżej 15 km: poza zasięgiem dostawy.
 *
 * Odległość liczona automatycznie z adresu (geokodowanie + trasa) — patrz lib/geo.ts.
 */

export type FulfillmentMode = "delivery" | "pickup";

export const DELIVERY = {
  cityFlat: 5, // zł — Kościerzyna
  perKm: 2, // zł/km — poza Kościerzyną
  maxKm: 15, // km — granica zasięgu
  currency: "zł",
};

export interface DeliveryQuote {
  available: boolean; // czy dowozimy pod ten adres
  fee: number; // zł
  km?: number; // policzona odległość (poza miastem)
  inCity: boolean;
  outOfRange?: boolean; // > maxKm
  estimated?: boolean; // true gdy fallback bez geokodera (do potwierdzenia)
  label: string;
}

/** Czy adres jest w Kościerzynie (po nazwie miasta). */
export function isKoscierzyna(city?: string): boolean {
  const c = (city ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // usuń znaki diakrytyczne (ś→s, ó→o, ...)
    .replace(/ł/g, "l");
  return c.includes("koscierzyna");
}

export function flatCityQuote(): DeliveryQuote {
  return {
    available: true,
    fee: DELIVERY.cityFlat,
    inCity: true,
    label: `Dostawa — Kościerzyna (${DELIVERY.cityFlat} zł)`,
  };
}

export function pickupQuote(): DeliveryQuote {
  return { available: true, fee: 0, inCity: false, label: "Odbiór osobisty — bez opłaty" };
}

export function kmQuote(km: number, estimated = false): DeliveryQuote {
  const rounded = Math.round(km * 10) / 10;
  if (rounded > DELIVERY.maxKm) {
    return {
      available: false,
      fee: 0,
      km: rounded,
      inCity: false,
      outOfRange: true,
      estimated,
      label: `Poza zasięgiem dostawy (${rounded} km > ${DELIVERY.maxKm} km)`,
    };
  }
  const fee = Math.round(DELIVERY.perKm * rounded * 100) / 100;
  return {
    available: true,
    fee,
    km: rounded,
    inCity: false,
    estimated,
    label: `Dostawa — ${rounded} km × ${DELIVERY.perKm} zł${estimated ? " (szacowane)" : ""}`,
  };
}
