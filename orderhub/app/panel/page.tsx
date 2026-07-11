"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Order, OrderStatus } from "@/lib/orders/types";
import type { CallerInfo } from "@/lib/cti";
import { zl } from "@/lib/format";

/* Paleta panelu (jasna, spójna z CARTĄ: kość słoniowa + atrament + oliwka) */
const BG = "#F7F3EB";       // tło strony
const CARD = "#FFFEFA";     // karty/kolumny (papier)
const SUB = "#F1EBDD";      // wewnętrzne kafle
const CREAM = "#1B1710";    // główny kolor tekstu (atrament)
const MUTED = "#7A7060";
const LIME = "#D5E36B";     // aktywne przyciski (z atramentowym tekstem)
const OLIVE = "#5B6B2E";    // czytelna "limonka" na jasnym tle (teksty/akcenty)
const ALERT = "#B7382F";

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

const IconBell = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className}>
    <path d="M6 9.5 a6 6 0 0 1 12 0 c0 5 1.8 6 1.8 6 H4.2 c0 0 1.8 -1 1.8 -6" {...stroke} />
    <path d="M10 19 a2 2 0 0 0 4 0" {...stroke} />
  </svg>
);
const IconBellOff = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className}>
    <path d="M6 9.5 a6 6 0 0 1 12 0 c0 5 1.8 6 1.8 6 H4.2 c0 0 1.8 -1 1.8 -6" {...stroke} />
    <path d="M10 19 a2 2 0 0 0 4 0 M4 4 L20 20" {...stroke} />
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
const IconPin = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className}>
    <path d="M12 21 C12 21 5 14.6 5 9.8 A7 7 0 0 1 19 9.8 C19 14.6 12 21 12 21 Z" {...stroke} />
    <circle cx="12" cy="9.8" r="2.6" {...stroke} />
  </svg>
);
const IconHistory = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className}>
    <path d="M4 12 a8 8 0 1 1 2.3 5.7 M4 12 L4 7 M4 12 L8.5 11" {...stroke} />
    <path d="M12 8 V12 L14.8 13.8" {...stroke} />
  </svg>
);
const IconExpand = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className}>
    <path d="M9 4 H4 V9 M15 4 H20 V9 M9 20 H4 V15 M15 20 H20 V15" {...stroke} />
  </svg>
);
const IconPrint = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className}>
    <path d="M7 8 V4 H17 V8 M7 16 H5 A1.5 1.5 0 0 1 3.5 14.5 V9.5 A1.5 1.5 0 0 1 5 8 H19 A1.5 1.5 0 0 1 20.5 9.5 V14.5 A1.5 1.5 0 0 1 19 16 H17 M7 13 H17 V20 H7 Z" {...stroke} />
  </svg>
);
const IconUndo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className}>
    <path d="M8.5 5.5 L4 10 L8.5 14.5 M4 10 H14 A6 6 0 0 1 14 22 H10" {...stroke} />
  </svg>
);

function clock(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function minutesSince(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
}
function isToday(iso: string): boolean {
  const d = new Date(iso);
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}

/* ---------- Dźwięk nowego zamówienia (Web Audio — bez plików) ---------- */
let audioCtx: AudioContext | null = null;
function ensureAudio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    audioCtx = new AC();
  }
  if (audioCtx.state === "suspended") void audioCtx.resume();
  return audioCtx;
}
function playDing() {
  const ctx = ensureAudio();
  if (!ctx) return;
  const seq = [
    { f: 880, t: 0, d: 0.18 },
    { f: 1174.7, t: 0.2, d: 0.28 },
    { f: 880, t: 0.62, d: 0.18 },
    { f: 1174.7, t: 0.82, d: 0.34 },
  ];
  for (const n of seq) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = n.f;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime + n.t);
    gain.gain.exponentialRampToValueAtTime(0.32, ctx.currentTime + n.t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + n.t + n.d);
    osc.connect(gain).connect(ctx.destination);
    osc.start(ctx.currentTime + n.t);
    osc.stop(ctx.currentTime + n.t + n.d + 0.05);
  }
}

const CANCEL_REASONS = ["Klient odwołał", "Brak składników", "Błędne zamówienie", "Inny powód"];

