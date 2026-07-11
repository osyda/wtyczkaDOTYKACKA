import { NextResponse } from "next/server";
import { orderStore, setEta } from "@/lib/orders/store";
import { sendOrderToPos } from "@/lib/dotykacka/pos";
import { getOpenState } from "@/lib/hours";
import { minOrderForFee } from "@/lib/delivery";
import type { NewOrderInput, Order } from "@/lib/orders/types";

type OrderPayload = NewOrderInput & {
  source?: "online" | "phone";
  staff?: string;
  /** Telefoniczne: kelnerka podaje czas od razu podczas rozmowy. */
  etaMinutes?: number;
};

export const dynamic = "force-dynamic";

export async function GET() {
  const orders = await orderStore.list();
  return NextResponse.json({ orders });
}

export async function POST(req: Request) {
  let input: OrderPayload;
  try {
    input = (await req.json()) as OrderPayload;
  } catch {
    return NextResponse.json({ error: "Nieprawidłowe dane." }, { status: 400 });
  }

  if (!input.items?.length || !input.customer?.phone) {
    return NextResponse.json({ error: "Brak pozycji lub telefonu." }, { status: 400 });
  }

  // Godziny otwarcia: klienci online tylko w oknie przyjmowania zamówień.
  // Telefoniczne (kelnerka) przechodzą zawsze — obsługa wie, co robi.
  if (input.source !== "phone") {
    const hours = await getOpenState();
    if (!hours.acceptingOrders) {
      return NextResponse.json({ error: hours.message }, { status: 403 });
    }
    // Minimalna wartość zamówienia z dostawą (do 6 km: 40 zł, dalej: 60 zł).
    if (input.mode === "delivery") {
      const min = minOrderForFee(input.deliveryFee ?? 0);
      if ((input.subtotal ?? 0) < min) {
        return NextResponse.json(
          { error: `Minimalna wartość zamówienia z dostawą pod ten adres to ${min} zł (bez kosztu dostawy).` },
          { status: 400 }
        );
      }
    }
  }

  let order = await orderStore.create(input);

  // Metadane spoza koszyka: źródło, podpis obsługi, czas podany przy telefonie.
  const extra: Partial<Order> = {};
  if (input.source) extra.source = input.source;
  if (input.staff?.trim()) extra.staff = input.staff.trim();
  if (input.etaMinutes && order.timeMode === "asap" && Number.isFinite(input.etaMinutes)) {
    Object.assign(extra, setEta(order, Number(input.etaMinutes)));
  }
  if (Object.keys(extra).length > 0) {
    order = (await orderStore.update(order.id, extra)) ?? order;
  }

  // Wyślij do POS (lub symuluj w trybie DEMO).
  const pos = await sendOrderToPos(order);
  const updated = await orderStore.update(order.id, { pos });

  return NextResponse.json({ order: updated ?? order }, { status: 201 });
}
