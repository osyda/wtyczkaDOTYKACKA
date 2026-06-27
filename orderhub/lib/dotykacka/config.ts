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
};

/** Czy mamy komplet danych do realnego wywołania API. Jeśli nie — używamy mocka. */
export function hasCredentials(): boolean {
  return Boolean(dotykackaConfig.refreshToken && dotykackaConfig.cloudId);
}

export type DataSource = "live" | "mock";

export function activeDataSource(): DataSource {
  return hasCredentials() ? "live" : "mock";
}
