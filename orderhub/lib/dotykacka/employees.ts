/**
 * Pracownicy z Dotykački — do logowania w panelu obsługi ich kodami z POS.
 *
 * Encja Employee w API v2 może udostępniać kod logowania pod różnymi polami
 * (zależnie od wersji chmury), więc sprawdzamy kilka kandydatów.
 * Jeśli API nie zwraca kodów — logowanie kodem POS po prostu nie zadziała
 * i pozostaje wspólny STAFF_PIN (bez błędów po drodze).
 */

import { dotykackaConfig, hasCredentials } from "./config";
import { dotyGetAll } from "./client";

type DotyEmployee = Record<string, unknown>;

let cache: { at: number; list: DotyEmployee[] } | null = null;
const CACHE_MS = 5 * 60_000;

async function getEmployees(): Promise<DotyEmployee[]> {
  if (!hasCredentials()) return [];
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.list;
  const list = await dotyGetAll<DotyEmployee>(`/clouds/${dotykackaConfig.cloudId}/employees`);
  cache = { at: Date.now(), list };
  return list;
}

const PIN_FIELDS = ["pin", "loginPin", "posPin", "code", "loginCode", "password"];

function employeeCode(e: DotyEmployee): string | null {
  for (const f of PIN_FIELDS) {
    const v = e[f];
    if (typeof v === "string" && v.trim().length >= 3) return v.trim();
    if (typeof v === "number" && String(v).length >= 3) return String(v);
  }
  return null;
}

export interface StaffEmployee {
  id: string;
  name: string;
}

/**
 * Diagnostyka na /status: czy API zwraca pracowników i czy widać pola z kodami.
 * NIE ujawnia samych kodów — tylko liczby i nazwy pól.
 */
export async function employeesDiagnostics(): Promise<{
  available: boolean;
  count: number;
  withCode: number;
  codeFields: string[];
  error?: string;
}> {
  if (!hasCredentials()) return { available: false, count: 0, withCode: 0, codeFields: [] };
  try {
    const list = await getEmployees();
    const fields = new Set<string>();
    let withCode = 0;
    for (const e of list) {
      const found = PIN_FIELDS.filter((f) => {
        const v = e[f];
        return (typeof v === "string" && v.trim().length >= 3) || (typeof v === "number" && String(v).length >= 3);
      });
      if (found.length > 0) {
        withCode++;
        found.forEach((f) => fields.add(f));
      }
    }
    return { available: true, count: list.length, withCode, codeFields: [...fields] };
  } catch (e) {
    return {
      available: false,
      count: 0,
      withCode: 0,
      codeFields: [],
      error: e instanceof Error ? e.message.slice(0, 160) : "błąd API",
    };
  }
}

/** Znajdź pracownika po jego kodzie z POS. Zwraca null też przy problemach z API. */
export async function findEmployeeByPin(pin: string): Promise<StaffEmployee | null> {
  const wanted = pin.trim();
  if (!wanted) return null;
  try {
    const list = await getEmployees();
    for (const e of list) {
      const code = employeeCode(e);
      if (code && code === wanted) {
        const name =
          (typeof e.name === "string" && e.name) ||
          (typeof e.fullName === "string" && e.fullName) ||
          "pracownik";
        return { id: String(e.id ?? ""), name };
      }
    }
  } catch {
    /* API niedostępne — kod POS nie zadziała, STAFF_PIN nadal tak */
  }
  return null;
}