/** Minuty do godziny "HH:MM" (dzisiaj). Ujemne = już po czasie. */
function minutesToScheduled(time?: string): number | null {
  if (!time) return null;
  const [h, m] = time.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return Math.round((d.getTime() - Date.now()) / 60000);
}
/** Ile minut przed godziną trzeba zacząć przygotowanie. */
function startLead(order: Order): number {
  return order.mode === "delivery" ? 40 : 25;
}
function dateInputValue(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function sameDay(iso: string, dayValue: string): boolean {
  return dateInputValue(new Date(iso)) === dayValue;
}

/** Kwit kuchenny — czarno-biały wydruk (szerokość ~72 mm, jak drukarki paragonowe). */
function printOrder(order: Order) {
  const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const items = order.items
    .map((it) => {
      const addons = it.addons.length
        ? `<div class="ad">${it.addons.map((a) => `+ ${esc(a.name)}`).join("<br>")}</div>`
        : "";
      return `<div class="it"><b>${it.qty}×</b> ${esc(it.name)}${addons}</div>`;
    })
    .join("");
  const when =
    order.timeMode === "scheduled"
      ? `NA GODZINĘ: ${order.scheduledTime}`
      : order.etaAt
        ? `GOTOWE NA: ${clock(order.etaAt)}`
        : "ASAP — czas nieustawiony";
  const addr =
    order.mode === "delivery"
      ? `${esc(order.customer.street ?? "")}, ${esc(order.customer.city ?? "")}`
      : "ODBIÓR OSOBISTY";
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Kwit #${order.number}</title>
<style>
  body { font-family: 'Courier New', monospace; color: #000; width: 72mm; margin: 0 auto; padding: 4mm; font-size: 12px; }
  .c { text-align: center; }
  h1 { font-size: 15px; letter-spacing: 4px; margin: 0; }
  .big { font-size: 20px; font-weight: bold; margin: 2mm 0; }
  hr { border: none; border-top: 1px dashed #000; margin: 2.5mm 0; }
  .it { margin: 1.2mm 0; font-size: 13px; }
  .ad { padding-left: 6mm; font-size: 11.5px; }
  .note { border: 1.5px solid #000; padding: 2mm; margin: 2mm 0; font-weight: bold; }
  .row { display: flex; justify-content: space-between; }
</style></head><body>
  <div class="c"><h1>MAMMAROSA</h1><div>kwit kuchenny</div>
  <div class="big">#${order.number} · ${order.mode === "delivery" ? "DOSTAWA" : "ODBIÓR"}</div>
  <div><b>${when}</b></div><div>przyjęte ${clock(order.createdAt)}</div></div>
  <hr>${items}<hr>
  ${order.customer.note ? `<div class="note">UWAGI: ${esc(order.customer.note)}</div>` : ""}
  <div>${esc(order.customer.name)} · tel. ${esc(order.customer.phone)}</div>
  <div>${addr}</div>
  <hr>
  <div class="row"><b>RAZEM</b><b>${zl(order.total)}</b></div>
  <div class="row"><span>płatność</span><span>${order.payment === "cash" ? "GOTÓWKA" : order.payment === "card" ? "KARTA" : "OPŁACONE ONLINE"}</span></div>
</body></html>`;
  const w = window.open("", "_blank", "width=420,height=640");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); w.close(); }, 250);
}

/* ============================================================ */

export default function PanelPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [now, setNow] = useState("--:--");
  const [caller, setCaller] = useState<CallerInfo | null>(null);
  const [simPhone, setSimPhone] = useState("");
  const [view, setView] = useState<"board" | "history">("board");
  const [soundOn, setSoundOn] = useState(false);
  const [staffName, setStaffName] = useState<string>("");
  const knownIds = useRef<Set<string> | null>(null);
  const remindedIds = useRef<Set<string>>(new Set());
  const [pos, setPos] = useState<{ mode: string; ok: boolean } | null>(null);
  const baseTitle = useRef("Mammarosa — panel");

  // Bramka PIN.
  const [authReady, setAuthReady] = useState(false);
  const [needPin, setNeedPin] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);

  useEffect(() => {
    setSoundOn(localStorage.getItem("mr_sound") === "1");
    setStaffName(localStorage.getItem("mr_staff") ?? "");
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
      const d = await res.json().catch(() => ({}));
      if (d?.name) {
        setStaffName(d.name);
        localStorage.setItem("mr_staff", d.name);
      }
      setNeedPin(false);
      setPin("");
    } else {
      setPinError(true);
    }
  };

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    localStorage.setItem("mr_sound", next ? "1" : "0");
    if (next) playDing(); // gest użytkownika odblokowuje audio + od razu słychać próbkę
  };

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/orders", { cache: "no-store" });
      const data = await res.json();
      const list: Order[] = data.orders ?? [];
      setOrders(list);
      // Wykrycie nowych zamówień → dźwięk (pierwsze pobranie tylko zapamiętuje stan).
      const ids = new Set(list.map((o) => o.id));
      if (knownIds.current) {
        let fresh = false;
        for (const id of ids) if (!knownIds.current.has(id)) fresh = true;
        if (fresh && localStorage.getItem("mr_sound") === "1") playDing();
      }
      knownIds.current = ids;
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

  // Status POS (Dotykačka) — co minutę.
  useEffect(() => {
    const check = () =>
      fetch("/api/dotykacka/health")
        .then((r) => r.json())
        .then((d) => setPos({ mode: d.mode, ok: Boolean(d.ok) }))
        .catch(() => setPos(null));
    check();
    const t = setInterval(check, 60000);
    return () => clearInterval(t);
  }, []);

  // Przypomnienie o "na godzinę": dzwonek, gdy pora zaczynać przygotowanie.
  useEffect(() => {
    for (const o of orders) {
      if (o.status !== "scheduled") continue;
      const left = minutesToScheduled(o.scheduledTime);
      if (left !== null && left <= startLead(o) && !remindedIds.current.has(o.id)) {
        remindedIds.current.add(o.id);
        if (localStorage.getItem("mr_sound") === "1") playDing();
      }
    }
  }, [orders]);

  // Tytuł karty: liczba nowych (miga, żeby przyciągnąć wzrok z innej zakładki).
  const newsCount = orders.filter((o) => o.status === "new").length;
  useEffect(() => {
    if (newsCount === 0) {
      document.title = baseTitle.current;
      return;
    }
    let flip = false;
    const t = setInterval(() => {
      flip = !flip;
      document.title = flip ? `● ${newsCount} NOWE — Mammarosa` : `(${newsCount}) Mammarosa — panel`;
    }, 1200);
    return () => {
      clearInterval(t);
      document.title = baseTitle.current;
    };
  }, [newsCount]);

  const by = staffName || undefined;

  const setEta = async (id: string, minutes: number) => {
    await fetch(`/api/orders/${id}/eta`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ minutes, by }),
    });
    refresh();
  };
  const advance = async (id: string, status: OrderStatus, reason?: string) => {
    await fetch(`/api/orders/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, by, reason }),
    });
    refresh();
  };

  const simulateCall = async () => {
    const phone = simPhone.trim() || orders[0]?.customer.phone || "500134092";
    const res = await fetch(`/api/cti/lookup?phone=${encodeURIComponent(phone)}`);
    setCaller(await res.json());
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen().catch(() => {});
  };

  const news = orders.filter((o) => o.status === "new");
  const prog = orders.filter((o) => ["in_progress", "ready", "on_delivery"].includes(o.status));
  const sched = orders
    .filter((o) => o.status === "scheduled")
    .sort((a, b) => (a.scheduledTime ?? "").localeCompare(b.scheduledTime ?? ""));


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
          <img src="/brand/icon-espresso.png" alt="Mammarosa" className="mx-auto mb-5 h-14 w-14 object-contain" />
          <h1 className="text-lg font-bold tracking-[-0.01em]">Panel obsługi</h1>
          <p className="mb-6 mt-1 text-sm" style={{ color: MUTED }}>
            Wpisz swój kod z Dotykački lub wspólny PIN obsługi.
          </p>
          <input
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitPin()}
            placeholder="PIN"
            className="w-full rounded-2xl px-4 py-3.5 text-center text-lg tracking-[0.4em] outline-none placeholder:tracking-normal"
            style={{ background: CARD, color: CREAM, border: "1px solid rgba(27,23,16,0.14)" }}
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
    <main className="min-h-screen pb-8" style={{ background: BG, color: CREAM }}>
      {/* Pasek górny */}
      <div
        className="sticky top-0 z-40 flex h-16 items-center justify-between gap-2 px-4"
        style={{ background: CARD, borderBottom: "1px solid rgba(27,23,16,0.06)" }}
      >
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/icon-espresso.png" alt="" className="h-9 w-9 object-contain" />
          <div>
            <div className="text-[13px] font-semibold uppercase tracking-[0.18em]">Mammarosa</div>
            <div className="text-[11px]" style={{ color: MUTED }}>
              Panel zamówień{staffName ? ` · ${staffName}` : ""}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <TopBtn active={view === "board"} onClick={() => setView("board")}>
            <IconPot className="h-4 w-4" /> Zamówienia
            {newsCount > 0 && (
              <span className="ml-1 rounded-full px-1.5 text-[11px] font-extrabold" style={{ background: ALERT, color: "#fff" }}>
                {newsCount}
              </span>
            )}
          </TopBtn>
          <TopBtn active={view === "history"} onClick={() => setView("history")}>
            <IconHistory className="h-4 w-4" /> Dziś
          </TopBtn>
          <Link
            href="/panel/telefon"
            className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[12.5px] font-bold"
            style={{ background: SUB, color: CREAM }}
          >
            <IconPhone className="h-4 w-4" /> + Telefon
          </Link>
          <TopBtn active={soundOn} onClick={toggleSound} title={soundOn ? "Dźwięk włączony" : "Dźwięk wyłączony"}>
            {soundOn ? <IconBell className="h-4 w-4" /> : <IconBellOff className="h-4 w-4" />}
          </TopBtn>
          <TopBtn onClick={toggleFullscreen} title="Pełny ekran">
            <IconExpand className="h-4 w-4" />
          </TopBtn>
          <span
            className="hidden items-center gap-2 rounded-full px-3.5 py-1.5 text-[12px] font-bold md:flex"
            style={{ background: SUB, color: pos?.mode === "live" && pos.ok ? OLIVE : pos && !pos.ok ? ALERT : MUTED }}
          >
            <span className="inline-flex h-2 w-2 rounded-full" style={{ background: "currentColor" }} />
            {pos ? (pos.mode === "mock" ? "POS: demo" : pos.ok ? "POS: połączono" : "POS: błąd") : "POS: …"}
          </span>
          <span className="hidden rounded-full px-3.5 py-1.5 font-mono text-[15px] font-bold tabular-nums sm:inline" style={{ background: SUB }}>
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
            <Link
              href={`/panel/telefon?phone=${encodeURIComponent(caller.phone)}${caller.name ? `&name=${encodeURIComponent(caller.name)}` : ""}`}
              className="ml-auto flex-none rounded-full px-4 py-2 text-[13px] font-bold"
              style={{ background: LIME, color: "#1D2A22" }}
            >
              Przyjmij zamówienie
            </Link>
            <button onClick={() => setCaller(null)} className="flex-none text-sm font-semibold" style={{ color: MUTED }}>
              ✕
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
          </div>
        )}
      </div>

      {view === "board" ? (
        <div className="grid grid-cols-1 gap-3.5 p-4 md:grid-cols-3">
          <Column icon={<IconBell className="h-4 w-4" />} title="Nowe — ustaw czas" count={news.length} accent>
            {news.map((o) => (
              <OrderCard key={o.id} order={o} highlight onAdvance={advance}>
                <WaitBadge order={o} />
                <EtaPicker order={o} onPick={(m) => setEta(o.id, m)} />
              </OrderCard>
            ))}
            {news.length === 0 && <Empty />}
          </Column>

          <Column icon={<IconPot className="h-4 w-4" />} title="W realizacji" count={prog.length}>
            {prog.map((o) => (
              <OrderCard key={o.id} order={o} onAdvance={advance}>
                <EtaLine order={o} onEta={(m) => setEta(o.id, m)} />
                <StatusButtons order={o} onAdvance={advance} />
              </OrderCard>
            ))}
            {prog.length === 0 && <Empty />}
          </Column>

          <Column icon={<IconCal className="h-4 w-4" />} title="Na godzinę" count={sched.length}>
            {sched.map((o) => {
              const left = minutesToScheduled(o.scheduledTime);
              const due = left !== null && left <= startLead(o);
              return (
                <OrderCard key={o.id} order={o} highlight={due} onAdvance={advance}>
                  <div
                    className="mt-3 flex items-center gap-2.5 rounded-xl px-3.5 py-2.5"
                    style={
                      due
                        ? { background: "rgba(183,56,47,0.07)", border: "1px solid rgba(183,56,47,0.45)" }
                        : { background: "rgba(140,165,59,0.10)", border: "1px solid rgba(140,165,59,0.35)" }
                    }
                  >
                    <IconClock className="h-4.5 w-4.5" />
                    <span className="text-[15px] font-bold">
                      na <b className="text-[17px] font-extrabold tabular-nums" style={{ color: due ? ALERT : OLIVE }}>{o.scheduledTime}</b>
                    </span>
                    {due && (
                      <span className="ml-auto text-[12px] font-extrabold" style={{ color: ALERT }}>
                        {left !== null && left < 0 ? "PO CZASIE!" : `CZAS ZACZĄĆ — za ${left} min`}
                      </span>
                    )}
                  </div>
                  <StatusButtons order={o} onAdvance={advance} />
                </OrderCard>
              );
            })}
            {sched.length === 0 && <Empty />}
          </Column>
        </div>
      ) : (
        <HistoryView orders={orders} />
      )}
    </main>
  );
}

