/**
 * Konfiguracja połączenia z Dotykačka API v2.
 * Wszystkie sekrety pochodzą ze zmiennych środowiskowych (NIGDY z repo / z klienta).
 * W środowisku bez kluczy aplikacja działa w trybie MOCK (przykładowe menu).
 */

export const dotykackaConfig = {
  baseUrl: process.env.DOTYKACKA_BASE_URL?.trim() || "https://api.dotykacka.cz/v2",
  clientId: process.env.DOTYKACKA_CLIENT_ID?.trim() || "",
  clientSecret: process.env.DOTYKACKA_CLIENT_SECRET?.trim() || "",
  refreshToken: process.env.DOTYKACKA_REFRESH_TOKEN?.trim() || "",
  cloudId: process.env.DOTYKACKA_CLOUD_ID?.trim() || "",
  branchId: process.env.DOTYKACKA_BRANCH_ID?.trim() || "",
  // Produkty POS reprezentujące koszt dostawy (żeby suma w POS zgadzała się z Woo/sklepem).
  deliveryCityProductId: process.env.DOTYKACKA_DELIVERY_CITY_PRODUCT_ID?.trim() || "",
  deliveryKmProductId: process.env.DOTYKACKA_DELIVERY_KM_PRODUCT_ID?.trim() || "",
};

/** Czy mamy komplet danych do realnego wywołania API. Jeśli nie — używamy mocka. */
export function hasCredentials(): boolean {
  return Boolean(dotykackaConfig.refreshToken && dotykackaConfig.cloudId);
}

/**
 * Bezpiecznik na czas testów: wysyłka rachunków do POS jest WŁĄCZONA dopiero,
 * gdy zmienna `DOTYKACKA_SEND_ORDERS` ma wartość `true`.
 * Dzięki temu można podpiąć klucze (prawdziwe menu, klienci) i testować
 * pełny przepływ bez pojawiania się zamówień na kasie na sali.
 */
export function posSendEnabled(): boolean {
  return process.env.DOTYKACKA_SEND_ORDERS?.trim().toLowerCase() === "true";
}

export type DataSource = "live" | "mock";

export function activeDataSource(): DataSource {
  return hasCredentials() ? "live" : "mock";
}
