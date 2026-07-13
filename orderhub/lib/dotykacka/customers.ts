/**
 * Obsługa encji Customer w Dotykačce (Faza 2).
 * Cel: zamiast wrzucać klienta do notatki — znaleźć go po telefonie lub utworzyć,
 * a potem podpiąć przez customer-id do rachunku.
 *
 * Wg wzoru z docs/dotypos_api_brain.md §9.8 tworzenie wymaga m.in. _cloudId,
 * display/deleted/points/flags. POST przyjmuje TABLICĘ encji (konwencja list
 * w API v2) — wysyłamy [obiekt], a przy odmowie ponawiamy pojedynczym obiektem.
 * Błędy logujemy do konsoli (widoczne w logach Vercela), nie blokują zamówienia.
 */

import { dotykackaConfig } from "./config";
import { dotyRequest } from "./client";
import type { OrderCustomer } from "@/lib/orders/types";

interface DotyCustomer {
  id: number | string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

function splitName(full: string): { firstName: string; lastName: string } {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts.slice(0, -1).join(" "), lastName: parts.at(-1) ?? "" };
}

/** Znajdź klienta po telefonie albo utwórz nowego. Zwraca customerId lub null. */
export async function upsertCustomerByPhone(customer: OrderCustomer): Promise<string | null> {
  const { cloudId } = dotykackaConfig;
  const phone = customer.phone.replace(/\s+/g, "");
  if (!phone) return null;

  // 1) Szukaj po telefonie (składnia filtra: attribute|operation|value).
  const search = await dotyRequest<{ data?: DotyCustomer[] }>(`/clouds/${cloudId}/customers`, {
    query: { filter: `phone|eq|${phone}`, limit: 1 },
  });
  const found = search.data?.data?.[0];
  if (found) return String(found.id);
  if (!search.ok) {
    console.error(`[dotykacka] szukanie klienta ${phone}: HTTP ${search.status}: ${search.raw.slice(0, 200)}`);
  }

  // 2) Brak — utwórz (pełny zestaw pól wg wzoru z dokumentacji).
  const { firstName, lastName } = splitName(customer.name);
  const entity = {
    _cloudId: Number(cloudId) || cloudId,
    firstName: firstName || "Klient",
    lastName,
    companyName: "",
    email: customer.email ?? "",
    phone,
    addressLine1: customer.street ?? "",
    addressLine2: "",
    city: customer.city ?? "",
    zip: customer.zip ?? "",
    country: "PL",
    display: true,
    deleted: false,
    points: 0,
    flags: 0,
    tags: ["WWW"],
    note: "Klient z zamówień online (Mammarosa OrderHub)",
  };

  type CreateResp = DotyCustomer | DotyCustomer[] | { data?: DotyCustomer[] };
  const pickId = (data: CreateResp | null): string | null => {
    if (!data) return null;
    if (Array.isArray(data)) return data[0]?.id !== undefined ? String(data[0].id) : null;
    if ("id" in data && data.id !== undefined) return String(data.id);
    if ("data" in data && Array.isArray(data.data) && data.data[0]?.id !== undefined) return String(data.data[0].id);
    return null;
  };

  // Najpierw tablica (konwencja API v2), potem pojedynczy obiekt.
  const asArray = await dotyRequest<CreateResp>(`/clouds/${cloudId}/customers`, {
    method: "POST",
    body: [entity],
  });
  let id = asArray.ok ? pickId(asArray.data) : null;
  if (!id) {
    if (!asArray.ok) {
      console.error(`[dotykacka] tworzenie klienta (tablica): HTTP ${asArray.status}: ${asArray.raw.slice(0, 300)}`);
    }
    const asObject = await dotyRequest<CreateResp>(`/clouds/${cloudId}/customers`, {
      method: "POST",
      body: entity,
    });
    id = asObject.ok ? pickId(asObject.data) : null;
    if (!id && !asObject.ok) {
      console.error(`[dotykacka] tworzenie klienta (obiekt): HTTP ${asObject.status}: ${asObject.raw.slice(0, 300)}`);
    }
  }
  return id;
}
