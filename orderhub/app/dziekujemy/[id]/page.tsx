"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { Order } from "@/lib/orders/types";
import { zl } from "@/lib/format";

function fmtTime(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function ThankYouPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let active = true;
    const poll = async () => {
      try {
        const res = await fetch(`/api/orders/${id}`, { cache: "no-store" });
        if (res.status === 404) {
          if (active) setNotFound(true);
          return;
        }
        const data = await res.json();
        if (active) setOrder(data.order);
      } catch {
        /* retry next tick */
      }
    };
    poll();
    const t = setInterval(poll, 3000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [id]);

  if (notFound) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#F7E9D5] text-[#1F1714]">
        <div className="text-center">
          <p className="text-lg font-bold">Nie znaleziono zamówienia</p>
          <Link href="/menu" className="mt-3 inline-block text-[#B7382F] underline">
            Wróć do menu
          </Link>
        </div>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#F7E9D5] text-[#9a8a7c]">
        Ładowanie…
      </main>
    );
  }

  const isPickup = order.mode === "pickup";
  const firstName = order.customer.name.split(" ")[0] || "";

  // Co pokazać jako czas:
  const scheduled = order.timeMode === "scheduled";
  const etaKnown = !!order.etaAt;
  const bigTime = scheduled ? order.scheduledTime ?? "—" : etaKnown ? fmtTime(order.etaAt) : "…";
  const sub = scheduled
    ? isPickup
      ? "odbiór o wybranej godzinie"
      : "dostawa o wybranej godzinie"
    : etaKnown
      ? `~ za ${order.etaMinutes} minut · ustalone przez obsługę`
      : "obsługa właśnie ustala czas…";

  const steps = [
    { key: "accepted", label: "Zamówienie przyjęte", icon: "✓", done: true },
    {
      key: "prep",
      label: "W przygotowaniu",
      icon: "👨‍🍳",
      done: ["in_progress", "ready", "on_delivery", "completed"].includes(order.status),
      now: order.status === "in_progress" || (scheduled && order.status === "scheduled"),
    },
    {
      key: "way",
      label: isPickup ? "Gotowe do odbioru" : "W drodze do Ciebie",
      icon: isPickup ? "🛍" : "🛵",
      done: ["ready", "on_delivery", "completed"].includes(order.status),
      now: order.status === "ready" || order.status === "on_delivery",
    },
    { key: "done", label: isPickup ? "Odebrane" : "Dostarczone", icon: "🏁", done: order.status === "completed" },
  ];

  return (
    <main className="min-h-screen bg-[#F7E9D5] text-[#1F1714]">
      <div className="bg-gradient-to-br from-[#5C6B3C] to-[#434E2A] px-6 py-8 text-center text-white">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-white/20 text-3xl">
          ✓
        </div>
        <h1 className="text-2xl font-bold">Dziękujemy{firstName ? `, ${firstName}` : ""}!</h1>
        <p className="text-sm opacity-90">Zamówienie przyjęte. Kuchnia już je widzi.</p>
        <div className="mt-3 inline-block rounded-full bg-white/15 px-4 py-1.5 text-sm font-semibold">
          #{order.number} · {isPickup ? "🏠 Odbiór" : "🚚 Dostawa"}
        </div>
      </div>

      <div className="mx-auto max-w-md px-5 py-5">
        <div className="rounded-3xl border border-[#E7D4BC] bg-white p-6 text-center shadow-[0_8px_22px_rgba(178,31,31,0.06)]">
          <div className="text-xs font-semibold uppercase tracking-wide text-[#9a8a7c]">
            {isPickup ? "Odbiór około" : "Dostawa około"}
          </div>
          <div className="my-1 text-5xl font-extrabold text-[#B7382F]">{bigTime}</div>
          <div className="text-sm text-[#6a5a4e]">{sub}</div>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#EDEFE2] px-3 py-1.5 text-xs font-bold text-[#5C6B3C]">
            <span className="h-2 w-2 rounded-full bg-[#5C6B3C]" /> Status aktualizuje się na żywo
          </div>
        </div>

        <div className="my-5 px-1">
          {steps.map((s, i) => (
            <div key={s.key}>
              <div className="flex items-center gap-3 py-1.5">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm ${
                    s.now
                      ? "bg-[#B7382F] text-white"
                      : s.done
                        ? "bg-[#5C6B3C] text-white"
                        : "bg-[#eee2d5] text-[#b0a294]"
                  }`}
                >
                  {s.done && !s.now ? "✓" : s.icon}
                </div>
                <div className={`text-sm font-semibold ${s.done || s.now ? "" : "text-[#b0a294]"}`}>
                  {s.label}
                </div>
              </div>
              {i < steps.length - 1 && <div className="ml-4 h-3 w-0.5 bg-[#eadfd2]" />}
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-[#E7D4BC] bg-white p-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#9a8a7c]">
            Szczegóły
          </div>
          {order.items.map((it, idx) => (
            <div key={idx} className="flex justify-between py-1 text-sm">
              <span>
                {it.qty}× {it.name}
                {it.addons.length > 0 && (
                  <span className="text-[#9a8a7c]"> ({it.addons.map((a) => a.name).join(", ")})</span>
                )}
              </span>
              <span>{zl(it.lineTotal)}</span>
            </div>
          ))}
          {order.deliveryFee > 0 && (
            <div className="flex justify-between py-1 text-sm">
              <span>Dostawa</span>
              <span>{zl(order.deliveryFee)}</span>
            </div>
          )}
          <div className="mt-2 flex justify-between border-t border-dashed border-[#E7D4BC] pt-2 font-extrabold">
            <span>Razem · {order.payment === "cash" ? "gotówka" : order.payment === "card" ? "karta" : "online"}</span>
            <span>{zl(order.total)}</span>
          </div>
        </div>

        {order.pos.simulated && (
          <p className="mt-3 text-center text-xs text-[#b0a294]">
            Tryb DEMO — zamówienie zasymulowane (POS podłączymy kluczami Dotykački).
          </p>
        )}
      </div>
    </main>
  );
}
