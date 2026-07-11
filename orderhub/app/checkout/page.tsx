"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart, lineTotal } from "@/lib/cart/CartProvider";
import { zl } from "@/lib/format";
import {
  isKoscierzyna,
  pickupQuote,
  flatCityQuote,
  type DeliveryQuote,
  type FulfillmentMode,
} from "@/lib/delivery";
import { C } from "@/lib/carta";

type TimeMode = "asap" | "scheduled";
type Payment = "cash" | "card";
type Quote = DeliveryQuote & { needsManual?: boolean };

/* ---------- Ikony (cienka kreska, jak w podglądzie CARTA) ---------- */
const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

const IconTruck = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5">
    <path d="M3 7 h11 v9 H3 Z M14 10 h4.5 L21 13 v3 h-2.5" {...stroke} />
    <circle cx="7" cy="17.8" r="1.7" {...stroke} /><circle cx="17" cy="17.8" r="1.7" {...stroke} />
  </svg>
);
const IconBag = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5">
    <path d="M6 8.5 h12 l-1 11 a1.8 1.8 0 0 1 -1.8 1.6 H8.8 A1.8 1.8 0 0 1 7 19.5 Z" {...stroke} />
    <path d="M9.3 11 V8 a2.7 2.7 0 0 1 5.4 0 v3" {...stroke} />
  </svg>
);
const IconBolt = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5"><path d="M13 3 L6 13.5 h5 L10.5 21 L18 10 h-5 Z" {...stroke} /></svg>
);
const IconClock = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5"><circle cx="12" cy="12" r="8" {...stroke} /><path d="M12 7.5 V12 l3.2 2" {...stroke} /></svg>
);
const IconCash = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5">
    <rect x="3" y="7" width="18" height="10" rx="1.5" {...stroke} />
    <circle cx="12" cy="12" r="2.4" {...stroke} /><path d="M6.2 10.5 v3 M17.8 10.5 v3" {...stroke} />
  </svg>
);
const IconCard = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5">
    <rect x="3" y="6" width="18" height="12" rx="1.5" {...stroke} /><path d="M3 10 h18 M6.5 14.5 h4" {...stroke} />
  </svg>
);
const IconPhone = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5">
    <rect x="7.5" y="3" width="9" height="18" rx="2" {...stroke} /><path d="M11 17.8 h2" {...stroke} />
    <path d="M18.5 8 a4.5 4.5 0 0 1 0 8" {...stroke} opacity=".6" />
  </svg>
);

/* ---------- Klocki CARTA ---------- */

function Sec({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-9 mb-1 flex items-center gap-4">
      <span className="h-px flex-1" style={{ background: C.hairline }} />
      <span className="text-[10.5px] uppercase tracking-[0.32em]" style={{ textIndent: "0.32em" }}>{children}</span>
      <span className="h-px flex-1" style={{ background: C.hairline }} />
    </div>
  );
}

function Opt({
  on,
  onClick,
  icon,
  label,
  sub,
}: {
  on: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  sub?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full cursor-pointer items-center gap-[15px] border-b py-3 text-left"
      style={{ borderColor: C.hairlineSoft }}
    >
      <span
        className="flex h-[38px] w-[38px] flex-none items-center justify-center border transition-colors duration-300"
        style={{
          borderColor: on ? C.ink : C.leader,
          background: on ? C.ink : "transparent",
          color: on ? C.ivory : C.muted,
        }}
      >
        {icon}
      </span>
      <span className="flex-1 text-[13.5px]">{label}</span>
      {sub && <span className="text-[10.5px]" style={{ color: C.muted }}>{sub}</span>}
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  inputMode,
  type,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  inputMode?: "tel";
  type?: string;
}) {
  return (
    <div className="mt-4 flex-1">
      <label className="block text-[9px] uppercase tracking-[0.28em]" style={{ color: C.muted, textIndent: "0.28em" }}>
        {label}
      </label>
      <input
        value={value}
        type={type}
        inputMode={inputMode}
        onChange={(e) => onChange(e.target.value)}
        className="font-carta w-full rounded-none border-0 border-b bg-transparent pb-[7px] pt-[9px] text-[15px] outline-none"
        style={{ borderColor: C.leader, color: C.ink }}
        onFocus={(e) => (e.target.style.borderColor = C.ink)}
        onBlur={(e) => (e.target.style.borderColor = C.leader)}
      />
    </div>
  );
}

function SumLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline py-1.5">
      <span className="whitespace-nowrap text-[12px]" style={{ color: C.muted }}>{label}</span>
      <span className="mx-2.5 flex-1 -translate-y-[3px] border-b border-dotted" style={{ borderColor: C.leader }} />
      <span className="font-carta whitespace-nowrap text-[14px]">{value}</span>
    </div>
  );
}

/* ---------- Strona ---------- */

