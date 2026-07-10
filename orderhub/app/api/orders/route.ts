import { NextResponse } from "next/server";
import { orderStore } from "@/lib/orders/store";
import { sendOrderToPos } from "@/lib/dotykacka/pos";
import type { NewOrderInput } from "@/lib/orders/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const orders = await orderStore.list();
  return NextResponse.json({ orders });
}

export async function POST(req: Request) {
  let input: NewOrderInput;
  try {
    input = (await req.json()) as NewOrderInput;
  } catch {
    return NextResponse.json({ error: "Nieprawidłowe dane." }, { status: 400 });
  }

  if (!input.items?.length || !input.customer?.phone) {
    return NextResponse.json({ error: "Brak pozycji lub telefonu." }, { status: 400 });
  }

  const order = await orderStore.create(input);

  // Wyślij do POS (lub symuluj w trybie DEMO).
  const pos = await sendOrderToPos(order);
  const updated = await orderStore.update(order.id, { pos });

  return NextResponse.json({ order: updated ?? order }, { status: 201 });
}
