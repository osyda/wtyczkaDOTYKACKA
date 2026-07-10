import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Proxy: ochrona staffowych endpointów API PIN-em (STAFF_PIN).
 * Bez ustawionego STAFF_PIN ochrona jest wyłączona (DEMO/local).
 * Publiczne (klient): POST /api/orders, GET /api/orders/[id], /api/delivery/*, /api/geo/*.
 * Chronione (obsługa): GET /api/orders (lista), .../eta, .../status, /api/cti/*.
 */
export function proxy(req: NextRequest) {
  const pin = process.env.STAFF_PIN;
  if (!pin) return NextResponse.next();

  const authed = req.cookies.get("staff_auth")?.value === pin;
  const { pathname } = req.nextUrl;
  const method = req.method;

  const isStaffApi =
    (pathname === "/api/orders" && method === "GET") ||
    pathname.endsWith("/eta") ||
    pathname.endsWith("/status") ||
    pathname.startsWith("/api/cti/");

  if (isStaffApi && !authed) {
    return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