/* ---------- Klocki ---------- */

function TopBtn({
  children,
  onClick,
  active,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[12.5px] font-bold transition"
      style={active ? { background: LIME, color: "#1D2A22" } : { background: SUB, color: CREAM }}
    >
      {children}
    </button>
  );
}

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
    <div className="flex flex-col rounded-3xl p-3.5" style={{ background: CARD, border: "1px solid #EAE2D2", boxShadow: "0 2px 14px rgba(27,23,16,0.05)" }}>
      <h2
        className="mb-3 flex items-center gap-2 px-1 text-[11px] font-extrabold uppercase tracking-[0.14em]"
        style={{ color: accent ? OLIVE : MUTED }}
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
      style={{ border: "1.5px dashed rgba(27,23,16,0.13)", color: "#A99D87" }}
    >
      brak zamówień
    </div>
  );
}

function Badge({ children, tone }: { children: React.ReactNode; tone: "alert" | "info" | "lime" }) {
  const style =
    tone === "alert"
      ? { background: "rgba(183,56,47,0.09)", color: ALERT, border: "1px solid rgba(183,56,47,0.35)" }
      : tone === "lime"
        ? { background: "rgba(140,165,59,0.12)", color: LIME, border: "1px solid rgba(140,165,59,0.45)" }
        : { background: "rgba(27,23,16,0.06)", color: CREAM, border: "1px solid rgba(27,23,16,0.16)" };
  return (
    <span className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-extrabold uppercase tracking-wide" style={style}>
      {children}
    </span>
  );
}

