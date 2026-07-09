"use client";

import { useCallback, useEffect, useState } from "react";
import type { Order, OrderStatus } from "@/lib/orders/types";
import type { CallerInfo } from "@/lib/cti";
import { zl } from "@/lib/format";

/* Paleta panelu (ciemna odmiana systemu: ink + limonka) */
const BG = "#161F19";
const CARD = "#1F2A22";
const SUB = "#27342A";
const CREAM = "#F5F1E8";
const MUTED = "#94A294";
const LIME = "#D5E36B";
const ALERT = "#E56A4E";

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

const IconBell = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className}>
    <path d="M6 9.5 a6 6 0 0 1 12 0 c0 5 1.8 6 1.8 6 H4.2 c0 0 1.8 -1 1.8 -6" {...stroke} />
    <path d="M10 19 a2 2 0 0 0 4 0" {...stroke} />
  </svg>
);
const IconPot = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className}>
    <path d="M4.5 11 H19.5 V16 a3.5 3.5 0 0 1 -3.5 3.5 H8 A3.5 3.5 0 0 1 4.5 16 Z" {...stroke} />
    <path d="M3 11 H21 M9 7.5 q1 -1.5 0 -3 M13.5 7.5 q1 -1.5 0 -3" {...stroke} />
  </svg>
);
const IconCal = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className}>
    <rect x="4" y="5.5" width="16" height="15" rx="2.5" {...stroke} />
    <path d="M4 10 H20 M8.5 3.5 V7 M15.5 3.5 V7" {...stroke} />
  </svg>
);
const IconPhone = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className}>
    <path d="M5 4.5 H8.5 L10 9 L7.8 10.8 A12 12 0 0 0 13.2 16.2 L15 14 L19.5 15.5 V19 A1.8 1.8 0 0 1 17.5 20.8 A16 16 0 0 1 3.2 6.5 A1.8 1.8 0 0 1 5 4.5 Z" {...stroke} />
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
const IconClock = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className}>
    <circle cx="12" cy="12" r="8.5" {...stroke} /><path d="M12 7.5 V12 L15 14" {...stroke} />
  </svg>
);
const IconBox = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className}>
    <path d="M4 8 L12 4 L20 8 V16 L12 20 L4 16 Z M4 8 L12 12 L20 8 M12 12 V20" {...stroke} />
  </svg>
);

