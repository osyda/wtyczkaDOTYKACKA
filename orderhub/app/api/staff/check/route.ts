import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { staffProtectionEnabled, staffToken } from "@/lib/staffAuth";

export const dynamic = "force-dynamic";

/** Status autoryzacji obsługi (czy PIN wymagany i czy zalogowano). */
export async function GET() {
  if (!staffProtectionEnabled()) return NextResponse.json({ required: false, authed: true });
  const token = await staffToken();
  const c = await cookies();
  const authed = Boolean(token) && c.get("staff_auth")?.value === token;
  return NextResponse.json({ required: true, authed });
}
