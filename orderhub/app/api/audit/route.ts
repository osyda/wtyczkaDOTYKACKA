import { NextResponse } from "next/server";
import { auditList } from "@/lib/audit";

export const dynamic = "force-dynamic";

/** Dziennik zdarzeń dla panelu (chroniony hasłem obsługi w proxy). */
export async function GET() {
  return NextResponse.json({ events: await auditList(250) });
}
