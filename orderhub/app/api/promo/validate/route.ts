import { NextResponse } from "next/server";
import { checkPromoCode } from "@/lib/promo";
import type { FulfillmentMode } from "@/lib/orders/types";

export const dynamic = "force-dynamic";

/** POST /api/promo/validate — sprawdzenie kodu dla koszyka (nie zużywa kodu). */
export async function POST(req: Request) {
  let body: { code?: string; subtotal?: number; mode?: FulfillmentMode; phone?: string; source?: "online" | "phone" };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "Nieprawidłowe dane." }, { status: 400 });
  }
  if (!body.code?.trim() || typeof body.subtotal !== "number") {
    return NextResponse.json({ ok: false, reason: "Podaj kod." }, { status: 400 });
  }
  const result = await checkPromoCode({
    code: body.code,
    subtotal: body.subtotal,
    mode: body.mode === "pickup" ? "pickup" : "delivery",
    phone: body.phone,
    source: body.source ?? "online",
  });
  return NextResponse.json(result);
}
