import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { audit } from "@/lib/audit";
import { driverCodesEnabled, driverCookieValue, findDriverByCode, verifyDriverCookie } from "@/lib/staffAuth";

export const dynamic = "force-dynamic";

const COOKIE = "driver_auth";
const MAX_AGE = 90 * 24 * 60 * 60; // 90 dni

/** Kto jest zalogowany na tym telefonie (weryfikacja podpisu ciasteczka). */
export async function GET() {
  const c = await cookies();
  const name = await verifyDriverCookie(c.get(COOKIE)?.value);
  return NextResponse.json({ name, enabled: driverCodesEnabled() });
}

/** Logowanie kodem kierowcy → ciasteczko na 90 dni. */
export async function POST(req: Request) {
  if (!driverCodesEnabled()) {
    return NextResponse.json({ error: "Kody kierowców nie są skonfigurowane (DRIVER_CODES)." }, { status: 503 });
  }
  let code = "";
  try {
    code = String(((await req.json()) as { code?: string }).code ?? "");
  } catch {
    /* brak ciała */
  }
  const name = findDriverByCode(code);
  if (!name) {
    await audit("logowanie kierowcy — zły kod");
    return NextResponse.json({ error: "Nieprawidłowy kod." }, { status: 401 });
  }
  const value = await driverCookieValue(name);
  if (!value) return NextResponse.json({ error: "Brak sekretu serwera (STAFF_PIN)." }, { status: 503 });

  const res = NextResponse.json({ name });
  res.cookies.set(COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    maxAge: MAX_AGE,
    path: "/",
  });
  await audit("logowanie kierowcy", { details: name });
  return res;
}

/** Wylogowanie (przycisk „Zmień kierowcę"). */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, "", { httpOnly: true, sameSite: "lax", secure: true, maxAge: 0, path: "/" });
  return res;
}
