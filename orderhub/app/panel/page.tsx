"use client";

import { useCallback, useEffect, useState } from "react";
import type { Order, OrderStatus } from "@/lib/orders/types";
import type { CallerInfo } from "@/lib/cti";
import { zl } from "@/lib/format";

function clock(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function PanelPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [now, setNow] = useState("--:--");
  const [caller, setCaller] = useState<CallerInfo | null>(null);
  const [simPhone, setSimPhone] = useState("");

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/orders", { cache: "no-store" });
      const data = await res.json();
      setOrders(data.orders ?? []);
    } catch {
      /* ignore */
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

  const isNew = (o: Order) => o.status === "new";
  const inProgress = (o: Order) =>
    ["in_progress", "ready", "on_delivery"].includes(o.status);
  const scheduled = (o: Order) => o.status === "scheduled";

  const news = orders.filter(isNew);
  const prog = orders.filter(inProgress);
  const sched = orders.filter(scheduled);

  return (
    <main className="min-h-screen bg-[#0f1115] text-[#e7e9ee]">
      {/* Top */}
      <div className="flex h-14 items-center justify-between border-b border-[#262b36] bg-[#171a21] px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#e23b3b] to-[#a01919] text-lg">
            🍕
          </div>
          <div className="font-bold">
            Mamma Rosa <span className="text-sm font-normal text-[#8b93a4]">· Zamówienia online</span>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="flex items-center gap-2 rounded-full bg-[#1d2530] px-3 py-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-green-500" /> POS online
          </span>
          <span className="rounded-full bg-[#1d2530] px-3 py-1.5">📦 {orders.length}</span>
          <span className="font-mono text-base font-semibold tabular-nums">{now}</span>
        </div>
      </div>

      {/* CTI */}
      <div className="px-4 pt-3">
        {caller ? (
          <div className="flex items-center gap-3 rounded-xl border border-[#1f7a3d] bg-gradient-to-r from-[#13351f] to-[#0f1115] px-4 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1f7a3d] text-lg">📞</div>
            <div className="text-sm">
              <b>Połączenie · {caller.phone}</b>
              <div className="text-[#9fb0a4]">
                {caller.known
                  ? `${caller.name} · ${caller.orderCount} zamówień${caller.lastItems?.length ? ` · ostatnio: ${caller.lastItems.join(", ")}` : ""}`
                  : "nieznany numer — nowy klient"}
              </div>
            </div>
            <button onClick={() => setCaller(null)} className="ml-auto text-sm text-[#9fb0a4]">
               zamknij ✕
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-xl border border-[#262b36] bg-[#13161c] px-4 py-2.5 text-sm">
            <span className="text-[#8b93a4]">CTI (demo):</span>
            <input
              value={simPhone}
              onChange={(e) => setSimPhone(e.target.value)}
              placeholder="numer telefonu"
              className="w-40 rounded-lg border border-[#2a313e] bg-[#1a1f28] px-3 py-1.5 text-sm outline-none"
            />
            <button
              onClick={simulateCall}
              className="rounded-lg bg-[#1f7a3d] px-3 py-1.5 text-sm font-semibold text-white"
            >
              📞 Symuluj połączenie
            </button>
            <span className="text-xs text-[#5a6678]">
              (docelowo: webhook centralki / apka na Androidzie)
            </span>
          </div>
        )}
      </div>

      {/* Board */}
      <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-3">
        <Column title="🔔 Nowe — ustaw czas" accent="#ffd27a" count={news.length}>
          {news.map((o) => (
            <Card key={o.id} order={o} highlight>
              <EtaButtons order={o} onSet={setEta} />
            </Card>
          ))}
          {news.length === 0 && <Empty />}
        </Column>

        <Column title="👨‍🍳 W realizacji" count={prog.length}>
          {prog.map((o) => (
            <Card key={o.id} order={o}>
              <div className="mt-2 rounded-lg border border-[#2c6b41] bg-[#10261a] px-3 py-2">
                <div className="text-lg font-extrabold text-[#7ee3a3]">⏱ {o.etaAt ? clock(o.etaAt) : o.scheduledTime}</div>
              </div>
              <StatusButtons order={o} onAdvance={advance} />
            </Card>
          ))}
          {prog.length === 0 && <Empty />}
        </Column>

        <Column title="🗓 Na godzinę" count={sched.length}>
          {sched.map((o) => (
            <Card key={o.id} order={o}>
              <div className="mt-2 text-sm text-[#9aa3b4]">
                Zaplanowane na <b className="text-[#ffd27a]">{o.scheduledTime}</b>
              </div>
              <StatusButtons order={o} onAdvance={advance} />
            </Card>
          ))}
          {sched.length === 0 && <Empty />}
        </Column>
      </div>
    </main>
  );
}

function Column({
  title,
  count,
  accent,
  children,
}: {
  title: string;
  count: number;
  accent?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-[#222834] bg-[#13161c] p-3">
      <h2
        className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide"
        style={{ color: accent ?? "#9aa3b4" }}
      >
        {title}
        <span className="rounded-full bg-[#262c38] px-2 text-[#cdd4e0]">{count}</span>
      </h2>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}

function Empty() {
  return <div className="rounded-xl border border-dashed border-[#262c38] py-6 text-center text-sm text-[#5a6678]">—</div>;
}

function Card({
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
      className={`rounded-xl border bg-[#1a1f28] p-3 ${
        highlight ? "border-[#e9a13b] shadow-[0_0_0_2px_rgba(233,161,59,0.22)]" : "border-[#2a313e]"
      }`}
    >
      <div className="mb-1.5 flex items-center justify-between">
        <div className="text-base font-extrabold">#{order.number}</div>
        <div className="flex gap-1.5 text-[11px] font-bold">
          {order.timeMode === "asap" && order.status === "new" && (
            <span className="rounded-md bg-[#3a1414] px-2 py-0.5 text-[#ff9a9a]">ASAP</span>
          )}
          <span className="rounded-md bg-[#13294a] px-2 py-0.5 text-[#7fb6ff]">
            {order.mode === "pickup" ? "🏠 Odbiór" : "🚚 Dostawa"}
          </span>
          <span className="rounded-md bg-[#3a2a12] px-2 py-0.5 text-[#ffc46b]">NA WYNOS</span>
        </div>
      </div>
      <div className="text-sm">
        <b>{order.customer.name}</b>
      </div>
      <div className="mb-2 text-xs text-[#8b93a4]">
        📞 {order.customer.phone}
        {order.mode === "delivery" && order.customer.street ? ` · ${order.customer.street}, ${order.customer.city ?? ""}` : " · odbiór osobisty"}
      </div>
      <div className="border-t border-dashed border-[#2c333f] pt-2 text-xs leading-relaxed text-[#c6cdd9]">
        {order.items.map((it, i) => (
          <div key={i}>
            <span className="font-bold text-[#ffd27a]">{it.qty}×</span> {it.name}
            {it.addons.length > 0 && (
              <span className="text-[#8b93a4]"> ({it.addons.map((a) => a.name).join(", ")})</span>
            )}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between">
        <div className="font-extrabold">{zl(order.total)}</div>
        <div className="text-xs text-[#9aa3b4]">
          {order.payment === "cash" ? "💵 gotówka" : order.payment === "card" ? "💳 karta" : "🌐 online"}
        </div>
      </div>
      {children}
    </div>
  );
}

function EtaButtons({ order, onSet }: { order: Order; onSet: (id: string, m: number) => void }) {
  const opts = order.mode === "pickup" ? [15, 20, 30, 45] : [30, 45, 60, 75];
  return (
    <div className="mt-3 flex items-center gap-1.5">
      <span className="text-[11px] text-[#9aa3b4]">Gotowe za:</span>
      {opts.map((m) => (
        <button
          key={m}
          onClick={() => onSet(order.id, m)}
          className="flex-1 rounded-lg border border-[#38424f] bg-[#222a36] py-2 text-sm font-bold hover:border-[#e23b3b] hover:bg-[#e23b3b]"
        >
          {m}&#39;
        </button>
      ))}
    </div>
  );
}

function StatusButtons({ order, onAdvance }: { order: Order; onAdvance: (id: string, s: OrderStatus) => void }) {
  const next: { label: string; status: OrderStatus }[] = [];
  if (order.status === "in_progress" || order.status === "scheduled") {
    next.push(
      order.mode === "pickup"
        ? { label: "Gotowe do odbioru", status: "ready" }
        : { label: "Gotowe / wydaj kierowcy", status: "ready" }
    );
  }
  if (order.status === "ready") {
    next.push(
      order.mode === "pickup"
        ? { label: "Odebrane ✓", status: "completed" }
        : { label: "W drodze 🛵", status: "on_delivery" }
    );
  }
  if (order.status === "on_delivery") next.push({ label: "Dostarczone ✓", status: "completed" });

  if (next.length === 0) return null;
  return (
    <div className="mt-2 flex gap-1.5">
      {next.map((n) => (
        <button
          key={n.status}
          onClick={() => onAdvance(order.id, n.status)}
          className="flex-1 rounded-lg border border-[#2c6b41] bg-[#10261a] py-2 text-xs font-bold text-[#7ee3a3] hover:bg-[#15321f]"
        >
          {n.label}
        </button>
      ))}
    </div>
  );
}
