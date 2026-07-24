"use client";

/**
 * Panel kierowcy — telefon w kieszeni kierowcy.
 * KODY KIEROWCÓW (15.07.2026): każdy kierowca wchodzi na /panel/kierowca na
 * SWOIM telefonie, wpisuje swój kod (DRIVER_CODES w Vercelu) i przez 90 dni
 * widzi tylko własne kursy: „Wyjeżdżam" → „Dostarczone". Bez kodu nie zobaczy
 * niczego. Gdy DRIVER_CODES nie ustawiono — stary tryb (hasło lokalu + wybór
 * imienia), żeby nic nie stanęło.
 */

import { useCallback, useEffect, useState } from "react";
import { StaffGate } from "@/components/StaffGate";
import type { Order } from "@/lib/orders/types";
import { zl } from "@/lib/format";

const BG = "#F7F3EB";
const CARD = "#FFFEFA";
const SUB = "#F1EBDD";
const INK = "#1B1710";
const MUTED = "#7A7060";
const OLIVE = "#5B6B2E";
const LIME = "#D5E36B";
const ALERT = "#B7382F";

function clock(iso?: string): string {
  if (!iso) return "--:--";
  return new Date(iso).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
}

export default function DriverPanelPage() {
  // Tryb pracy zależy od konfiguracji: kody kierowców (docelowo) albo
  // stary wariant za hasłem lokalu (zanim właściciel ustawi DRIVER_CODES).
  const [mode, setMode] = useState<"loading" | "codes" | "legacy">("loading");
  const [name, setName] = useState<string>("");

  useEffect(() => {
    fetch("/api/staff/driver-login", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { name?: string | null; enabled?: boolean }) => {
        setName(d.name ?? "");
        setMode(d.enabled ? "codes" : "legacy");
      })
      .catch(() => setMode("legacy"));
  }, []);

  if (mode === "loading") {
    return (
      <main className="grid min-h-screen place-items-center text-[12px] uppercase tracking-[0.2em]" style={{ background: BG, color: MUTED }}>
        Ładowanie…
      </main>
    );
  }
  if (mode === "codes") {
    return name ? <DriverInner driverName={name} onLogout={() => setName("")} /> : <DriverCodeLogin onLogin={setName} />;
  }
  return (
    <StaffGate>
      <DriverInner />
    </StaffGate>
  );
}

