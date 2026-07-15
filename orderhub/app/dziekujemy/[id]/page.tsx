"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { Order } from "@/lib/orders/types";
import { zl } from "@/lib/format";
import { C } from "@/lib/carta";

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
      <main className="grid min-h-screen place-items-center px-6" style={{ background: C.ivory, color: C.ink }}>
        <div className="text-center">
          <div className="font-carta text-[30px] italic">Nie znaleziono zamówienia</div>
          <Link
            href="/menu"
            className="mt-7 inline-block border-b pb-1 text-[10px] uppercase tracking-[0.24em]"
            style={{ color: C.accent, borderColor: C.accent, textIndent: "0.24em" }}
          >
            ← Wróć do menu
          </Link>
        </div>
      </main>
    );
  }

  if (!order) {
    return (
      <main
        className="grid min-h-screen place-items-center text-[11px] uppercase tracking-[0.24em]"
        style={{ background: C.ivory, color: C.faint }}
      >
        Ładowanie…
      </main>
    );
  }

  const isPickup = order.mode === "pickup";
  const firstName = order.customer.name.split(" ")[0] || "";

  // Zamówienie anulowane przez obsługę — jasny komunikat zamiast „czekamy na czas".
  if (order.status === "canceled") {
    return (
      <main className="min-h-screen pb-16" style={{ background: C.ivory, color: C.ink }}>
        <div className="mx-auto max-w-[430px] px-[26px] text-center min-[700px]:max-w-[520px]">
          <div className="pt-16">
            <h1 className="font-carta text-[40px] italic">Zamówienie anulowane</h1>
            <div className="mt-2.5 text-[11px] uppercase tracking-[0.2em]" style={{ color: C.muted, textIndent: "0.2em" }}>
              Zamówienie nr {order.number}
            </div>
            <div
              className="mt-9 border px-6 py-6 text-[13.5px] leading-relaxed"
              style={{ borderColor: C.accent, color: C.ink, background: "rgba(142,59,47,0.05)" }}
            >
              Przepraszamy — Twoje zamówienie zostało anulowane
              {order.cancelReason ? <> (powód: <b>{order.cancelReason.toLowerCase()}</b>)</> : null}.
              <br />
              Jeśli to pomyłka albo chcesz zamówić ponownie, zadzwoń:{" "}
              <a href="tel:586865530" className="font-bold underline underline-offset-2" style={{ color: C.accent }}>
                58 686 55 30
              </a>
            </div>
            <Link
              href="/menu"
              className="mt-8 inline-block border-b pb-1 text-[10px] uppercase tracking-[0.24em]"
              style={{ color: C.accent, borderColor: C.accent, textIndent: "0.24em" }}
            >
              ← Zamów ponownie
            </Link>
          </div>
        </div>
      </main>
    );
  }
  const scheduled = order.timeMode === "scheduled";
  const etaKnown = !!order.etaAt;
  const bigTime = scheduled ? (order.scheduledTime ?? "—") : etaKnown ? fmtTime(order.etaAt) : null;
  const sub = scheduled
    ? isPickup
      ? "odbiór o wybranej godzinie"
      : "dostawa o wybranej godzinie"
    : etaKnown
      ? `około ${order.etaMinutes} minut · potwierdzone przez obsługę`
      : "obsługa potwierdza czas przygotowania…";

  const steps = [
    { key: "accepted", label: "Zamówienie przyjęte", done: true, now: false },
    {
      key: "prep",
      label: "W przygotowaniu",
      done: ["in_progress", "ready", "on_delivery", "completed"].includes(order.status),
      now: order.status === "in_progress" || (scheduled && order.status === "scheduled"),
    },
    {
      key: "way",
      label: isPickup ? "Gotowe do odbioru" : "W drodze do Ciebie",
      done: ["ready", "on_delivery", "completed"].includes(order.status),
      now: order.status === "ready" || order.status === "on_delivery",
    },
    {
      key: "done",
      label: isPickup ? "Odebrane" : "Dostarczone",
      done: order.status === "completed",
      now: false,
    },
  ];

  return (
    <main className="min-h-screen pb-16" style={{ background: C.ivory, color: C.ink }}>
      <div className="mx-auto max-w-[430px] px-[26px] min-[700px]:max-w-[520px]">
        <div className="pt-16 text-center">
          <h1 className="font-carta text-[44px] italic">Dziękujemy{firstName ? `, ${firstName}` : ""}.</h1>
          <div
            className="mt-2.5 text-[11px] uppercase tracking-[0.2em]"
            style={{ color: C.muted, textIndent: "0.2em" }}
          >
            Zamówienie nr {order.number} · przyjęte
          </div>

          {/* ETA */}
          <div className="mt-9 border-b border-t py-[26px]" style={{ borderColor: C.hairline }}>
            <div className="text-[9.5px] tracking-[0.32em]" style={{ color: C.muted, textIndent: "0.32em" }}>
              {isPickup ? "ODBIÓR OKOŁO" : "DOSTAWA OKOŁO"}
            </div>
            {bigTime ? (
              <div className="font-carta mt-2 text-[58px] leading-tight">{bigTime}</div>
            ) : (
              <div className="mt-5 flex items-center justify-center gap-2 py-4">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: C.muted }} />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full [animation-delay:200ms]" style={{ background: C.muted }} />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full [animation-delay:400ms]" style={{ background: C.muted }} />
              </div>
            )}
            <div className="mt-1.5 text-[11px]" style={{ color: C.muted }}>{sub}</div>
          </div>

          {/* Kroki */}
          <div className="mt-8 text-left">
            {steps.map((s) => (
              <div key={s.key} className="flex items-center gap-4 py-[11px]">
                <span
                  className="h-[11px] w-[11px] flex-none rounded-full border transition-all duration-400"
                  style={{
                    borderColor: s.now ? C.accent : s.done ? C.ink : C.leader,
                    background: s.now ? C.accent : s.done ? C.ink : "transparent",
                  }}
                />
                <span
                  className="text-[12.5px] tracking-[0.06em]"
                  style={{ color: s.done || s.now ? C.ink : C.faint }}
                >
                  {s.label}
                </span>
              </div>
            ))}
          </div>

          {/* Pozycje */}
          <div className="mt-8 border-t pt-5 text-left" style={{ borderColor: C.hairline }}>
            {order.items.map((it, idx) => (
              <div key={idx} className="flex items-baseline py-1.5">
                <span className="min-w-0 text-[12px]" style={{ color: C.muted }}>
                  {it.qty} × {it.name}
                  {it.addons.length > 0 ? ` (${it.addons.map((a) => a.name).join(", ")})` : ""}
                </span>
                <span className="mx-2.5 flex-1 -translate-y-[3px] border-b border-dotted" style={{ borderColor: C.leader }} />
                <span className="font-carta whitespace-nowrap text-[14px]">{zl(it.lineTotal)}</span>
              </div>
            ))}
            {order.deliveryFee > 0 && (
              <div className="flex items-baseline py-1.5">
                <span className="text-[12px]" style={{ color: C.muted }}>Dostawa</span>
                <span className="mx-2.5 flex-1 -translate-y-[3px] border-b border-dotted" style={{ borderColor: C.leader }} />
                <span className="font-carta whitespace-nowrap text-[14px]">{zl(order.deliveryFee)}</span>
              </div>
            )}
            <div className="flex items-baseline pt-3">
              <span className="text-[10px] uppercase tracking-[0.26em]" style={{ textIndent: "0.26em" }}>
                Razem · {order.payment === "cash" ? "gotówka" : order.payment === "card" ? "karta" : "online"}
              </span>
              <span className="mx-3 flex-1 -translate-y-[3px] border-b border-dotted" style={{ borderColor: C.leader }} />
              <span className="font-carta text-[19px]">{zl(order.total)}</span>
            </div>
          </div>

          <div
            className="mt-8 text-[9px] tracking-[0.22em]"
            style={{ color: C.faint, textIndent: "0.22em" }}
          >
            STATUS AKTUALIZUJE SIĘ NA ŻYWO{order.pos.simulated ? " · TRYB DEMO" : ""}
          </div>

          <Link
            href="/menu"
            className="mt-6 inline-block text-[10px] uppercase tracking-[0.24em]"
            style={{ color: C.muted, textIndent: "0.24em" }}
          >
            ← Wróć do menu
          </Link>
        </div>
      </div>
    </main>
  );
}
