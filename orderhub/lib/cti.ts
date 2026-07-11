/**
 * CTI — rozpoznanie dzwoniącego (Faza 4, część wykonalna bez sprzętu).
 *
 * Tu robimy lookup klienta po numerze na podstawie historii zamówień w naszym systemie.
 * Docelowo (gdy znamy typ linii) podłączymy realne źródło zdarzeń „połączenie przychodzące":
 * webhook centralki VoIP/SIP albo aplikację-towarzysza na Androidzie (PHONE_STATE).
 * Można też dołożyć lookup po encji Customer w Dotykačce (po telefonie).
 */

import { orderStore } from "@/lib/orders/store";

export interface CallerInfo {
  phone: string;
  known: boolean;
  name?: string;
  orderCount: number;
  lastOrderAt?: string;
  lastItems?: string[];
  recentOrderIds: string[];
  /** Adres z ostatniego zamówienia — do wypełnienia formularza telefonicznego. */
  street?: string;
  city?: string;
  zip?: string;
}

function normalize(phone: string): string {
  return phone.replace(/\D/g, "").replace(/^48/, "");
}

export async function lookupCaller(phoneRaw: string): Promise<CallerInfo> {
  const phone = normalize(phoneRaw);
  const all = await orderStore.list();
  const mine = all.filter((o) => normalize(o.customer.phone) === phone);

  if (mine.length === 0) {
    return { phone: phoneRaw, known: false, orderCount: 0, recentOrderIds: [] };
  }

  const last = mine[0];
  return {
    phone: phoneRaw,
    known: true,
    name: last.customer.name,
    street: last.customer.street,
    city: last.customer.city,
    zip: last.customer.zip,
    orderCount: mine.length,
    lastOrderAt: last.createdAt,
    lastItems: last.items.map((i) => `${i.qty}× ${i.name}`),
    recentOrderIds: mine.slice(0, 5).map((o) => o.id),
  };
}