/** Ile czeka nowe zamówienie (czerwienieje po 5 min). */
function WaitBadge({ order }: { order: Order }) {
  const [, force] = useState(0);
  useEffect(() => {
    const t = setInterval(() => force((x) => x + 1), 30000);
    return () => clearInterval(t);
  }, []);
  const m = minutesSince(order.createdAt);
  return (
    <div className="mt-2 text-[12px] font-bold" style={{ color: m >= 5 ? ALERT : MUTED }}>
      czeka {m} min {m >= 5 ? "— klient patrzy na zegarek!" : ""}
    </div>
  );
}

function EtaPicker({ order, onPick }: { order: Order; onPick: (m: number) => void }) {
  return (
    <div className="mt-3 flex items-center gap-1.5">
      <span className="text-[11px] font-semibold" style={{ color: MUTED }}>Gotowe za:</span>
      {(order.mode === "pickup" ? [15, 20, 30, 45] : [30, 45, 60, 75]).map((m) => (
        <button
          key={m}
          onClick={() => onPick(m)}
          className="flex-1 rounded-full py-2.5 text-[14px] font-bold transition hover:opacity-90"
          style={{ background: "rgba(27,23,16,0.05)", border: "1px solid rgba(27,23,16,0.16)", color: CREAM }}
          onMouseEnter={(e) => { e.currentTarget.style.background = LIME; e.currentTarget.style.color = "#1D2A22"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(27,23,16,0.05)"; e.currentTarget.style.color = CREAM; }}
        >
          {m}&#39;
        </button>
      ))}
    </div>
  );
}

/** Godzina ETA + możliwość zmiany czasu w trakcie realizacji. */
function EtaLine({ order, onEta }: { order: Order; onEta: (m: number) => void }) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    return (
      <div className="mt-3">
        <EtaPicker order={order} onPick={(m) => { onEta(m); setEditing(false); }} />
        <button onClick={() => setEditing(false)} className="mt-1.5 text-[11.5px] font-semibold underline" style={{ color: MUTED }}>
          anuluj zmianę
        </button>
      </div>
    );
  }
  return (
    <div
      className="mt-3 flex items-center gap-2.5 rounded-xl px-3.5 py-2.5"
      style={{ background: "rgba(140,165,59,0.10)", border: "1px solid rgba(140,165,59,0.35)" }}
    >
      <IconClock className="h-4.5 w-4.5" />
      <span className="text-[17px] font-extrabold tabular-nums" style={{ color: OLIVE }}>
        {order.etaAt ? clock(order.etaAt) : order.scheduledTime}
      </span>
      {order.timeMode === "asap" && (
        <button onClick={() => setEditing(true)} className="ml-auto text-[11.5px] font-bold underline" style={{ color: MUTED }}>
          zmień czas
        </button>
      )}
    </div>
  );
}