function clock(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function PanelPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [now, setNow] = useState("--:--");
  const [caller, setCaller] = useState<CallerInfo | null>(null);
  const [simPhone, setSimPhone] = useState("");

  // Bramka PIN.
  const [authReady, setAuthReady] = useState(false);
  const [needPin, setNeedPin] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);

  useEffect(() => {
    fetch("/api/staff/check")
      .then((r) => r.json())
      .then((d) => {
        setNeedPin(Boolean(d.required) && !d.authed);
        setAuthReady(true);
      })
      .catch(() => setAuthReady(true));
  }, []);

  const submitPin = async () => {
    setPinError(false);
    const res = await fetch("/api/staff/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    if (res.ok) {
      setNeedPin(false);
      setPin("");
    } else {
      setPinError(true);
    }
  };

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/orders", { cache: "no-store" });
      const data = await res.json();
      setOrders(data.orders ?? []);
    } catch {
      /* kolejny tick */
    }
  }, []);

  useEffect(() => {
    setNow(clock());
    refresh();
    const t = setInterval(() => {
      setNow(clock());
      refresh();
    }, 3000);
    return () => clearInterval(t);
  }, [refresh]);

  const setEta = async (id: string, minutes: number) => {
    await fetch(`/api/orders/${id}/eta`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ minutes }),
    });
    refresh();
  };
  const advance = async (id: string, status: OrderStatus) => {
    await fetch(`/api/orders/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    refresh();
  };

  const simulateCall = async () => {
    const phone = simPhone.trim() || orders[0]?.customer.phone || "500134092";
    const res = await fetch(`/api/cti/lookup?phone=${encodeURIComponent(phone)}`);
    setCaller(await res.json());
  };

  const news = orders.filter((o) => o.status === "new");
  const prog = orders.filter((o) => ["in_progress", "ready", "on_delivery"].includes(o.status));
  const sched = orders.filter((o) => o.status === "scheduled");

  if (!authReady) {
    return (
      <main className="grid min-h-screen place-items-center text-sm font-semibold" style={{ background: BG, color: MUTED }}>
        Ładowanie…
      </main>
    );
  }

  if (needPin) {
    return (
      <main className="grid min-h-screen place-items-center px-6" style={{ background: BG, color: CREAM }}>
        <div className="w-full max-w-xs text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/icon-white.png" alt="Mammarosa" className="mx-auto mb-5 h-14 w-14 object-contain" />
          <h1 className="text-lg font-bold tracking-[-0.01em]">Panel obsługi</h1>
          <p className="mb-6 mt-1 text-sm" style={{ color: MUTED }}>
            Podaj PIN, aby zobaczyć zamówienia.
          </p>
          <input
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitPin()}
            placeholder="PIN"
            className="w-full rounded-2xl px-4 py-3.5 text-center text-lg tracking-[0.4em] outline-none placeholder:tracking-normal"
            style={{ background: CARD, color: CREAM, border: "1px solid rgba(245,241,232,0.1)" }}
          />
          {pinError && <p className="mt-2 text-sm font-semibold" style={{ color: ALERT }}>Błędny PIN — spróbuj ponownie.</p>}
          <button
            onClick={submitPin}
            className="mt-4 w-full rounded-full px-4 py-3.5 text-[15px] font-bold"
            style={{ background: LIME, color: "#1D2A22" }}
          >
            Wejdź
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen" style={{ background: BG, color: CREAM }}>
      {/* Pasek górny */}
      <div
        className="flex h-16 items-center justify-between px-5"
        style={{ background: CARD, borderBottom: "1px solid rgba(245,241,232,0.07)" }}
      >
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/icon-white.png" alt="" className="h-9 w-9 object-contain" />
          <div>
            <div className="text-[13px] font-semibold uppercase tracking-[0.18em]">Mammarosa</div>
            <div className="text-[11px]" style={{ color: MUTED }}>Panel zamówień</div>
          </div>
        </div>
        <div className="flex items-center gap-2.5 text-sm">
          <span
            className="flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold"
            style={{ background: SUB }}
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: LIME }} />
              <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: LIME }} />
            </span>
            POS online
          </span>
          <span className="flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold" style={{ background: SUB }}>
            <IconBox className="h-4 w-4"/> {orders.length}
          </span>
          <span className="rounded-full px-3.5 py-1.5 font-mono text-[15px] font-bold tabular-nums" style={{ background: SUB }}>
            {now}
          </span>
        </div>
      </div>

      {/* CTI */}
      <div className="px-4 pt-3.5">
        {caller ? (
          <div
            className="flex items-center gap-3.5 rounded-2xl px-4 py-3"
            style={{ background: SUB, border: `1.5px solid ${LIME}55` }}
          >
            <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full" style={{ background: LIME, color: "#1D2A22" }}>
              <IconPhone className="h-5 w-5" />
            </div>
            <div className="min-w-0 text-sm">
              <b>Połączenie · {caller.phone}</b>
              <div className="truncate" style={{ color: MUTED }}>
                {caller.known
                  ? `${caller.name} · ${caller.orderCount} zamówień${caller.lastItems?.length ? ` · ostatnio: ${caller.lastItems.join(", ")}` : ""}`
                  : "nieznany numer — nowy klient"}
              </div>
            </div>
            <button onClick={() => setCaller(null)} className="ml-auto flex-none text-sm font-semibold" style={{ color: MUTED }}>
              zamknij ✕
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2.5 rounded-2xl px-4 py-2.5 text-sm" style={{ background: CARD }}>
            <span className="flex items-center gap-2 font-semibold" style={{ color: MUTED }}>
              <IconPhone className="h-4 w-4" /> CTI (demo):
            </span>
            <input
              value={simPhone}
              onChange={(e) => setSimPhone(e.target.value)}
              placeholder="numer telefonu"
              className="w-40 rounded-full px-3.5 py-1.5 text-sm outline-none"
              style={{ background: SUB, color: CREAM }}
            />
            <button
              onClick={simulateCall}
              className="rounded-full px-4 py-1.5 text-[13px] font-bold"
              style={{ background: LIME, color: "#1D2A22" }}
            >
              Symuluj połączenie
            </button>
            <span className="text-[11px]" style={{ color: "#5E6B5E" }}>
              docelowo: webhook centralki / aplikacja na Androidzie
            </span>
          </div>
        )}
      </div>

      {/* Kolumny */}
      <div className="grid grid-cols-1 gap-3.5 p-4 md:grid-cols-3">
        <Column icon={<IconBell className="h-4 w-4" />} title="Nowe — ustaw czas" count={news.length} accent>
          {news.map((o) => (
            <OrderCard key={o.id} order={o} highlight>
              <div className="mt-3 flex items-center gap-1.5">
                <span className="text-[11px] font-semibold" style={{ color: MUTED }}>Gotowe za:</span>
                {(o.mode === "pickup" ? [15, 20, 30, 45] : [30, 45, 60, 75]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setEta(o.id, m)}
                    className="flex-1 rounded-full py-2.5 text-[14px] font-bold transition hover:opacity-90"
                    style={{ background: "rgba(245,241,232,0.08)", border: "1px solid rgba(245,241,232,0.14)", color: CREAM }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = LIME; e.currentTarget.style.color = "#1D2A22"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(245,241,232,0.08)"; e.currentTarget.style.color = CREAM; }}
                  >
                    {m}&#39;
                  </button>
                ))}
              </div>
            </OrderCard>
          ))}
          {news.length === 0 && <Empty />}
        </Column>

        <Column icon={<IconPot className="h-4 w-4" />} title="W realizacji" count={prog.length}>
          {prog.map((o) => (
            <OrderCard key={o.id} order={o}>
              <div
                className="mt-3 flex items-center gap-2.5 rounded-xl px-3.5 py-2.5"
                style={{ background: "rgba(213,227,107,0.09)", border: "1px solid rgba(213,227,107,0.25)" }}
              >
                <IconClock className="h-4.5 w-4.5" />
                <span className="text-[17px] font-extrabold tabular-nums" style={{ color: LIME }}>
                  {o.etaAt ? clock(o.etaAt) : o.scheduledTime}
                </span>
              </div>
              <StatusButtons order={o} onAdvance={advance} />
            </OrderCard>
          ))}
          {prog.length === 0 && <Empty />}
        </Column>

        <Column icon={<IconCal className="h-4 w-4" />} title="Na godzinę" count={sched.length}>
          {sched.map((o) => (
            <OrderCard key={o.id} order={o}>
              <div className="mt-3 text-[13px]" style={{ color: MUTED }}>
                Zaplanowane na <b style={{ color: LIME }}>{o.scheduledTime}</b>
              </div>
              <StatusButtons order={o} onAdvance={advance} />
            </OrderCard>
          ))}
          {sched.length === 0 && <Empty />}
        </Column>
      </div>
    </main>
  );
}

/* ---------- Komponenty ---------- */

function Column({
  icon,
  title,
  count,
  accent,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-3xl p-3.5" style={{ background: CARD }}>
      <h2
        className="mb-3 flex items-center gap-2 px-1 text-[11px] font-extrabold uppercase tracking-[0.14em]"
        style={{ color: accent ? LIME : MUTED }}
      >
        {icon}
        {title}
        <span className="rounded-full px-2 py-0.5 text-[11px]" style={{ background: SUB, color: CREAM }}>{count}</span>
      </h2>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}

function Empty() {
  return (
    <div
      className="rounded-2xl py-7 text-center text-sm"
      style={{ border: "1.5px dashed rgba(245,241,232,0.12)", color: "#5E6B5E" }}
    >
      brak zamówień
    </div>
  );
}

function Badge({ children, tone }: { children: React.ReactNode; tone: "alert" | "info" | "lime" }) {
  const style =
    tone === "alert"
      ? { background: "rgba(229,106,78,0.16)", color: "#F0937C", border: "1px solid rgba(229,106,78,0.35)" }
      : tone === "lime"
        ? { background: "rgba(213,227,107,0.12)", color: LIME, border: "1px solid rgba(213,227,107,0.3)" }
        : { background: "rgba(245,241,232,0.07)", color: CREAM, border: "1px solid rgba(245,241,232,0.14)" };
  return (
    <span className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-extrabold uppercase tracking-wide" style={style}>
      {children}
    </span>
  );
}

function OrderCard({
  order,
  highlight,
  children,
}: {
  order: Order;
  highlight?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-2xl p-3.5"
      style={{
        background: SUB,
        border: highlight ? `1.5px solid ${LIME}66` : "1px solid rgba(245,241,232,0.07)",
        boxShadow: highlight ? `0 0 0 3px ${LIME}1f` : undefined,
      }}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-[16px] font-extrabold tabular-nums">#{order.number}</div>
        <div className="flex flex-wrap justify-end gap-1.5">
          {order.timeMode === "asap" && order.status === "new" && <Badge tone="alert">ASAP</Badge>}
          <Badge tone="info">
            {order.mode === "pickup" ? <IconBag className="h-3 w-3" /> : <IconTruck className="h-3 w-3" />}
            {order.mode === "pickup" ? "Odbiór" : "Dostawa"}
          </Badge>
          <Badge tone="lime">na wynos</Badge>
        </div>
      </div>
      <div className="text-[14px] font-bold">{order.customer.name}</div>
      <div className="mb-2.5 text-[12px]" style={{ color: MUTED }}>
        {order.customer.phone}
        {order.mode === "delivery" && order.customer.street
          ? ` · ${order.customer.street}, ${order.customer.city ?? ""}`
          : " · odbiór osobisty"}
      </div>
      <div
        className="space-y-0.5 pt-2.5 text-[12.5px] leading-relaxed"
        style={{ borderTop: "1px dashed rgba(245,241,232,0.12)", color: "#C9D0C4" }}
      >
        {order.items.map((it, i) => (
          <div key={i}>
            <span className="font-extrabold" style={{ color: LIME }}>{it.qty}×</span> {it.name}
            {it.addons.length > 0 && (
              <span style={{ color: MUTED }}> · {it.addons.map((a) => a.name).join(", ")}</span>
            )}
          </div>
        ))}
      </div>
      <div className="mt-2.5 flex items-center justify-between">
        <div className="text-[15px] font-extrabold">{zl(order.total)}</div>
        <div className="text-[12px] font-semibold" style={{ color: MUTED }}>
          {order.payment === "cash" ? "gotówka" : order.payment === "card" ? "karta" : "online"}
        </div>
      </div>
      {children}
    </div>
  );
}

function StatusButtons({ order, onAdvance }: { order: Order; onAdvance: (id: string, s: OrderStatus) => void }) {
  const next: { label: string; status: OrderStatus }[] = [];
  if (order.status === "in_progress" || order.status === "scheduled") {
    next.push(
      order.mode === "pickup"
        ? { label: "Gotowe do odbioru", status: "ready" }
        : { label: "Gotowe — wydaj kierowcy", status: "ready" }
    );
  }
  if (order.status === "ready") {
    next.push(
      order.mode === "pickup"
        ? { label: "Odebrane ✓", status: "completed" }
        : { label: "W drodze", status: "on_delivery" }
    );
  }
  if (order.status === "on_delivery") next.push({ label: "Dostarczone ✓", status: "completed" });
  if (next.length === 0) return null;
  return (
    <div className="mt-2.5 flex gap-2">
      {next.map((n) => (
        <button
          key={n.status}
          onClick={() => onAdvance(order.id, n.status)}
          className="flex-1 rounded-full py-2.5 text-[12.5px] font-bold transition hover:opacity-90"
          style={{ background: "rgba(213,227,107,0.12)", border: "1px solid rgba(213,227,107,0.3)", color: LIME }}
        >
          {n.label}
        </button>
      ))}
    </div>
  );
}
