import { NextResponse } from "next/server";
import { getHealth } from "@/lib/dotykacka/health";

export const dynamic = "force-dynamic";

export async function GET() {
  const report = await getHealth();
  return NextResponse.json(report, { status: report.ok ? 200 : 502 });
}
