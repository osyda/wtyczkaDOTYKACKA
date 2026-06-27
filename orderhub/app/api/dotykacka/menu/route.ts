import { NextResponse } from "next/server";
import { getMenu } from "@/lib/dotykacka/menu";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const menu = await getMenu();
    return NextResponse.json(menu);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Błąd pobierania menu." },
      { status: 502 }
    );
  }
}
