import { NextResponse } from "next/server";
import { orderStore, setEta } from "@/lib/orders/store";
import { sendOrderToPos } from "@/lib/dotykacka/pos";
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
