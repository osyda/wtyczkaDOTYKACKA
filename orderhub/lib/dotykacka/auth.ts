/**
 * Autoryzacja Dotykačka API v2 — wymiana refresh tokenu na krótkotrwały access token.
 *
 * Flow (Connector v2 wykonujesz raz, w panelu — tu zakładamy, że refreshToken już jest):
 *   POST {base}/signin/token
 *   Authorization: User {REFRESH_TOKEN}
 *   body: { "_cloudId": <cloudId> }
 *   -> { "accessToken": "..." }  (ważny ~1h)
 */

import { dotykackaConfig } from "./config";

interface CachedToken {
  token: string;
  expiresAt: number; // epoch ms
}

// Cache w pamięci procesu. Na Vercelu działa per-instancja; odświeżamy defensywnie na 401.
let cache: CachedToken | null = null;

const TTL_MS = 55 * 60 * 1000; // ~55 min, z zapasem względem 1h

export async function getAccessToken(forceRefresh = false): Promise<string> {
  const now = Date.now();
  if (!forceRefresh && cache && cache.expiresAt > now) {
    return cache.token;
  }

  const { baseUrl, refreshToken, cloudId } = dotykackaConfig;
  if (!refreshToken || !cloudId) {
    throw new Error("Brak DOTYKACKA_REFRESH_TOKEN lub DOTYKACKA_CLOUD_ID.");
  }

  const res = await fetch(`${baseUrl}/signin/token`, {
    method: "POST",
    headers: {
      Authorization: `User ${refreshToken}`,
      "Content-Type": "application/json; charset=utf-8",
      Accept: "application/json",
    },
    body: JSON.stringify({ _cloudId: Number(cloudId) || cloudId }),
    cache: "no-store",
  });

  const body = (await res.json().catch(() => null)) as { accessToken?: string } | null;

  if (!res.ok || !body?.accessToken) {
    throw new Error(
      `Nie udało się pobrać access tokenu (HTTP ${res.status}). ${JSON.stringify(body)}`
    );
  }

  cache = { token: body.accessToken, expiresAt: now + TTL_MS };
  return body.accessToken;
}

export function clearTokenCache(): void {
  cache = null;
}
