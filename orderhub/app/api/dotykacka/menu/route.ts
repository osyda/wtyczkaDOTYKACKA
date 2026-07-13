import { NextResponse } from "next/server";
import { getMenu } from "@/lib/dotykacka/menu";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    // ?full=1 → pełne menu dla obsługi (telefon), z kategoriami ukrytymi dla klientów.
    const full = new URL(req.url).searchParams.get("full") === "1";
    const menu = await getMenu({ full });
    return NextResponse.json(menu);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Błąd pobierania menu." },
      { status: 502 }
    );
  }
}
