import { NextResponse } from "next/server";
import { reportRing, reportEnd, webhookKey } from "@/lib/ctiCalls";
import { staffToken } from "@/lib/staffAuth";

export const dynamic = "force-dynamic";

/**
 * Webhook centralki: „dzwoni telefon" / „koniec połączenia".
 *
 * Obsługuje GET i POST — różne centralki/aplikacje potrafią tylko jedno z dwóch.
 *   GET  /api/cti/call?key=SEKRET&phone=48601234567
 *   POST /api/cti/call?key=SEKRET   body: { "phone": "601234567", "event": "ring" }
 * Numer: parametr phone|number|caller|from. Zdarzenie: ring (domyślne) | end.
 * Klucz: ?key= lub nagłówek x-cti-key — wymagany, gdy ustawiono CTI_WEBHOOK_KEY.
 */
async function handle(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams;

  const expected = webhookKey();
  if (expected) {
    const got = q.get("key") ?? req.headers.get("x-cti-key") ?? "";
    if (got !== expected && !(await isStaff(req))) {
      return NextResponse.json({ error: "Zły klucz webhooka." }, { status: 401 });
    }
  }

  let body: Record<string, unknown> = {};
  if (req.method === "POST") {
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      /* dopuszczamy POST bez ciała — wszystko w query */
    }
  }
  const pick = (...names: string[]) => {
    for (const n of names) {
      const v = q.get(n) ?? (typeof body[n] === "string" || typeof body[n] === "number" ? String(body[n]) : null);
      if (v) return v;
    }
    return null;
  };

  const event = (pick("event", "type") ?? "ring").toLowerCase();
  if (event === "end" || event === "hangup" || event === "disconnect") {
    await reportEnd();
    return NextResponse.json({ ok: true, event: "end" });
  }

  const phone = pick("phone", "number", "caller", "from", "callerid", "caller_id", "src");
  if (!phone) {
    return NextResponse.json({ error: "Brak numeru (parametr phone)." }, { status: 400 });
  }
  const fresh = await reportRing(phone);
  return NextResponse.json({ ok: true, event: "ring", fresh });
}

/** Zalogowana obsługa (cookie panelu) może testować webhook bez klucza. */
async function isStaff(req: Request): Promise<boolean> {
  const m = (req.headers.get("cookie") ?? "").match(/(?:^|;\s*)staff_auth=([^;]+)/);
  if (!m) return false;
  const token = await staffToken();
  return Boolean(token) && m[1] === token;
}

export async function GET(req: Request) {
  return handle(req);
}
export async function POST(req: Request) {
  return handle(req);
}
