"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { Order } from "@/lib/orders/types";
import { zl } from "@/lib/format";

const INK = "#1D2A22";
const LIME = "#D5E36B";

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

const IconCheck = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className}><path d="M4.5 12.5 L10 18 L19.5 7" {...stroke} strokeWidth={2.6} /></svg>
);
const IconPot = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className}>
    <path d="M4.5 11 H19.5 V16 a3.5 3.5 0 0 1 -3.5 3.5 H8 A3.5 3.5 0 0 1 4.5 16 Z" {...stroke} />
    <path d="M3 11 H21" {...stroke} />
    <path d="M9 7.5 q1 -1.5 0 -3 M13.5 7.5 q1 -1.5 0 -3" {...stroke} />
  </svg>
);
const IconTruck = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className}>
    <path d="M3 7 H14 V16 H3 Z M14 10 H18.5 L21 13 V16 H14" {...stroke} />
    <circle cx="7" cy="17.8" r="1.7" {...stroke} /><circle cx="17" cy="17.8" r="1.7" {...stroke} />
  </svg>
);
const IconBag = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className}>
    <path d="M5.5 8.5 H18.5 L17.5 20 a1.8 1.8 0 0 1 -1.8 1.6 H8.3 A1.8 1.8 0 0 1 6.5 20 Z" {...stroke} />
    <path d="M9 11 V7.5 a3 3 0 0 1 6 0 V11" {...stroke} />
  </svg>
);
const IconFlag = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className}>
    <path d="M6 21 V4 M6 5 H17 L14.5 8 L17 11 H6" {...stroke} />
  </svg>
);
const IconArrow = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className}><path d="M4 12 H20 M14 6 L20 12 L14 18" {...stroke} /></svg>
);

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
        /* spróbujemy przy kolejnym ticku */
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
      <main className="grid min-h-screen place-items-center bg-[#F5F1E8] px-6" style={{ color: INK }}>
        <div className="text-center">
          <p className="text-lg font-bold">Nie znaleziono zamówienia</p>
          <Link
            href="/menu"
            className="mt-5 inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-bold text-[#F5F1E8]"
            style={{ background: INK }}
          >
            Wróć do menu <IconArrow className="h-4 w-4" />
          </Link>
        </div>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#F5F1E8] text-sm font-semibold text-[#A79E8C]">
        Ładowanie…
      </main>
    );
  }

  const isPickup = order.mode === "pickup";
  const firstName = order.customer.name.split(" ")[0] || "";
  const scheduled = order.timeMode === "scheduled";
  const etaKnown = !!order.etaAt;
  const bigTime = scheduled ? (order.scheduledTime ?? "—") : etaKnown ? fmtTime(order.etaAt) : null;
  const sub = scheduled
    ? isPickup
      ? "odbiór o wybranej godzinie"
      : "dostawa o wybranej godzinie"
    : etaKnown
      ? `około ${order.etaMinutes} minut · potwierdzone przez obsługę`
      : "obsługa właśnie potwierdza czas…";

  const steps = [
    { key: "accepted", label: "Zamówienie przyjęte", icon: IconCheck, done: true, now: false },
    {
      key: "prep",
      label: "W przygotowaniu",
      icon: IconPot,
      done: ["in_progress", "ready", "on_delivery", "completed"].includes(order.status),
      now: order.status === "in_progress" || (scheduled && order.status === "scheduled"),
    },
    {
      key: "way",
      label: isPickup ? "Gotowe do odbioru" : "W drodze do Ciebie",
      icon: isPickup ? IconBag : IconTruck,
      done: ["ready", "on_delivery", "completed"].includes(order.status),
      now: order.status === "ready" || order.status === "on_delivery",
    },
    {
      key: "done",
      label: isPickup ? "Odebrane" : "Dostarczone",
      icon: IconFlag,
      done: order.status === "completed",
      now: false,
    },
  ];

  return (
    <main className="min-h-screen bg-[#F5F1E8] pb-12" style={{ color: INK }}>
      <div className="mx-auto max-w-md px-5">
        {/* Nagłówek */}
        <div className="pt-14 text-center">
          <div
            className="mx-auto mb-5 flex h-[76px] w-[76px] items-center justify-center rounded-full"
            style={{ background: LIME }}
          >
            <IconCheck className="h-9 w-9" />
          </div>
          <h1 className="text-[26px] font-bold tracking-[-0.02em]">
            Dziękujemy{firstName ? `, ${firstName}` : ""}!
          </h1>
          <p className="mt-1.5 text-sm text-[#A79E8C]">Zamówienie przyjęte. Kuchnia już je widzi.</p>
          <div className="mt-4 inline-block rounded-full bg-white px-5 py-2 text-[13px] font-extrabold shadow-[0_2px_12px_rgba(29,42,34,0.05)]">
            Zamówienie #{order.number} · {isPickup ? "Odbiór osobisty" : "Dostawa"}
          </div>
        </div>

        {/* ETA */}
        <div className="mt-6 rounded-[28px] bg-white p-6 text-center shadow-[0_2px_14px_rgba(29,42,34,0.06)]">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#A79E8C]">
            {isPickup ? "Odbiór około" : "Dostawa około"}
          </div>
          {bigTime ? (
            <div className="my-1 text-[52px] font-bold leading-tight tracking-[-0.03em]">{bigTime}</div>
          ) : (
            <div className="my-3 flex items-center justify-center gap-1.5 py-2">
              <span className="h-2.5 w-2.5 animate-bounce rounded-full [animation-delay:0ms]" style={{ background: INK }} />
              <span className="h-2.5 w-2.5 animate-bounce rounded-full [animation-delay:150ms]" style={{ background: INK, opacity: 0.6 }} />
              <span className="h-2.5 w-2.5 animate-bounce rounded-full [animation-delay:300ms]" style={{ background: INK, opacity: 0.3 }} />
            </div>
          )}
          <div className="text-[13.5px] text-[#6E6759]">{sub}</div>
          <div
            className="mt-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[11.5px] font-extrabold"
            style={{ background: "#F0F4DC", color: "#5B6B2E" }}
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: "#8CA53B" }} />
              <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: "#8CA53B" }} />
            </span>
            Status aktualizuje się na żywo
          </div>
        </div>

        {/* Kroki */}
        <div className="mt-6 rounded-[28px] bg-white p-5 shadow-[0_2px_14px_rgba(29,42,34,0.06)]">
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={s.key}>
                <div className="flex items-center gap-3.5">
                  <div
                    className="flex h-10 w-10 flex-none items-center justify-center rounded-full transition"
                    style={
                      s.now
                        ? { background: LIME, color: INK }
                        : s.done
                          ? { background: INK, color: LIME }
                          : { background: "#F5F1E8", color: "#B9B09D" }
                    }
                  >
                    {s.done && !s.now ? <IconCheck className="h-4.5 w-4.5" /> : <Icon className="h-4.5 w-4.5" />}
                  </div>
                  <div
                    className="text-[14.5px] font-bold"
                    style={{ color: s.done || s.now ? INK : "#B9B09D" }}
                  >
                    {s.label}
                  </div>
                </div>
                {i < steps.length - 1 && <div className="ml-5 h-4 w-0.5 bg-[#EDE6D6]" />}
              </div>
            );
          })}
        </div>

        {/* Szczegóły */}
        <div className="mt-6 rounded-[28px] bg-white p-5 shadow-[0_2px_14px_rgba(29,42,34,0.06)]">
          <div className="mb-2.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#A79E8C]">
            Twoje zamówienie
          </div>
          {order.items.map((it, idx) => (
            <div key={idx} className="flex justify-between gap-3 py-1 text-[13.5px] text-[#6E6759]">
              <span className="min-w-0">
                {it.qty}× {it.name}
                {it.addons.length > 0 && (
                  <span className="text-[#B9B09D]"> · {it.addons.map((a) => a.name).join(", ")}</span>
                )}
              </span>
              <span className="flex-none font-semibold" style={{ color: INK }}>{zl(it.lineTotal)}</span>
            </div>
          ))}
          {order.deliveryFee > 0 && (
            <div className="flex justify-between py-1 text-[13.5px] text-[#6E6759]">
              <span>Dostawa</span>
              <span className="font-semibold" style={{ color: INK }}>{zl(order.deliveryFee)}</span>
            </div>
          )}
          <div className="mt-2 flex items-center justify-between border-t border-dashed border-[#E7DFCE] pt-3">
            <span className="text-[15px] font-extrabold">
              Razem · {order.payment === "cash" ? "gotówka" : order.payment === "card" ? "karta" : "online"}
            </span>
            <span className="text-[17px] font-extrabold">{zl(order.total)}</span>
          </div>
        </div>

        <Link
          href="/menu"
          className="mt-6 flex w-full items-center justify-between rounded-full py-4 pl-7 pr-7 text-[15px] font-bold text-[#F5F1E8] shadow-[0_16px_36px_rgba(29,42,34,0.3)]"
          style={{ background: INK }}
        >
          <span>Wróć do menu</span>
          <IconArrow className="h-4.5 w-4.5" />
        </Link>

        {order.pos.simulated && (
          <p className="mt-4 text-center text-[11px] text-[#B9B09D]">
            Tryb DEMO — zamówienie zasymulowane (POS podłączymy kluczami Dotykački).
          </p>
        )}
      </div>
    </main>
  );
}
