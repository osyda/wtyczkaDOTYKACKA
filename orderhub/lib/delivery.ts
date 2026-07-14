/**
 * Reguła dostawy Mammarosa (automatyczne wyliczanie):
 * - Kościerzyna: 5 zł (stała, płaska),
 * - poza Kościerzyną: 2 zł za każdy km, do 15 km od Kościerzyny,
 * - powyżej 15 km: poza zasięgiem dostawy,
 * - minimalna wartość zamówienia (bez opłaty za dostawę):
 *   Kościerzyna → 25 zł (zmiana 14.07.2026), poza miastem do 6 km → 40 zł,
 *   powyżej 6 km → 60 zł. Odbiór: bez minimum.
 *
 * Odległość liczona automatycznie z adresu (geokodowanie + trasa) — patrz lib/geo.ts.
 */

export type FulfillmentMode = "delivery" | "pickup";

export const DELIVERY = {
  cityFlat: 5, // zł — Kościerzyna
  perKm: 2, // zł/km — poza Kościerzyną
  maxKm: 15, // km — granica zasięgu
  minCity: 25, // zł — minimalna wartość zamówienia w Kościerzynie
  minNear: 40, // zł — minimalna wartość zamówienia do 6 km (poza miastem)
  minFar: 60, // zł — minimalna wartość zamówienia powyżej 6 km
  minFarFromKm: 6, // km — granica między progami minimum
  currency: "zł",
};

export interface DeliveryQuote {
  available: boolean; // czy dowozimy pod ten adres
  fee: number; // zł
  km?: number; // policzona odległość (poza miastem)
  inCity: boolean;
  outOfRange?: boolean; // > maxKm
  estimated?: boolean; // true gdy fallback bez geokodera (do potwierdzenia)
  minOrder?: number; // zł — minimalna wartość zamówienia (bez opłaty za dostawę)
  label: string;
}

/** Minimalna wartość zamówienia dla danej odległości. */
export function minOrderForKm(km: number): number {
  return km > DELIVERY.minFarFromKm ? DELIVERY.minFar : DELIVERY.minNear;
}

/**
 * Minimalna wartość zamówienia odtworzona z opłaty za dostawę (2 zł/km ⇒ km = fee/2).
 * Do walidacji po stronie serwera, gdy znamy tylko naliczoną opłatę.
 * Opłata ≤ stawki miejskiej (5 zł) = Kościerzyna → próg miejski.
 */
export function minOrderForFee(fee: number): number {
  if (fee <= DELIVERY.cityFlat) return DELIVERY.minCity;
  return fee > DELIVERY.perKm * DELIVERY.minFarFromKm ? DELIVERY.minFar : DELIVERY.minNear;
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
    minOrder: DELIVERY.minCity,
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
    minOrder: minOrderForKm(rounded),
    label: `Dostawa — ${rounded} km × ${DELIVERY.perKm} zł${estimated ? " (szacowane)" : ""}`,
  };
}
