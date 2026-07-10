import { NextResponse } from "next/server";
import { staffProtectionEnabled, staffToken } from "@/lib/staffAuth";
import { findEmployeeByPin } from "@/lib/dotykacka/employees";

export const dynamic = "force-dynamic";

/**
 * Logowanie obsługi:
 *  - wspólny STAFF_PIN, LUB
 *  - osobisty kod pracownika z Dotykački (ten sam co do POS) — gdy klucze API są podpięte.
 * Bez ustawionego STAFF_PIN ochrona jest wyłączona.
 */
export async function POST(req: Request) {
  if (!staffProtectionEnabled()) return NextResponse.json({ ok: true, required: false });

  let body: { pin?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const entered = body.pin?.trim() ?? "";
  if (!entered) return NextResponse.json({ ok: false, error: "Podaj PIN" }, { status: 401 });

  let name: string | null = null;
  if (entered === process.env.STAFF_PIN?.trim()) {
    name = "obsługa";
  } else {
    const employee = await findEmployeeByPin(entered);
    if (employee) name = employee.name;
  }
  if (!name) {
    return NextResponse.json({ ok: false, error: "Błędny PIN" }, { status: 401 });
  }

  const token = await staffToken();
  const res = NextResponse.json({ ok: true, name });
  res.cookies.set("staff_auth", token ?? "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 90, // 90 dni — kod wpisuje się raz na urządzenie
  });
  return res;
}
