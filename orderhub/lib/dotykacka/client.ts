/**
 * Cienki klient HTTP do Dotykačka API v2.
 * - dokleja Bearer access token,
 * - odświeża token i ponawia raz przy 401 / INVALID_ACCESS_TOKEN,
 * - udostępnia helper paginacji (limit=100, pętla po nextPage).
 */

import { dotykackaConfig } from "./config";
import { getAccessToken } from "./auth";
import type { DotyPage } from "./types";

interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | undefined>;
  body?: unknown;
  headers?: Record<string, string>;
}

export interface ApiResult<T> {
  status: number;
  ok: boolean;
  data: T | null;
  raw: string;
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const base = dotykackaConfig.baseUrl.replace(/\/$/, "");
  const url = new URL(`${base}${path.startsWith("/") ? path : `/${path}`}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

export async function dotyRequest<T = unknown>(
  path: string,
  opts: RequestOptions = {}
): Promise<ApiResult<T>> {
  const url = buildUrl(path, opts.query);

  const doFetch = async (token: string) => {
    return fetch(url, {
      method: opts.method ?? "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=utf-8",
        Accept: "application/json",
        ...opts.headers,
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      cache: "no-store",
    });
  };

  let token = await getAccessToken();
  let res = await doFetch(token);

  // Token mógł wygasnąć — odśwież i spróbuj raz jeszcze.
  if (res.status === 401 || res.status === 403) {
    token = await getAccessToken(true);
    res = await doFetch(token);
  }

  const raw = await res.text();
  let data: T | null = null;
  try {
    data = raw ? (JSON.parse(raw) as T) : null;
  } catch {
    data = null;
  }

  return { status: res.status, ok: res.ok, data, raw };
}

/** Pobiera wszystkie strony danej listy (limit=100, pętla po nextPage). */
export async function dotyGetAll<T = unknown>(
  path: string,
  query?: RequestOptions["query"]
): Promise<T[]> {
  const out: T[] = [];
  let page = 1;
  // Zabezpieczenie przed nieskończoną pętlą.
  for (let guard = 0; guard < 200; guard++) {
    const res = await dotyRequest<DotyPage<T>>(path, {
      query: { ...query, page, limit: 100 },
    });
    if (res.status === 404) break;
    if (!res.ok || !res.data) {
      throw new Error(`Dotykačka GET ${path} → HTTP ${res.status}: ${res.raw.slice(0, 300)}`);
    }
    const data = res.data.data ?? [];
    out.push(...data);
    const next = res.data.nextPage;
    if (!next) break;
    page = next;
  }
  return out;
}