/** Ekran logowania kodem kierowcy (duża klawiatura numeryczna systemowa). */
function DriverCodeLogin({ onLogin }: { onLogin: (name: string) => void }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!code.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/staff/driver-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Nieprawidłowy kod.");
      onLogin(d.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd logowania.");
    }
    setBusy(false);
  };

  return (
    <main className="grid min-h-screen place-items-center px-6" style={{ background: BG, color: INK }}>
      <div className="w-full max-w-xs rounded-3xl p-6 text-center" style={{ background: CARD, border: "1px solid #EAE2D2" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/icon-espresso.png" alt="" className="mx-auto h-12 w-12 object-contain" />
        <div className="mt-3 text-[14px] font-extrabold uppercase tracking-[0.12em]">Panel kierowcy</div>
        <p className="mt-1 text-[12.5px]" style={{ color: MUTED }}>
          Wpisz swój kod kierowcy — telefon zapamięta Cię na 90 dni.
        </p>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          inputMode="numeric"
          autoFocus
          placeholder="••••"
          className="mt-4 w-full rounded-xl px-4 py-3.5 text-center text-[22px] font-bold tracking-[0.4em] outline-none"
          style={{ background: SUB, color: INK, border: "1px solid #EAE2D2" }}
        />
        {error && <p className="mt-2 text-[12.5px] font-semibold" style={{ color: ALERT }}>{error}</p>}
        <button
          onClick={submit}
          disabled={busy || !code.trim()}
          className="mt-4 w-full rounded-full py-3.5 text-[15px] font-extrabold disabled:opacity-40"
          style={{ background: LIME, color: "#1D2A22" }}
        >
          {busy ? "Sprawdzam…" : "Wejdź"}
        </button>
      </div>
    </main>
  );
}

function DriverInner({ driverName, onLogout }: { driverName?: string; onLogout?: () => void } = {}) {
  const [drivers, setDrivers] = useState<string[]>([]);
  const [me, setMe] = useState<string>(driverName ?? "");
  const [orders, setOrders] = useState<Order[]>([]);
  const codesMode = Boolean(driverName);

  useEffect(() => {
    if (!codesMode) setMe(localStorage.getItem("mr_driver") ?? "");
    fetch("/api/staff/drivers")
      .then((r) => r.json())
      .then((d) => setDrivers(d.drivers ?? []))
      .catch(() => {});
  }, [codesMode]);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/orders", { cache: "no-store" });
      const data = await res.json();
      setOrders((data.orders ?? []) as Order[]);
    } catch {
      /* kolejny tick */
    }
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 8000);
    return () => clearInterval(t);
  }, [refresh]);

  const pickMe = (name: string) => {
    setMe(name);
    localStorage.setItem("mr_driver", name);
  };

  // Tryb kodów: „Zmień kierowcę" = wylogowanie (kasuje ciasteczko 90-dniowe).
  const logoutDriver = async () => {
    await fetch("/api/staff/driver-login", { method: "DELETE" }).catch(() => {});
    onLogout?.();
  };

  // „System myśli" — nakładka na czas zapisu (kierowca widzi reakcję od razu).
  const [busy, setBusy] = useState(false);
  const setStatus = async (id: string, status: "on_delivery" | "completed") => {
    setBusy(true);
    try {
      await fetch(`/api/orders/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, by: me }),
      });
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const mine = orders
    .filter(
      (o) =>
        o.mode === "delivery" &&
        o.driver === me &&
        ["in_progress", "ready", "on_delivery"].includes(o.status)
    )
    .sort((a, b) => (a.etaAt ?? a.createdAt).localeCompare(b.etaAt ?? b.createdAt));


  return (
    <main className="min-h-screen pb-10" style={{ background: BG, color: INK }}>
      {busy && (
        <div className="fixed inset-0 z-[90] grid place-items-center" style={{ background: "rgba(27,23,16,0.18)" }}>
          <div className="flex items-center gap-3 rounded-full px-6 py-3.5 shadow-lg" style={{ background: CARD, border: "1px solid rgba(27,23,16,0.1)" }}>
            <span className="h-5 w-5 animate-spin rounded-full border-2" style={{ borderColor: OLIVE, borderTopColor: "transparent" }} />
            <span className="text-[14px] font-bold">Zapisuję…</span>
          </div>
        </div>
      )}
      <div className="sticky top-0 z-40 flex items-center justify-between px-4 py-3" style={{ background: CARD, borderBottom: "1px solid rgba(27,23,16,0.06)" }}>
        <div>
          <div className="text-[13px] font-semibold uppercase tracking-[0.18em]">Mammarosa</div>
          <div className="text-[11px]" style={{ color: MUTED }}>Panel kierowcy{me ? ` · ${me}` : ""}</div>
        </div>
        <div className="flex items-center gap-2">
          {me && (
            <button
              onClick={() => (codesMode ? logoutDriver() : pickMe(""))}
              className="rounded-full px-3.5 py-1.5 text-[12.5px] font-bold"
              style={{ background: SUB, color: INK }}
            >
              Zmień kierowcę
            </button>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-xl p-4">
        {!me ? (
          <div className="rounded-3xl p-5 text-center" style={{ background: CARD, border: "1px solid #EAE2D2" }}>
            <div className="text-[14px] font-extrabold uppercase tracking-[0.12em]">Kto jedzie?</div>
            <p className="mt-1 text-[12.5px]" style={{ color: MUTED }}>Wybierz swoje imię — telefon je zapamięta.</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {drivers.map((d) => (
                <button key={d} onClick={() => pickMe(d)} className="rounded-full px-6 py-3 text-[15px] font-bold" style={{ background: LIME, color: "#1D2A22" }}>
                  {d}
                </button>
              ))}
              {drivers.length === 0 && (
                <p className="text-[12.5px]" style={{ color: MUTED }}>
                  Brak listy kierowców — ustaw zmienną DRIVERS w Vercelu.
                </p>
              )}
            </div>
          </div>
        ) : (
          <>
            {mine.length === 0 && (
              <div className="rounded-3xl p-6 text-center text-[14px]" style={{ background: CARD, color: MUTED }}>
                Brak kursów. Gdy kelnerka przypisze Ci dostawę, pojawi się tutaj
                (odświeża się samo co kilka sekund).
              </div>
            )}
            <div className="space-y-3">
              {mine.map((o) => {
                const going = o.status === "on_delivery";
                const addr = `${o.customer.street ?? ""}, ${o.customer.city ?? ""}`.trim().replace(/^,\s*/, "");
                return (
                  <div key={o.id} className="rounded-3xl p-4" style={{ background: CARD, border: going ? `2px solid ${OLIVE}` : "1px solid #EAE2D2" }}>
                    <div className="flex items-baseline gap-3">
                      <b className="text-[19px] tabular-nums">#{o.number}</b>
                      <span className="text-[13px]" style={{ color: MUTED }}>
                        {o.timeMode === "scheduled" ? `na ${o.scheduledTime}` : o.etaAt ? `gotowe ~${clock(o.etaAt)}` : "ASAP"}
                      </span>
                      {going && (
                        <span className="ml-auto rounded-full px-2.5 py-0.5 text-[11px] font-extrabold" style={{ background: "rgba(140,165,59,0.16)", color: OLIVE }}>
                          W DRODZE
                        </span>
                      )}
                    </div>

                    <div className="mt-2 text-[15px] font-bold">{o.customer.name}</div>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 block text-[15px] font-semibold underline underline-offset-2"
                      style={{ color: OLIVE }}
                    >
                      📍 {addr || "brak adresu"}
                    </a>
                    <a href={`tel:${o.customer.phone}`} className="mt-1 block text-[15px] font-semibold underline underline-offset-2" style={{ color: OLIVE }}>
                      ☎ {o.customer.phone}
                    </a>
                    {o.customer.note && (
                      <div className="mt-2 rounded-xl px-3 py-2 text-[13px] font-semibold" style={{ background: SUB }}>
                        {o.customer.note}
                      </div>
                    )}

                    <div className="mt-2 text-[12.5px]" style={{ color: MUTED }}>
                      {o.items.map((i) => `${i.qty}× ${i.name}`).join(" · ")}
                    </div>

                    <div className="mt-3 flex items-center justify-between rounded-xl px-3.5 py-2.5" style={{ background: SUB }}>
                      <span className="text-[13px] font-bold" style={{ color: MUTED }}>
                        {o.payment === "cash" ? "POBIERZ GOTÓWKĄ" : o.payment === "card" ? "KARTA (terminal)" : "OPŁACONE ONLINE"}
                      </span>
                      <b className="text-[19px] tabular-nums">{zl(o.total)}</b>
                    </div>

                    {!going ? (
                      <button
                        onClick={() => setStatus(o.id, "on_delivery")}
                        className="mt-3 w-full rounded-full py-4 text-[16px] font-extrabold"
                        style={{ background: LIME, color: "#1D2A22" }}
                      >
                        Wyjeżdżam →
                      </button>
                    ) : (
                      <button
                        onClick={() => setStatus(o.id, "completed")}
                        className="mt-3 w-full rounded-full py-4 text-[16px] font-extrabold"
                        style={{ background: INK, color: BG }}
                      >
                        Dostarczone ✓
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
