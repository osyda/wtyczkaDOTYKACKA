"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart/CartProvider";
import { zl } from "@/lib/format";
import { C } from "@/lib/carta";
import type { Order, OrderStatus } from "@/lib/orders/types";

/* ============ CARTA · Twoje zamówienia (pamięć urządzenia — plan K1) ============ */

const STATUS_PL: Record<OrderStatus, string> = {
  new: "przyjęte",
  scheduled: "zaplanowane",
  in_progress: "w przygotowaniu",
  ready: "gotowe",
  on_delivery: "w drodze",
  completed: "zrealizowane",
  canceled: "anulowane",
};

type HistEntry = { id: string; number?: number; at?: string };

export default function MyOrdersPage() {
  const router = useRouter();
  const { addProduct, addHalves } = useCart();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [gone, setGone] = useState(0);

  useEffect(() => {
    let hist: HistEntry[] = [];
    try {
      hist = JSON.parse(localStorage.getItem("mr_orders_v1") ?? "[]") as HistEntry[];
    } catch {
      /* pusto */
    }
    if (hist.length === 0) {
      setOrders([]);
      return;
    }
    Promise.all(
      hist.map((h) =>
        fetch(`/api/orders/${h.id}`, { cache: "no-store" })
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => (d?.order as Order) ?? null)
          .catch(() => null)
      )
    ).then((list) => {
      const found = list.filter(Boolean) as Order[];
      setGone(hist.length - found.length);
      setOrders(found);
    });
  }, []);

  const reorder = (o: Order) => {
    for (const it of o.items) {
      if (it.halves?.length === 2) {
        const [a, b] = it.halves;
        addHalves(
          { id: a.productId, name: a.name, description: "", price: a.price },
          { id: b.productId, name: b.name, description: "", price: b.price },
          it.qty,
          it.addons
        );
      } else {
        addProduct(
          { id: it.productId, name: it.name, description: "", price: it.basePrice, packaging: it.packaging },
          it.qty,
          it.addons
        );
      }
    }
    router.push("/checkout");
  };

  return (
    <main className="min-h-screen pb-20" style={{ background: C.ivory, color: C.ink }}>
      <div className="mx-auto max-w-[430px] px-[26px] min-[700px]:max-w-[640px]">
        <header className="ct-reveal pt-[34px] text-center">
          <div className="text-[9px] tracking-[0.34em] text-[#7A7060]" style={{ textIndent: "0.34em" }}>
            RESTAURACJA — PIZZERIA
          </div>
          <div className="mt-4 whitespace-nowrap text-[24px] font-extrabold tracking-[0.4em]" style={{ textIndent: "0.4em" }}>
            MAMMAROSA
          </div>
          <div className="font-carta mt-5 text-[27px] italic">Twoje zamówienia</div>
          <div className="mt-1 text-[11px]" style={{ color: C.muted }}>
            zapamiętane na tym urządzeniu
          </div>
        </header>

        <div className="mt-7">
          {orders === null && (
            <p className="text-center text-[12px]" style={{ color: C.muted }}>Wczytuję…</p>
          )}

          {orders?.length === 0 && (
            <div className="text-center">
              <p className="font-carta text-[18px] italic">Jeszcze nic tu nie ma.</p>
              <p className="mt-2 text-[12px]" style={{ color: C.muted }}>
                Po pierwszym zamówieniu znajdziesz tu historię i szybkie „zamów ponownie".
              </p>
            </div>
          )}

          {orders?.map((o) => (
            <div key={o.id} className="border-b py-5" style={{ borderColor: C.hairlineSoft }}>
              <div className="flex items-baseline">
                <span className="font-carta text-[17px]">#{o.number}</span>
                <span className="ml-3 text-[10.5px]" style={{ color: C.muted }}>
                  {new Date(o.createdAt).toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric" })}
                </span>
                <span className="mx-3 flex-1 -translate-y-[3px] border-b border-dotted" style={{ borderColor: C.leader }} />
                <span className="font-carta text-[16px]">{zl(o.total)}</span>
              </div>
              <div className="mt-1.5 text-[11.5px] leading-relaxed" style={{ color: C.muted }}>
                {o.items.map((i) => `${i.qty}× ${i.name}`).join(" · ")}
              </div>
              <div className="mt-2.5 flex items-center gap-4">
                <span
                  className="text-[9.5px] uppercase tracking-[0.22em]"
                  style={{ color: o.status === "canceled" ? C.accent : "#5B6B2E", textIndent: "0.22em" }}
                >
                  {STATUS_PL[o.status]}
                </span>
                {["new", "scheduled", "in_progress", "ready", "on_delivery"].includes(o.status) && (
                  <Link
                    href={`/dziekujemy/${o.id}`}
                    className="border-b pb-0.5 text-[10px] uppercase tracking-[0.2em]"
                    style={{ color: C.muted, borderColor: C.hairline, textIndent: "0.2em" }}
                  >
                    Śledź
                  </Link>
                )}
                {o.status !== "canceled" && (
                  <button
                    onClick={() => reorder(o)}
                    className="ml-auto cursor-pointer border-b pb-0.5 text-[10px] uppercase tracking-[0.2em]"
                    style={{ color: C.accent, borderColor: C.accent, textIndent: "0.2em" }}
                  >
                    Zamów ponownie
                  </button>
                )}
              </div>
            </div>
          ))}

          {gone > 0 && (
            <p className="mt-4 text-center text-[10.5px]" style={{ color: C.faint }}>
              {gone} starszych zamówień nie jest już dostępnych do podglądu.
            </p>
          )}
        </div>

        <div className="mt-9 text-center">
          <Link
            href="/menu"
            className="border-b pb-1 text-[10px] uppercase tracking-[0.24em]"
            style={{ color: C.accent, borderColor: C.accent, textIndent: "0.24em" }}
          >
            ← Wróć do menu
          </Link>
        </div>
      </div>
    </main>
  );
}