const PREV_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  in_progress: "new",
  ready: "in_progress",
  on_delivery: "ready",
  completed: "ready",
};

function OrderCard({
  order,
  highlight,
  onAdvance,
  children,
}: {
  order: Order;
  highlight?: boolean;
  onAdvance: (id: string, s: OrderStatus, reason?: string) => void;
  children: React.ReactNode;
}) {
  const [cancelOpen, setCancelOpen] = useState(false);
  const mapsUrl =
    order.mode === "delivery" && order.customer.street
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${order.customer.street}, ${order.customer.city ?? "Kościerzyna"}`)}`
      : null;
  const prev = PREV_STATUS[order.status];

  return (
    <div
      className="rounded-2xl p-3.5"
      style={{
        background: SUB,
        border: highlight ? "1.5px solid #A9B94F" : "1px solid rgba(27,23,16,0.08)",
        boxShadow: highlight ? "0 0 0 3px rgba(169,185,79,0.22)" : undefined,
      }}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-[16px] font-extrabold tabular-nums">
          #{order.number}
          <span className="ml-2 text-[11px] font-semibold" style={{ color: MUTED }}>{clock(order.createdAt)}</span>
        </div>
        <div className="flex flex-wrap justify-end gap-1.5">
          {order.timeMode === "asap" && order.status === "new" && <Badge tone="alert">ASAP</Badge>}
          <Badge tone="info">
            {order.mode === "pickup" ? <IconBag className="h-3 w-3" /> : <IconTruck className="h-3 w-3" />}
            {order.mode === "pickup" ? "Odbiór" : "Dostawa"}
          </Badge>
          {order.source === "phone" && <Badge tone="lime"><IconPhone className="h-3 w-3" /> Telefon</Badge>}
          {order.pos.simulated && <Badge tone="info">DEMO</Badge>}
        </div>
      </div>

      <div className="text-[14px] font-bold">{order.customer.name}</div>
      <div className="mb-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12.5px]" style={{ color: MUTED }}>
        <a href={`tel:${order.customer.phone}`} className="flex items-center gap-1 font-bold underline underline-offset-2" style={{ color: CREAM }}>
          <IconPhone className="h-3.5 w-3.5" /> {order.customer.phone}
        </a>
        {mapsUrl ? (
          <a href={mapsUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 underline underline-offset-2">
            <IconPin className="h-3.5 w-3.5" /> {order.customer.street}, {order.customer.city ?? ""}
          </a>
        ) : (
          <span>odbiór osobisty</span>
        )}
      </div>
      {order.customer.note && (
        <div
          className="mb-1.5 mt-1 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold"
          style={{ background: "rgba(183,56,47,0.07)", color: "#8E3B2F", border: "1px solid rgba(183,56,47,0.3)" }}
        >
          Uwagi: {order.customer.note}
        </div>
      )}

      <div
        className="space-y-0.5 pt-2.5 text-[12.5px] leading-relaxed"
        style={{ borderTop: "1px dashed rgba(27,23,16,0.13)", color: "#4A443B" }}
      >
        {order.items.map((it, i) => (
          <div key={i}>
            <span className="font-extrabold" style={{ color: OLIVE }}>{it.qty}×</span> {it.name}
            {it.addons.length > 0 && (
              <span style={{ color: MUTED }}> · {it.addons.map((a) => a.name).join(", ")}</span>
            )}
          </div>
        ))}
      </div>
      <div className="mt-2.5 flex items-center justify-between">
        <div className="text-[15px] font-extrabold">
          {zl(order.total)}
          {order.deliveryFee > 0 && (
            <span className="ml-1.5 text-[11px] font-semibold" style={{ color: MUTED }}>(z dostawą {zl(order.deliveryFee)})</span>
          )}
        </div>
        <div className="text-[12px] font-semibold" style={{ color: MUTED }}>
          {order.payment === "cash" ? "gotówka" : order.payment === "card" ? "karta" : "online"}
        </div>
      </div>

      {children}

      {/* Stopka karty: cofnij / anuluj / kto obsłużył */}
      <div className="mt-2.5 flex items-center gap-3 text-[11.5px] font-semibold" style={{ color: MUTED }}>
        {prev && (
          <button onClick={() => onAdvance(order.id, prev)} className="flex items-center gap-1 underline underline-offset-2">
            <IconUndo className="h-3.5 w-3.5" /> cofnij
          </button>
        )}
        <button onClick={() => setCancelOpen((v) => !v)} className="underline underline-offset-2" style={{ color: ALERT }}>
          anuluj zamówienie
        </button>
        <button onClick={() => printOrder(order)} className="flex items-center gap-1 underline underline-offset-2">
          <IconPrint className="h-3.5 w-3.5" /> drukuj kwit
        </button>
        {order.staff && <span className="ml-auto">obsługuje: {order.staff}</span>}
      </div>
      {cancelOpen && (
        <div className="mt-2 rounded-xl p-2.5" style={{ background: "rgba(183,56,47,0.06)", border: "1px solid rgba(183,56,47,0.35)" }}>
          <div className="mb-1.5 text-[11.5px] font-bold" style={{ color: ALERT }}>Powód anulowania:</div>
          <div className="flex flex-wrap gap-1.5">
            {CANCEL_REASONS.map((r) => (
              <button
                key={r}
                onClick={() => { onAdvance(order.id, "canceled", r); setCancelOpen(false); }}
                className="rounded-full px-3 py-1.5 text-[12px] font-bold"
                style={{ background: "rgba(183,56,47,0.12)", color: "#8E3B2F", border: "1px solid rgba(183,56,47,0.45)" }}
              >
                {r}
              </button>
            ))}
            <button onClick={() => setCancelOpen(false)} className="px-2 text-[12px] font-semibold underline" style={{ color: MUTED }}>
              wróć
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusButtons({ order, onAdvance }: { order: Order; onAdvance: (id: string, s: OrderStatus) => void }) {
  const next: { label: string; status: OrderStatus }[] = [];
  if (order.status === "scheduled") next.push({ label: "Zaczynamy przygotowanie", status: "in_progress" });
  if (order.status === "in_progress") {
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
          style={{ background: "rgba(140,165,59,0.12)", border: "1px solid rgba(140,165,59,0.45)", color: OLIVE }}
        >
          {n.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- Historia dnia ---------- */

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: CARD, border: "1px solid #EAE2D2" }}>
      <div className="text-[11px] font-extrabold uppercase tracking-[0.14em]" style={{ color: MUTED }}>{label}</div>
      <div className="mt-1 text-[24px] font-extrabold tabular-nums">{value}</div>
    </div>
  );
}

function HistoryView({ orders: all }: { orders: Order[] }) {
  const [day, setDay] = useState(() => dateInputValue(new Date()));
  const today = dateInputValue(new Date());
  const yesterday = dateInputValue(new Date(Date.now() - 86400000));
  const orders = all
    .filter((o) => ["completed", "canceled"].includes(o.status) && sameDay(o.createdAt, day))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const done = orders.filter((o) => o.status === "completed");
  const canceled = orders.filter((o) => o.status === "canceled");
  const revenue = done.reduce((s, o) => s + o.total, 0);
  const cash = done.filter((o) => o.payment === "cash").reduce((s, o) => s + o.total, 0);
  const card = done.filter((o) => o.payment === "card").reduce((s, o) => s + o.total, 0);
  const online = done.filter((o) => o.payment === "online").reduce((s, o) => s + o.total, 0);
  const avg = done.length ? revenue / done.length : 0;

  return (
    <div className="p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {[
          { v: today, l: "Dziś" },
          { v: yesterday, l: "Wczoraj" },
        ].map((d) => (
          <button
            key={d.v}
            onClick={() => setDay(d.v)}
            className="rounded-full px-4 py-2 text-[12.5px] font-bold"
            style={day === d.v ? { background: LIME, color: "#1D2A22" } : { background: CARD, color: CREAM }}
          >
            {d.l}
          </button>
        ))}
        <input
          type="date"
          value={day}
          onChange={(e) => e.target.value && setDay(e.target.value)}
          className="rounded-full px-4 py-1.5 text-[13px] font-bold outline-none"
          style={{ background: CARD, color: CREAM, border: "1px solid rgba(27,23,16,0.13)" }}
        />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Tile label="Zrealizowane" value={String(done.length)} />
        <Tile label="Utarg online" value={zl(revenue)} />
        <Tile label="Gotówka / karta" value={`${zl(cash)} / ${zl(card + online)}`} />
        <Tile label="Średnie zamówienie" value={done.length ? zl(avg) : "—"} />
        <Tile label="Anulowane" value={String(canceled.length)} />
      </div>

      <div className="mt-4 rounded-3xl p-3.5" style={{ background: CARD, border: "1px solid #EAE2D2" }}>
        <h2 className="mb-3 px-1 text-[11px] font-extrabold uppercase tracking-[0.14em]" style={{ color: MUTED }}>
          Zamówienia — {day === today ? "dziś" : day} (najnowsze u góry)
        </h2>
        {orders.length === 0 && <Empty />}
        <div className="flex flex-col gap-2">
          {orders.map((o) => (
            <div
              key={o.id}
              className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl px-3.5 py-2.5 text-[13px]"
              style={{ background: SUB, opacity: o.status === "canceled" ? 0.65 : 1 }}
            >
              <b className="tabular-nums">#{o.number}</b>
              <span style={{ color: MUTED }}>{clock(o.createdAt)}</span>
              <span className="font-semibold">{o.customer.name}</span>
              <span style={{ color: MUTED }}>
                {o.items.reduce((s, i) => s + i.qty, 0)} poz. · {o.mode === "pickup" ? "odbiór" : "dostawa"} ·{" "}
                {o.payment === "cash" ? "gotówka" : o.payment === "card" ? "karta" : "online"}
                {o.source === "phone" ? " · telefon" : ""}
              </span>
              <span className="ml-auto font-extrabold">{zl(o.total)}</span>
              {o.status === "canceled" ? (
                <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold" style={{ background: "rgba(183,56,47,0.12)", color: ALERT }}>
                  anulowane{o.cancelReason ? ` — ${o.cancelReason}` : ""}
                </span>
              ) : (
                <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold" style={{ background: "rgba(140,165,59,0.16)", color: OLIVE }}>
                  zrealizowane{o.staff ? ` — ${o.staff}` : ""}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
