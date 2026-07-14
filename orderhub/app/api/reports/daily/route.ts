import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { orderStore } from "@/lib/orders/store";
import { sendEmail } from "@/lib/email";
import { staffProtectionEnabled, staffToken } from "@/lib/staffAuth";
import { zl } from "@/lib/format";
import type { Order } from "@/lib/orders/types";

export const dynamic = "force-dynamic";

/**
 * RAPORT DNIA DLA MANAGERA (życzenie właściciela 14.07.2026).
 * Vercel Cron woła tę trasę wieczorem (vercel.json) → mail na MANAGER_EMAIL:
 * ile zamówień online / telefonicznych, dostaw / odbiorów, utarg, kursy kierowców.
 *
 * Autoryzacja: nagłówek Bearer CRON_SECRET (tak woła Vercel Cron),
 * ?key=CRON_SECRET (test ręczny) albo cookie zalogowanej obsługi.
 * Podgląd bez wysyłki: ?preview=1.
 */

function warsawDay(iso: string): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Warsaw" }).format(new Date(iso));
}

function buildStats(orders: Order[], day: string) {
  const todays = orders.filter((o) => warsawDay(o.createdAt) === day);
  const active = todays.filter((o) => o.status !== "canceled");
  const done = todays.filter((o) => o.status === "completed");
  const sum = (list: Order[]) => Math.round(list.reduce((s, o) => s + o.total, 0) * 100) / 100;

  const byDriver = new Map<string, { count: number; sum: number }>();
  for (const o of done) {
    if (o.mode !== "delivery" || !o.driver) continue;
    const cur = byDriver.get(o.driver) ?? { count: 0, sum: 0 };
    byDriver.set(o.driver, { count: cur.count + 1, sum: Math.round((cur.sum + o.total) * 100) / 100 });
  }

  return {
    day,
    total: active.length,
    online: active.filter((o) => (o.source ?? "online") === "online").length,
    phone: active.filter((o) => o.source === "phone").length,
    delivery: active.filter((o) => o.mode === "delivery").length,
    pickup: active.filter((o) => o.mode === "pickup").length,
    completed: done.length,
    canceled: todays.filter((o) => o.status === "canceled").length,
    revenue: sum(done),
    discounts: Math.round(todays.reduce((s, o) => s + (o.discount?.amount ?? 0), 0) * 100) / 100,
    drivers: [...byDriver.entries()].map(([name, d]) => ({ name, ...d })),
  };
}

type Stats = ReturnType<typeof buildStats>;

function reportHtml(s: Stats): string {
  const ink = "#1B1710";
  const muted = "#7A7060";
  const hairline = "#E3DAC6";
  const row = (label: string, value: string, strong = false) => `
    <tr>
      <td style="padding:7px 0;border-bottom:1px solid ${hairline};font-size:${strong ? 15 : 13.5}px;color:${strong ? ink : muted};${strong ? "font-weight:bold" : ""}">${label}</td>
      <td style="padding:7px 0;border-bottom:1px solid ${hairline};font-size:${strong ? 16 : 14}px;color:${ink};text-align:right;${strong ? "font-weight:bold" : ""}">${value}</td>
    </tr>`;

  const driverRows = s.drivers.length
    ? s.drivers.map((d) => row(`Kierowca ${d.name}`, `${d.count} kursów · ${zl(d.sum)}`)).join("")
    : "";

  return `<!doctype html><html><body style="margin:0;padding:0;background:#F7F3EB">
  <div style="max-width:520px;margin:0 auto;padding:36px 24px;font-family:Georgia,serif">
    <div style="text-align:center;letter-spacing:.4em;font-size:22px;font-weight:800;color:${ink};font-family:Arial,sans-serif">MAMMAROSA</div>
    <div style="text-align:center;font-size:12px;color:${muted};margin-top:6px;font-family:Arial,sans-serif">Raport dnia · ${s.day}</div>
    <div style="border-top:1px solid ${hairline};margin:20px 0"></div>
    <table style="width:100%;border-collapse:collapse">
      ${row("Zamówienia (bez anulowanych)", String(s.total), true)}
      ${row("— online (strona)", String(s.online))}
      ${row("— telefoniczne", String(s.phone))}
      ${row("— z dostawą", String(s.delivery))}
      ${row("— odbiór osobisty", String(s.pickup))}
      ${row("Zrealizowane", String(s.completed))}
      ${row("Anulowane", String(s.canceled))}
      ${row("Rabaty razem", `−${zl(s.discounts)}`)}
      ${driverRows}
      ${row("Utarg (zrealizowane)", zl(s.revenue), true)}
    </table>
    <div style="text-align:center;font-size:10px;color:${muted};margin-top:24px;letter-spacing:.2em;font-family:Arial,sans-serif">
      RAPORT AUTOMATYCZNY · zamow.mammarosa.pl/panel
    </div>
  </div></body></html>`;
}

async function isStaff(): Promise<boolean> {
  if (!staffProtectionEnabled()) return true; // DEMO/local
  const token = await staffToken();
  const c = await cookies();
  return Boolean(token) && c.get("staff_auth")?.value === token;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = process.env.CRON_SECRET?.trim();
  const bearer = req.headers.get("authorization") ?? "";
  const authed =
    (secret && (bearer === `Bearer ${secret}` || url.searchParams.get("key") === secret)) || (await isStaff());
  if (!authed) return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });

  const day = url.searchParams.get("day") ?? warsawDay(new Date().toISOString());
  const stats = buildStats(await orderStore.list(), day);

  // ?preview=1 — sam podgląd liczb, bez wysyłki maila.
  if (url.searchParams.get("preview") === "1") {
    return NextResponse.json({ stats });
  }

  const to = process.env.MANAGER_EMAIL?.trim();
  if (!to) {
    return NextResponse.json({ stats, email: "Brak MANAGER_EMAIL — mail nie wysłany (ustaw w Vercelu)." });
  }
  const result = await sendEmail(to, `Mammarosa — raport dnia ${stats.day} (${stats.total} zamówień)`, reportHtml(stats));
  if (result.error) console.error(`[raport] ${stats.day}:`, result.error);
  return NextResponse.json({ stats, email: result });
}
