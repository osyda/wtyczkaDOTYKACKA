import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Logowanie obsługi PIN-em (STAFF_PIN). Bez ustawionego PIN-u ochrona jest wyłączona. */
export async function POST(req: Request) {
  const pin = process.env.STAFF_PIN;
  if (!pin) return NextResponse.json({ ok: true, required: false });

  let body: { pin?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  if (!body.pin || body.pin !== pin) {
    return NextResponse.json({ ok: false, error: "Błędny PIN" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("staff_auth", pin, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 90, // 90 dni — PIN wpisuje się raz na urządzenie, nie co zmianę
  });
  return res;
}
