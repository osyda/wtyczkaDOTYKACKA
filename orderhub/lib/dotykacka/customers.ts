/**
 * Obsługa encji Customer w Dotykačce (Faza 2).
 * Cel: zamiast wrzucać klienta do notatki — znaleźć go po telefonie lub utworzyć,
 * a potem podpiąć przez customer-id do rachunku.
 *
 * ⚠️ Dokładne nazwy pól (addressLine1 itd.) i składnia filtra są wg docs/dotypos_api_brain.md
 * i wymagają potwierdzenia na żywym API (oznaczone TODO).
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

  // 1) Szukaj po telefonie. TODO: potwierdzić składnię filtra (phone|eq|... vs phone,eq,...).
  const search = await dotyRequest<{ data?: DotyCustomer[] }>(
    `/clouds/${cloudId}/customers`,
    { query: { filter: `phone|eq|${phone}`, limit: 1 } }
  );
  const found = search.data?.data?.[0];
  if (found) return String(found.id);

  // 2) Brak — utwórz. TODO: potwierdzić dokładne nazwy pól adresowych.
  const { firstName, lastName } = splitName(customer.name);
  const create = await dotyRequest<DotyCustomer>(`/clouds/${cloudId}/customers`, {
    method: "POST",
    body: {
      firstName: firstName || "Klient",
      lastName,
      phone,
      addressLine1: customer.street ?? "",
      city: customer.city ?? "",
      zip: customer.zip ?? "",
      flags: 0,
      tags: ["WWW"],
    },
  });
  if (create.ok && create.data?.id) return String(create.data.id);
  return null;
}
