import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

/** Status autoryzacji obsługi (czy PIN wymagany i czy zalogowano). */
export async function GET() {
  const pin = process.env.STAFF_PIN;
  if (!pin) return NextResponse.json({ required: false, authed: true });
  const c = await cookies();
  const authed = c.get("staff_auth")?.value === pin;
  return NextResponse.json({ required: true, authed });
}
