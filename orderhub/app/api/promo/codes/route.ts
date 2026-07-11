import { NextResponse } from "next/server";
import { listPromoCodes, upsertPromoCode, deletePromoCode, normalizeCode } from "@/lib/promo";
import type { PromoCode } from "@/lib/promo";

export const dynamic = "force-dynamic";

/** Zarządzanie kodami (panel, za PIN-em przez proxy). */
export async function GET() {
  const codes = await listPromoCodes();
  return NextResponse.json({ codes });
}

export async function POST(req: Request) {
  let body: Partial<PromoCode>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Nieprawidłowe dane." }, { status: 400 });
  }
  const code = normalizeCode(body.code ?? "");
  const value = Number(body.value);
  if (code.length < 3 || code.length > 24) {
    return NextResponse.json({ error: "Kod: 3–24 znaki." }, { status: 400 });
  }
  if (!Number.isFinite(value) || value <= 0 || (body.kind === "percent" && value > 100)) {
    return NextResponse.json({ error: "Nieprawidłowa wartość rabatu." }, { status: 400 });
  }
  const saved = await upsertPromoCode({
    code,
    kind: body.kind === "amount" ? "amount" : "percent",
    value,
    minSubtotal: Number(body.minSubtotal) > 0 ? Number(body.minSubtotal) : undefined,
    scope: body.scope === "delivery" || body.scope === "pickup" ? body.scope : "all",
    onlineOnly: Boolean(body.onlineOnly),
    oncePerPhone: Boolean(body.oncePerPhone),
    firstOrderOnly: Boolean(body.firstOrderOnly),
    validUntil: body.validUntil || undefined,
    maxUses: Number(body.maxUses) > 0 ? Number(body.maxUses) : undefined,
    active: body.active !== false,
  });
  return NextResponse.json({ code: saved });
}

export async function DELETE(req: Request) {
  const code = new URL(req.url).searchParams.get("code") ?? "";
  const removed = await deletePromoCode(code);
  if (!removed) return NextResponse.json({ error: "Nie znaleziono kodu." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
