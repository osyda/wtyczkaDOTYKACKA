import { NextResponse } from "next/server";
import { getRing } from "@/lib/ctiCalls";
import { lookupCaller } from "@/lib/cti";

export const dynamic = "force-dynamic";

/** GET /api/cti/ring — czy teraz dzwoni telefon + rozpoznany klient (dla panelu). */
export async function GET() {
  const ring = await getRing();
  if (!ring) return NextResponse.json({ ringing: false });
  const caller = await lookupCaller(ring.phone);
  return NextResponse.json({ ringing: true, at: ring.at, caller });
}
