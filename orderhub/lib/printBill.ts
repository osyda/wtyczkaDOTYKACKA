"use client";

/**
 * RACHUNEK NIEFISKALNY (72mm) drukowany z przeglądarki panelu — dla kierowcy
 * i klienta przy dostawie. To NIE jest dokument sprzedaży (stopka to zaznacza);
 * paragon fiskalny drukuje POS w momencie fiskalizacji (patrz fiscalizeMoment).
 */

import { zl } from "@/lib/format";
import type { Order } from "@/lib/orders/types";

const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;");

export function printBill(order: Order) {
  const rows = order.items
    .map((it) => {
      const addons = it.addons
        .map((a) => `<div class="ad"><span>+ ${esc(a.name)}</span><span>${a.price > 0 ? zl(a.price * it.qty) : ""}</span></div>`)
        .join("");
      return `<div class="row it"><span><b>${it.qty}×</b> ${esc(it.name)}</span><span>${zl(it.basePrice * it.qty)}</span></div>${addons}`;
    })
    .join("");

  const packagingCount = order.items.reduce((s, i) => s + (i.packaging ? i.qty : 0), 0);
  const packagingFee = order.items.reduce((s, i) => s + (i.packaging ? i.qty * i.packaging.price : 0), 0);

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Rachunek #${order.number}</title>
<style>
  body { font-family: 'Courier New', monospace; color: #000; width: 72mm; margin: 0 auto; padding: 4mm; font-size: 12px; }
  .c { text-align: center; }
  h1 { font-size: 15px; letter-spacing: 4px; margin: 0; }
  hr { border: none; border-top: 1px dashed #000; margin: 2.5mm 0; }
  .row { display: flex; justify-content: space-between; gap: 3mm; }
  .it { margin-top: 1.4mm; font-size: 12.5px; }
  .ad { display: flex; justify-content: space-between; padding-left: 5mm; font-size: 11px; }
  .sum { font-size: 15px; font-weight: bold; }
  .foot { margin-top: 3mm; font-size: 10px; text-align: center; }
</style></head><body>
  <div class="c"><h1>MAMMAROSA</h1><div>Restauracja — Pizzeria · Kościerzyna</div>
  <div style="margin-top:2mm"><b>RACHUNEK #${order.number}</b></div>
  <div>${new Date(order.createdAt).toLocaleString("pl-PL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}${order.driver ? ` · kierowca: ${esc(order.driver)}` : ""}</div></div>
  <hr>${rows}
  <hr>
  ${packagingFee > 0 ? `<div class="row"><span>Opakowania × ${packagingCount}</span><span>${zl(packagingFee)}</span></div>` : ""}
  ${order.mode === "delivery" ? `<div class="row"><span>Dostawa</span><span>${zl(order.deliveryFee)}</span></div>` : ""}
  ${order.discount ? `<div class="row"><span>Rabat${order.discount.code ? ` (${esc(order.discount.code)})` : ""}</span><span>−${zl(order.discount.amount)}</span></div>` : ""}
  <div class="row sum"><span>RAZEM</span><span>${zl(order.total)}</span></div>
  <div class="row"><span>Płatność</span><span>${order.payment === "cash" ? "GOTÓWKA" : order.payment === "card" ? "KARTA" : "OPŁACONE ONLINE"}</span></div>
  <hr>
  <div>${esc(order.customer.name)} · tel. ${esc(order.customer.phone)}</div>
  ${order.mode === "delivery" ? `<div>${esc(order.customer.street ?? "")}, ${esc(order.customer.city ?? "")}</div>` : ""}
  ${order.customer.note ? `<div><b>Uwagi:</b> ${esc(order.customer.note)}</div>` : ""}
  <div class="foot">Dziękujemy! · To nie jest paragon fiskalny.</div>
</body></html>`;

  const w = window.open("", "_blank", "width=420,height=640");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => {
    w.print();
    w.close();
  }, 250);
}
