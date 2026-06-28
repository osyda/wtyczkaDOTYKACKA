import { NextResponse } from "next/server";
import { lookupCaller } from "@/lib/cti";

export const dynamic = "force-dynamic";

/**
 * GET /api/cti/lookup?phone=500134092
 * Zwraca info o dzwoniącym na podstawie historii. Docelowo wywoływane przez
 * centralkę VoIP / aplikację-towarzysza przy zdarzeniu „połączenie przychodzące".
 */
export async function GET(req: Request) {
  const phone = new URL(req.url).searchParams.get("phone") ?? "";
  if (!phone) return NextResponse.json({ error: "Brak numeru." }, { status: 400 });
  const info = await lookupCaller(phone);
  return NextResponse.json(info);
}
