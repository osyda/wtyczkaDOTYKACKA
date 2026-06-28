/**
 * Reguła naliczania dostawy.
 * UWAGA: stawki do potwierdzenia z właścicielem (rozbieżność w starej wtyczce: 5 zł / 2 zł za km).
 * Domyślnie: Kościerzyna = stała opłata, poza Kościerzyną = stawka za km.
 */

export type FulfillmentMode = "delivery" | "pickup";
export type DeliveryZone = "kosc" | "outside";

export const DELIVERY = {
  cityFlat: 4, // zł — Kościerzyna (stała)
  outsidePerKm: 2, // zł/km — poza Kościerzyną
  currency: "zł",
};

export interface DeliveryQuote {
  fee: number;
  label: string;
}

export function quoteDelivery(
  mode: FulfillmentMode,
  zone: DeliveryZone,
  km: number
): DeliveryQuote {
  if (mode === "pickup") {
    return { fee: 0, label: "Odbiór osobisty — bez opłaty" };
  }
  if (zone === "kosc") {
    return { fee: DELIVERY.cityFlat, label: "Dostawa — Kościerzyna" };
  }
  const safeKm = Number.isFinite(km) && km > 0 ? km : 1;
  const fee = Math.round(DELIVERY.outsidePerKm * safeKm * 100) / 100;
  return { fee, label: `Dostawa — poza Kościerzyną (${safeKm} km × ${DELIVERY.outsidePerKm} zł)` };
}
