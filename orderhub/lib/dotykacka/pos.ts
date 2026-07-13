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

function itemToPos(item: OrderItem): Array<Record<string, unknown>> {
  const addonsNote = item.addons.length > 0 ? item.addons.map((a) => `+ ${a.name}`).join(", ") : "";
  const addonsSum = item.addons.reduce((s, a) => s + a.price, 0);

  // Pizza pół na pół → dwie pozycje po 50% ceny (odwzorowanie „porcji 50%" z POS).
  // Dodatki (na całość) doliczamy do pierwszej połówki. Uwaga: zachowanie
  // manual-price przy qty>1 do potwierdzenia testem po podpięciu kluczy.
  if (item.halves?.length === 2) {
    const [a, b] = item.halves;
    const half = (p: number) => Math.round((p / 2) * 100) / 100;
    const idOf = (pid: string) => (Number.isFinite(Number(pid)) ? Number(pid) : pid);
    return [
      {
        id: idOf(a.productId),
        qty: item.qty,
        "take-away": true,
        "manual-price": half(a.price) + addonsSum,
        note: `PÓŁ NA PÓŁ (1/2) z: ${b.name}${addonsNote ? ` | ${addonsNote} (na całość)` : ""}`,
      },
      {
        id: idOf(b.productId),
        qty: item.qty,
        "take-away": true,
        "manual-price": half(b.price),
        note: `PÓŁ NA PÓŁ (2/2) z: ${a.name}`,
      },
    ];
  }

  const productIdNum = Number(item.productId);

  // Dodatki zmapowane na customizations Dotykački → prawdziwe pozycje w POS
  // (magazyn/druk kuchenny/cena z POS). Niezmapowane lądują w nocie.
  const asNum = (v: string) => (Number.isFinite(Number(v)) ? Number(v) : v);
  const mapped = item.addons.filter((a) => a.customizationId);
  const unmapped = item.addons.filter((a) => !a.customizationId);
  const unmappedNote = unmapped.length > 0 ? unmapped.map((a) => `+ ${a.name}`).join(", ") : "";

  return [
    {
      id: Number.isFinite(productIdNum) ? productIdNum : item.productId,
      qty: item.qty,
      "take-away": true,
      ...(unmappedNote ? { note: unmappedNote } : {}),
      ...(mapped.length > 0
        ? {
            customizations: mapped.map((a) => ({
              "product-customization-id": asNum(a.customizationId!),
              "product-id": asNum(a.id),
              qty: 1,
            })),
          }
        : {}),
    },
  ];
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
  if (order.discount) {
    parts.push(
      `RABAT${order.discount.code ? ` KOD ${order.discount.code}` : ""} -${order.discount.amount} zł${
        order.discount.reason ? ` (${order.discount.reason})` : ""
      } | DO ZAPŁATY ${order.total} zł`
    );
  }
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

  // 2) Pozycje + opakowania + dostawa.
  const items: Array<Record<string, unknown>> = order.items.flatMap(itemToPos);

  // Opakowania na wynos: jeden wiersz z produktem z POS (ilość = suma sztuk dań).
  const packItems = order.items.filter((i) => i.packaging);
  const packCount = packItems.reduce((s, i) => s + i.qty, 0);
  if (packCount > 0) {
    const packId = packItems[0]!.packaging!.id;
    items.push({ id: Number(packId) || packId, qty: packCount, "take-away": true });
  }
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