export default function CheckoutPage() {
  const router = useRouter();
  const { lines, subtotal, setQty, remove, clear } = useCart();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<FulfillmentMode>("delivery");
  const [timeMode, setTimeMode] = useState<TimeMode>("asap");
  const [scheduledTime, setScheduledTime] = useState("18:00");
  const [payment, setPayment] = useState<Payment>("cash");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    street: "",
    city: "Kościerzyna",
    zip: "",
    note: "",
  });
  const [manualKm, setManualKm] = useState<number | "">("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoStatus, setGeoStatus] = useState<"idle" | "locating" | "error">("idle");
  const [quote, setQuote] = useState<Quote>(flatCityQuote());
  const [quoting, setQuoting] = useState(false);
  const [hours, setHours] = useState<{ acceptingOrders: boolean; message: string } | null>(null);

  // Godziny otwarcia — ostatnie zamówienie 20 min przed zamknięciem (serwer i tak pilnuje).
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/hours")
        .then((r) => r.json())
        .then((d) => {
          if (alive) setHours(d);
        })
        .catch(() => {});
    load();
    const t = window.setInterval(load, 60_000);
    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, []);
  const closedNow = hours !== null && !hours.acceptingOrders;

  function locateMe() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoStatus("error");
      return;
    }
    setGeoStatus("locating");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCoords({ lat, lng });
        setGeoStatus("idle");
        try {
          const res = await fetch("/api/geo/reverse", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lat, lng }),
          });
          const a = await res.json();
          if (a.available) {
            setForm((f) => ({
              ...f,
              street: a.street || f.street,
              city: a.city || f.city,
              zip: a.zip || f.zip,
            }));
          }
        } catch {
          /* brak klucza map — klient wpisze ręcznie */
        }
      },
      () => setGeoStatus("error"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  // Automatyczna wycena dostawy: GPS → adres → fallback ręczny.
  useEffect(() => {
    if (mode === "pickup") {
      setQuote(pickupQuote());
      return;
    }
    if (coords) {
      const ctrl = new AbortController();
      (async () => {
        setQuoting(true);
        try {
          const res = await fetch("/api/delivery/quote", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode, lat: coords.lat, lng: coords.lng }),
            signal: ctrl.signal,
          });
          setQuote(await res.json());
        } catch {
          /* anulowane */
        } finally {
          setQuoting(false);
        }
      })();
      return () => ctrl.abort();
    }
    if (isKoscierzyna(form.city)) {
      setQuote(flatCityQuote());
      return;
    }
    if (form.street.trim().length < 3) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setQuoting(true);
      try {
        const res = await fetch("/api/delivery/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode,
            street: form.street,
            city: form.city,
            zip: form.zip,
            manualKm: typeof manualKm === "number" ? manualKm : undefined,
          }),
          signal: ctrl.signal,
        });
        setQuote(await res.json());
      } catch {
        /* anulowane */
      } finally {
        setQuoting(false);
      }
    }, 500);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [mode, coords, form.street, form.city, form.zip, manualKm]);

  const deliveryFee = quote.fee;
  const total = subtotal + deliveryFee;

  const phoneValid = form.phone.replace(/\D/g, "").length >= 9;
  const canOrder =
    !closedNow &&
    lines.length > 0 &&
    form.name.trim().length > 1 &&
    phoneValid &&
    (mode === "pickup" || (form.street.trim().length > 2 && quote.available && !quote.outOfRange));

  async function submitOrder() {
    setSubmitting(true);
    setError(null);
    const payload = {
      mode,
      timeMode,
      scheduledTime: timeMode === "scheduled" ? scheduledTime : undefined,
      customer: {
        name: form.name,
        phone: form.phone,
        street: form.street,
        city: form.city,
        zip: form.zip,
        note: form.note,
      },
      items: lines.map((l) => ({
        productId: l.productId,
        name: l.name,
        qty: l.qty,
        basePrice: l.basePrice,
        addons: l.addons,
        lineTotal: lineTotal(l),
      })),
      subtotal,
      deliveryFee,
      total,
      payment,
    };
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Błąd wysyłki zamówienia.");
      clear();
      router.push(`/dziekujemy/${data.order.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd wysyłki.");
      setSubmitting(false);
    }
  }

  /* ---- Pusty koszyk ---- */
  if (lines.length === 0) {
    return (
      <main className="grid min-h-screen place-items-center px-6" style={{ background: C.ivory, color: C.ink }}>
        <div className="text-center">
          <div className="font-carta text-[34px] italic">Zamówienie jest puste</div>
          <p className="mt-2 text-[12px]" style={{ color: C.muted }}>Wybierz coś pysznego z naszej karty.</p>
          <Link
            href="/menu"
            className="mt-8 inline-block border-b pb-1 text-[10px] uppercase tracking-[0.24em]"
            style={{ color: C.accent, borderColor: C.accent, textIndent: "0.24em" }}
          >
            ← Wróć do menu
          </Link>
        </div>
      </main>
    );
  }

  const deliveryLabel =
    mode === "pickup"
      ? "Odbiór osobisty"
      : quote.inCity
        ? "Dostawa — Kościerzyna"
        : `Dostawa${quote.km ? ` (${quote.km} km)` : ""}`;

  return (
    <main className="min-h-screen pb-24" style={{ background: C.ivory, color: C.ink }}>
      <div className="mx-auto max-w-[430px] px-[26px] min-[700px]:max-w-[760px] min-[700px]:px-11 min-[1000px]:max-w-[1060px]">
        <Link
          href="/menu"
          className="mt-[26px] inline-block text-[10px] uppercase tracking-[0.24em]"
          style={{ color: C.muted, textIndent: "0.24em" }}
        >
          ← Menu
        </Link>
        <h1 className="font-carta mt-2 text-[38px] italic min-[1000px]:text-[46px]">Kasa</h1>

        <div className="min-[1000px]:grid min-[1000px]:grid-cols-[1fr_380px] min-[1000px]:items-start min-[1000px]:gap-[72px]">
          {/* ------- lewa kolumna ------- */}
          <div>
            <Sec>ODBIÓR</Sec>
            <Opt
              on={mode === "delivery"}
              onClick={() => setMode("delivery")}
              icon={<IconTruck />}
              label="Dostawa"
              sub="Kościerzyna i okolice"
            />
            <Opt
              on={mode === "pickup"}
              onClick={() => setMode("pickup")}
              icon={<IconBag />}
              label="Odbiór osobisty"
              sub="bez opłat"
            />

            <Sec>CZAS</Sec>
            <Opt on={timeMode === "asap"} onClick={() => setTimeMode("asap")} icon={<IconBolt />} label="Najszybciej jak się da" />
            <Opt on={timeMode === "scheduled"} onClick={() => setTimeMode("scheduled")} icon={<IconClock />} label="Na konkretną godzinę" />
            {timeMode === "scheduled" && (
              <Field label="GODZINA" type="time" value={scheduledTime} onChange={setScheduledTime} />
            )}

            <Sec>TWOJE DANE</Sec>
            <div className="flex gap-[22px]">
              <Field label="IMIĘ I NAZWISKO" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
              <Field label="TELEFON" inputMode="tel" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
            </div>
            {mode === "delivery" && (
              <>
                <Field label="ULICA I NUMER" value={form.street} onChange={(v) => setForm({ ...form, street: v })} />
                <div className="flex gap-[22px]">
                  <Field label="MIEJSCOWOŚĆ" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
                  <div className="w-28 flex-none">
                    <Field label="KOD" value={form.zip} onChange={(v) => setForm({ ...form, zip: v })} />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={locateMe}
                  className="mt-[18px] inline-block cursor-pointer border-b pb-0.5 text-[10px] uppercase tracking-[0.2em]"
                  style={{ color: C.accent, borderColor: C.accent, textIndent: "0.2em" }}
                >
                  {geoStatus === "locating"
                    ? "Ustalanie pozycji…"
                    : coords
                      ? "Lokalizacja ustawiona — przelicz ponownie"
                      : "Użyj mojej lokalizacji (GPS)"}
                </button>
                {geoStatus === "error" && (
                  <p className="mt-2 text-[11.5px]" style={{ color: C.accent }}>
                    Nie udało się pobrać lokalizacji — podaj adres powyżej.
                  </p>
                )}
                <div className="mt-3.5 text-[11.5px]" style={{ color: C.muted }}>
                  {quoting ? (
                    "Liczę odległość…"
                  ) : quote.outOfRange ? (
                    <span style={{ color: C.accent }}>{quote.label}. Wybierz odbiór osobisty.</span>
                  ) : (coords || !quote.needsManual) && (coords || form.street.trim().length >= 3 || isKoscierzyna(form.city)) ? (
                    <>
                      {quote.inCity ? "Strefa: Kościerzyna — dostawa " : `Trasa ${quote.km} km — dostawa `}
                      <b className="font-carta text-[14px] font-normal" style={{ color: C.ink }}>{zl(deliveryFee)}</b>
                      {quote.inCity ? " (stawka miejska)" : ""}
                      {coords && quote.estimated && !quote.outOfRange ? " · szacunek z lokalizacji" : ""}
                    </>
                  ) : quote.needsManual ? (
                    "Podaj odległość w km, aby policzyć dostawę:"
                  ) : (
                    "Użyj lokalizacji lub wpisz adres — dostawa policzy się sama."
                  )}
                </div>
                {quote.needsManual && !coords && (
                  <div className="w-40">
                    <Field
                      label="ODLEGŁOŚĆ (KM)"
                      value={manualKm === "" ? "" : String(manualKm)}
                      onChange={(v) => setManualKm(v === "" ? "" : Number(v))}
                    />
                  </div>
                )}
                {coords && (
                  <button
                    type="button"
                    onClick={() => setCoords(null)}
                    className="mt-2 cursor-pointer text-[10.5px] underline underline-offset-2"
                    style={{ color: C.muted }}
                  >
                    wpisz adres zamiast lokalizacji
                  </button>
                )}
              </>
            )}
            <Field label="UWAGI (DOMOFON, PIĘTRO…)" value={form.note} onChange={(v) => setForm({ ...form, note: v })} />

            <Sec>PŁATNOŚĆ {mode === "delivery" ? "PRZY DOSTAWIE" : "PRZY ODBIORZE"}</Sec>
            <Opt on={payment === "cash"} onClick={() => setPayment("cash")} icon={<IconCash />} label="Gotówka" />
            <Opt on={payment === "card"} onClick={() => setPayment("card")} icon={<IconCard />} label="Karta (terminal)" />
            <div className="flex w-full items-center gap-[15px] border-b py-3 opacity-45" style={{ borderColor: C.hairlineSoft }}>
              <span
                className="flex h-[38px] w-[38px] flex-none items-center justify-center border"
                style={{ borderColor: C.leader, color: C.muted }}
              >
                <IconPhone />
              </span>
              <span className="flex-1 text-[13.5px]">Płatność online (BLIK / karta)</span>
              <span className="text-[9px] uppercase tracking-[0.2em]" style={{ color: C.muted }}>wkrótce</span>
            </div>
          </div>

          {/* ------- prawa kolumna (podsumowanie) ------- */}
          <div
            className="min-[1000px]:sticky min-[1000px]:top-10 min-[1000px]:border min-[1000px]:px-[26px] min-[1000px]:pb-[26px] min-[1000px]:pt-2"
            style={{ borderColor: C.border, background: undefined }}
          >
            <Sec>PODSUMOWANIE</Sec>
            {lines.map((l) => (
              <div key={l.lineId} className="flex items-center gap-3 border-b py-3" style={{ borderColor: C.hairlineSoft }}>
                <div className="min-w-0 flex-1">
                  <div className="font-carta text-[15px]">{l.name}</div>
                  {l.addons.length > 0 && (
                    <div className="mt-0.5 text-[10.5px]" style={{ color: C.muted }}>
                      {l.addons.map((a) => a.name).join(", ")}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => (l.qty === 1 ? remove(l.lineId) : setQty(l.lineId, l.qty - 1))}
                    className="h-6 w-6 cursor-pointer border text-[12px]"
                    style={{ borderColor: C.ink }}
                  >
                    −
                  </button>
                  <b className="font-carta text-[14px] font-normal">{l.qty}</b>
                  <button
                    onClick={() => setQty(l.lineId, l.qty + 1)}
                    className="h-6 w-6 cursor-pointer border text-[12px]"
                    style={{ borderColor: C.ink }}
                  >
                    +
                  </button>
                </div>
                <span className="font-carta min-w-[56px] text-right text-[14px]">{zl(lineTotal(l))}</span>
              </div>
            ))}
            <div className="mt-2">
              <SumLine label={deliveryLabel} value={mode === "delivery" && !quote.available ? "—" : zl(deliveryFee)} />
              <div className="flex items-baseline pt-2">
                <span className="text-[10px] uppercase tracking-[0.26em]" style={{ textIndent: "0.26em" }}>RAZEM</span>
                <span className="mx-3 flex-1 -translate-y-[3px] border-b border-dotted" style={{ borderColor: C.leader }} />
                <span className="font-carta text-[19px]">{zl(total)}</span>
              </div>
            </div>
            {closedNow && hours && (
              <p className="mt-3 text-center text-[12px] leading-snug" style={{ color: C.accent }}>{hours.message}</p>
            )}
            {error && (
              <p className="mt-3 text-center text-[12px]" style={{ color: C.accent }}>{error}</p>
            )}
            <button
              disabled={!canOrder || submitting}
              onClick={submitOrder}
              className="mt-[22px] flex w-full cursor-pointer items-center justify-between px-[22px] py-[18px] text-[11px] uppercase tracking-[0.24em] transition-all active:scale-[0.985] disabled:pointer-events-none disabled:opacity-35"
              style={{ background: C.ink, color: C.ivory, textIndent: "0.24em" }}
            >
              <span>
                {submitting ? "Wysyłam…" : closedNow ? "Poza godzinami zamówień" : canOrder ? "Zamawiam" : "Uzupełnij dane"}
              </span>
              <b className="font-carta text-[16px] font-normal normal-case tracking-normal">{zl(total)}</b>
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
