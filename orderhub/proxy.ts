import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { staffProtectionEnabled, staffToken } from "@/lib/staffAuth";

/**
 * Proxy: ochrona staffowych endpointów API PIN-em (STAFF_PIN).
 * Bez ustawionego STAFF_PIN ochrona jest wyłączona (DEMO/local).
 * Publiczne (klient): POST /api/orders, GET /api/orders/[id], /api/delivery/*, /api/geo/*.
 * Chronione (obsługa): GET /api/orders (lista), .../eta, .../status, /api/cti/*
 * poza /api/cti/call — webhookiem centralka uwierzytelnia się własnym kluczem.
 */
export async function proxy(req: NextRequest) {
  if (!staffProtectionEnabled()) return NextResponse.next();

  const token = await staffToken();
  const authed = Boolean(token) && req.cookies.get("staff_auth")?.value === token;
  const { pathname } = req.nextUrl;
  const method = req.method;

  const isStaffApi =
    (pathname === "/api/orders" && method === "GET") ||
    (pathname.startsWith("/api/orders/") && method === "DELETE") ||
    pathname.endsWith("/eta") ||
    pathname.endsWith("/status") ||
    pathname.endsWith("/driver") ||
    pathname.endsWith("/pos") ||
    pathname === "/api/promo/codes" ||
    (pathname.startsWith("/api/cti/") && pathname !== "/api/cti/call");

  if (isStaffApi && !authed) {
    return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
