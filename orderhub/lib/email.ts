/**
 * Maile do klientów — potwierdzenie zamówienia z linkiem do śledzenia na żywo.
 *
 * Dostawca: Resend (resend.com, darmowe 100 maili/dzień) przez zwykły fetch.
 * Bez klucza RESEND_API_KEY wysyłka jest SYMULOWANA — cały przepływ działa,
 * mail po prostu nie wychodzi (jak bezpiecznik POS). E-mail klienta jest
 * OPCJONALNY — bez adresu nic nie wysyłamy.
 *
 * Wysyłka z własnej domeny wymaga weryfikacji DNS w Resend
 * (SPF+DKIM u operatora domeny) — instrukcja w docs/CO_ZOSTALO_DLA_CIEBIE.md.
 */

import { zl } from "@/lib/format";
import type { Order } from "@/lib/orders/types";

const KEY = process.env.RESEND_API_KEY || "";
const FROM = process.env.EMAIL_FROM || "Mammarosa <zamowienia@mammarosa.pl>";

export function emailEnabled(): boolean {
  return Boolean(KEY);
}

function esc(t: string): string {
  return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Potwierdzenie w stylu CARTA (style inline — wymóg klientów pocztowych). */
function confirmationHtml(order: Order, trackUrl: string): string {
  const ink = "#1B1710";
  const muted = "#7A7060";
  const hairline = "#E3DAC6";
  const accent = "#8E3B2F";

  const rows = order.items
    .map(
      (it) => `
      <tr>
        <td style="padding:9px 0;border-bottom:1px solid ${hairline};font-size:14px;color:${ink}">
          ${it.qty}× ${esc(it.name)}
          ${it.addons.length ? `<div style="font-size:11px;color:${muted};padding-top:2px">${it.addons.map((a) => `+ ${esc(a.name)}`).join(", ")}</div>` : ""}
        </td>
        <td style="padding:9px 0;border-bottom:1px solid ${hairline};font-size:14px;color:${ink};text-align:right;white-space:nowrap">${zl(it.lineTotal)}</td>
      </tr>`
    )
    .join("");

  const sumRow = (label: string, value: string, strong = false) => `
      <tr>
        <td style="padding:5px 0;font-size:${strong ? 16 : 12.5}px;color:${strong ? ink : muted};${strong ? "font-weight:bold" : ""}">${label}</td>
        <td style="padding:5px 0;font-size:${strong ? 17 : 13}px;color:${ink};text-align:right;${strong ? "font-weight:bold" : ""}">${value}</td>
      </tr>`;

  const when =
    order.timeMode === "scheduled" && order.scheduledTime
      ? `na godzinę ${order.scheduledTime}`
      : "najszybciej jak się da";
  const addr =
    order.mode === "delivery"
      ? `Dostawa: ${esc(order.customer.street ?? "")}, ${esc(order.customer.city ?? "")}`
      : "Odbiór osobisty w lokalu";

  return `<!doctype html><html><body style="margin:0;padding:0;background:#F7F3EB">
  <div style="max-width:520px;margin:0 auto;padding:36px 24px;font-family:Georgia,'Times New Roman',serif">
    <div style="text-align:center;letter-spacing:.32em;font-size:10px;color:${muted};font-family:Arial,sans-serif">RESTAURACJA — PIZZERIA</div>
    <div style="text-align:center;letter-spacing:.4em;font-size:24px;font-weight:800;color:${ink};font-family:Arial,sans-serif;margin-top:12px">MAMMAROSA</div>
    <div style="border-top:1px solid ${hairline};margin:22px 0"></div>

    <div style="text-align:center;font-style:italic;font-size:24px;color:${ink}">Grazie, ${esc(order.customer.name.split(" ")[0] || "")}!</div>
    <div style="text-align:center;font-size:13px;color:${muted};margin-top:6px;font-family:Arial,sans-serif">
      Przyjęliśmy zamówienie <b style="color:${ink}">#${order.number}</b> · ${when}
    </div>

    <div style="text-align:center;margin:22px 0">
      <a href="${trackUrl}" style="display:inline-block;background:${ink};color:#F7F3EB;text-decoration:none;padding:13px 26px;font-size:11px;letter-spacing:.22em;font-family:Arial,sans-serif">ŚLEDŹ ZAMÓWIENIE NA ŻYWO</a>
    </div>

    <table style="width:100%;border-collapse:collapse">${rows}</table>
    <table style="width:100%;border-collapse:collapse;margin-top:10px">
      ${order.discount ? sumRow(`Rabat${order.discount.code ? ` (${esc(order.discount.code)})` : ""}`, `−${zl(order.discount.amount)}`) : ""}
      ${order.mode === "delivery" ? sumRow("Dostawa", zl(order.deliveryFee)) : ""}
      ${sumRow("RAZEM", zl(order.total), true)}
    </table>

    <div style="border-top:1px solid ${hairline};margin:18px 0"></div>
    <div style="font-size:12.5px;color:${muted};font-family:Arial,sans-serif;line-height:1.7">
      ${addr}<br>
      Płatność: ${order.payment === "cash" ? "gotówka" : order.payment === "card" ? "karta (terminal)" : "opłacone online"}<br>
      Pytania? Zadzwoń: <a href="tel:586865530" style="color:${accent}">58 686 55 30</a>
    </div>
    <div style="text-align:center;font-size:10px;color:${muted};margin-top:26px;letter-spacing:.2em;font-family:Arial,sans-serif">MAMMAROSA · KOŚCIERZYNA</div>
  </div>
</body></html>`;
}

export interface EmailResult {
  sent: boolean;
  simulated: boolean;
  error: string | null;
}

/** Wysyła potwierdzenie zamówienia (jeśli klient podał e-mail). Nie blokuje zamówienia. */
export async function sendOrderConfirmation(order: Order, baseUrl: string): Promise<EmailResult> {
  const to = order.customer.email?.trim();
  if (!to || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
    return { sent: false, simulated: false, error: null }; // brak adresu = nic nie robimy
  }
  const trackUrl = `${baseUrl}/dziekujemy/${order.id}`;
  if (!KEY) {
    return { sent: true, simulated: true, error: null };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
      body: JSON.stringify({
        from: FROM,
        to: [to],
        subject: `Mammarosa — zamówienie #${order.number} przyjęte`,
        html: confirmationHtml(order, trackUrl),
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      const body = await res.text();
      return { sent: false, simulated: false, error: `Resend HTTP ${res.status}: ${body.slice(0, 160)}` };
    }
    return { sent: true, simulated: false, error: null };
  } catch (e) {
    return { sent: false, simulated: false, error: e instanceof Error ? e.message : "błąd wysyłki" };
  }
}
