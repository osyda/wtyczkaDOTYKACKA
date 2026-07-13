import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { staffProtectionEnabled, staffToken, findStaffByCode } from "@/lib/staffAuth";
import { findEmployeeByPin } from "@/lib/dotykacka/employees";

export const dynamic = "force-dynamic";

/**
 * Warstwa 2: osobisty kod personelu → imię (podpis przy zamówieniach).
 * Dostępne TYLKO za bramką urządzenia (hasło STAFF_PIN już wpisane) —
 * obcy nie może zgadywać kodów, bo nie przejdzie warstwy 1.
 */
export async function POST(req: Request) {
  if (staffProtectionEnabled()) {
    const token = await staffToken();
    const c = await cookies();
    if (!token || c.get("staff_auth")?.value !== token) {
      return NextResponse.json({ error: "Najpierw hasło urządzenia." }, { status: 401 });
    }
  }

  let body: { code?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const code = body.code?.trim() ?? "";
  if (!code) return NextResponse.json({ error: "Podaj kod." }, { status: 400 });

  // Kody z STAFF_CODES; w odwodzie kody pracowników z Dotykački (gdyby API
  // kiedyś zaczęło je zwracać).
  const name = findStaffByCode(code) ?? (await findEmployeeByPin(code))?.name ?? null;
  if (!name) return NextResponse.json({ error: "Nieznany kod." }, { status: 401 });

  return NextResponse.json({ ok: true, name });
}
