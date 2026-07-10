/**
 * Wysyłka zamówienia do POS Dotykačka przez pos-actions (Faza 2).
 *
 * Kluczowe decyzje (wg docs/dotypos_api_brain.md):
 * - akcja `order/create` na branchu,
 * - `take-away: true` PER POZYCJA (nie w korzeniu) — to naprawia „na wynos",
 * - dodatki jako `customizations` (gdy mamy mapowanie) lub w nocie pozycji (fallback),
 * - dostawa jako osobna pozycja produktowa (manual-price),
 * - `external-id` = idempotencja,
 * - klient podpięty przez `customer-id`.
 *
 * Gdy brak kluczy (tryb DEMO) — SYMULUJEMY sukces, żeby cały przepływ działał lokalnie.
 */

import { dotykackaConfig, hasCredentials, posSendEnabled } from "./config";
import { dotyRequest } from "./client";
import { upsertCustomerByPhone } from "./customers";
import type { Order, OrderItem } from "@/lib/orders/types";

interface PosResult {
  sent: boolean;
  simulated: boolean;
  orderNumber: string | null;
  customerId: string | null;
  error: string | null;
}

function itemToPos(item: OrderItem) {
  const productIdNum = Number(item.productId);
  const note =
    item.addons.length > 0 ? item.addons.map((a) => `+ ${a.name}`).join(", ") : undefined;
  return {
    id: Number.isFinite(productIdNum) ? productIdNum : item.productId,
    qty: item.qty,
    "take-away": true,
    ...(note ? { note } : {}),
    // TODO Faza 2+: gdy mamy mapowanie dodatków → customizations:
    // customizations: item.addons.map(a => ({ "product-customization-id": ..., "product-id": ... }))
  };
}

function buildNote(order: Order): string {
  const parts: string[] = [];
  parts.push(order.mode === "pickup" ? "🏠 ODBIÓR" : "🚚 DOSTAWA");
  parts.push(`#${order.number}`);
  if (order.timeMode === "scheduled" && order.scheduledTime) parts.push(`na ${order.scheduledTime}`);
  else parts.push("ASAP");
  if (order.mode === "delivery") {
    const a = order.customer;
    parts.push(`${a.street ?? ""}, ${a.zip ?? ""} ${a.city ?? ""}`.trim());
  }
  parts.push(`tel ${order.customer.phone}`);
  if (order.customer.note) parts.push(`Uwagi: ${order.customer.note}`);
  parts.push(order.payment === "cash" ? "💵 gotówka" : order.payment === "card" ? "💳 karta" : "🌐 online");
  return parts.join(" | ");
}

export async function sendOrderToPos(order: Order): Promise<PosResult> {
  // Tryb DEMO — symulacja (brak kluczy / brak dostępu do API).
  // BEZPIECZNIK: nawet z kluczami nie wysyłamy do POS, dopóki
  // DOTYKACKA_SEND_ORDERS=true (żeby testy nie przeszkadzały na sali).
  if (!hasCredentials() || !posSendEnabled()) {
    return {
      sent: true,
      simulated: true,
      orderNumber: `SIM-${order.number}`,
      customerId: null,
      error: null,
    };
  }

  const { cloudId, branchId } = dotykackaConfig;

  // 1) Klient jako encja (nie notatka).
  let customerId: string | null = null;
  try {
    customerId = await upsertCustomerByPhone(order.customer);
  } catch {
    customerId = null; // nie blokujemy zamówienia, gdy klient się nie zapisze
  }

  // 2) Pozycje + dostawa.
  const items: Array<Record<string, unknown>> = order.items.map(itemToPos);
  if (order.mode === "delivery" && order.deliveryFee > 0) {
    const pid = dotykackaConfig.deliveryCityProductId || dotykackaConfig.deliveryKmProductId;
    if (pid) {
      items.push({ id: Number(pid) || pid, qty: 1, "take-away": true, "manual-price": order.deliveryFee });
    }
  }

  // 3) order/create.
  const payload: Record<string, unknown> = {
    action: "order/create",
    "external-id": order.externalId,
    note: buildNote(order),
    items,
    ...(customerId ? { "customer-id": Number(customerId) || customerId } : {}),
  };

  const res = await dotyRequest<{ code?: number; order?: { "order-number"?: string } }>(
    `/clouds/${cloudId}/branches/${branchId}/pos-actions`,
    { method: "POST", body: payload, headers: { "Idempotency-Key": order.externalId } }
  );

  const code = res.data?.code;
  if (!res.ok || (typeof code === "number" && code !== 0)) {
    return {
      sent: false,
      simulated: false,
      orderNumber: null,
      customerId,
      error: `POS HTTP ${res.status} code ${code ?? "?"}: ${res.raw.slice(0, 200)}`,
    };
  }

  return {
    sent: true,
    simulated: false,
    orderNumber: res.data?.order?.["order-number"] ?? null,
    customerId,
    error: null,
  };
}
