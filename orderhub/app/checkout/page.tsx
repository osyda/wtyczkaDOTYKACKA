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
import { DishArt, dishKindFor } from "@/components/DishArt";

type TimeMode = "asap" | "scheduled";
type Payment = "cash" | "card";
type Quote = DeliveryQuote & { needsManual?: boolean };

const INK = "#1D2A22";
const LIME = "#D5E36B";

/* ---------- Ikony kreskowe ---------- */
const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

const IconBack = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className}><path d="M20 12 H4 M10 6 L4 12 L10 18" {...stroke} /></svg>
);
const IconPin = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className}>
    <path d="M12 21 C12 21 5 14.6 5 9.8 A7 7 0 0 1 19 9.8 C19 14.6 12 21 12 21 Z" {...stroke} />
    <circle cx="12" cy="9.8" r="2.6" {...stroke} />
  </svg>
);
const IconCash = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className}>
    <rect x="3" y="6.5" width="18" height="11" rx="2.5" {...stroke} />
    <circle cx="12" cy="12" r="2.6" {...stroke} />
    <path d="M6.5 9.8 v0.01 M17.5 14.2 v0.01" {...stroke} />
  </svg>
);
const IconCard = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className}>
    <rect x="3" y="5.5" width="18" height="13" rx="2.5" {...stroke} />
    <path d="M3 10 H21 M6.5 14.5 H11" {...stroke} />
  </svg>
);
const IconClock = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className}>
    <circle cx="12" cy="12" r="8.5" {...stroke} /><path d="M12 7.5 V12 L15 14" {...stroke} />
  </svg>
);
const IconBolt = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className}><path d="M13 3 L5 13.5 H11 L10 21 L19 9.5 H13 Z" {...stroke} /></svg>
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
const IconArrow = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className}><path d="M4 12 H20 M14 6 L20 12 L14 18" {...stroke} /></svg>
);

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
      <main className="grid min-h-screen place-items-center bg-[#F5F1E8] px-6" style={{ color: INK }}>
        <div className="text-center">
          <div
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm"
            style={{ color: "#A79E8C" }}
          >
            <IconBag className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-bold tracking-[-0.01em]">Koszyk jest pusty</h1>
          <p className="mt-1 text-sm text-[#A79E8C]">Wybierz coś pysznego z menu.</p>
          <Link
            href="/menu"
            className="mt-6 inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-bold text-[#F5F1E8]"
            style={{ background: INK }}
          >
            Zobacz menu <IconArrow className="h-4 w-4" />
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F5F1E8] pb-36" style={{ color: INK }}>
      <div className="mx-auto max-w-md px-5">
        {/* Nagłówek */}
        <div className="flex items-center gap-3 pt-6">
          <Link
            href="/menu"
            aria-label="Wróć do menu"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm"
          >
            <IconBack className="h-5 w-5" />
          </Link>
          <h1 className="text-[22px] font-bold tracking-[-0.02em]">Twoje zamówienie</h1>
        </div>

        {/* Pozycje */}
        <section className="mt-5 space-y-2.5">
          {lines.map((l) => (
            <div key={l.lineId} className="flex items-center gap-3 rounded-3xl bg-white p-3 shadow-[0_2px_12px_rgba(29,42,34,0.05)]">
              <div className="h-16 w-16 flex-none">
                {l.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={l.image} alt="" className="h-full w-full object-contain drop-shadow-[0_6px_8px_rgba(29,42,34,0.25)]" />
                ) : (
                  <DishArt kind={dishKindFor(l.name)} className="h-full w-full" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14.5px] font-bold tracking-[-0.01em]">{l.name}</div>
                {l.addons.length > 0 && (
                  <div className="truncate text-[11.5px] text-[#A79E8C]">
                    {l.addons.map((a) => `+ ${a.name}`).join(", ")}
                  </div>
                )}
                <div className="mt-1 text-[13.5px] font-extrabold">{zl(lineTotal(l))}</div>
              </div>
              <div className="flex flex-none items-center gap-0.5 rounded-full bg-[#F5F1E8] p-1">
                <button
                  onClick={() => (l.qty === 1 ? remove(l.lineId) : setQty(l.lineId, l.qty - 1))}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-base font-extrabold transition hover:bg-white"
                >
                  −
                </button>
                <span className="w-6 text-center text-[14px] font-extrabold">{l.qty}</span>
                <button
                  onClick={() => setQty(l.lineId, l.qty + 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-base font-extrabold transition hover:bg-white"
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </section>

        {/* Sposób odbioru */}
        <Lbl>Sposób odbioru</Lbl>
        <Segmented
          value={mode}
          onChange={(v) => setMode(v as FulfillmentMode)}
          options={[
            { value: "delivery", label: "Dostawa", icon: <IconTruck className="h-4.5 w-4.5" /> },
            { value: "pickup", label: "Odbiór osobisty", icon: <IconBag className="h-4.5 w-4.5" /> },
          ]}
        />

        {mode === "delivery" && (
          <div className="mt-2.5 space-y-2.5">
            <button
              type="button"
              onClick={locateMe}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-white py-3.5 text-sm font-bold shadow-[0_2px_12px_rgba(29,42,34,0.05)] transition hover:shadow-md"
            >
              <IconPin className="h-4.5 w-4.5" />
              {coords ? "Lokalizacja ustawiona — przelicz ponownie" : "Policz dostawę z mojej lokalizacji"}
            </button>
            {geoStatus === "locating" && <P muted>Ustalam Twoją lokalizację…</P>}
            {geoStatus === "error" && <P error>Nie udało się pobrać lokalizacji — podaj adres poniżej.</P>}

            <div className="rounded-3xl bg-white p-4 shadow-[0_2px_12px_rgba(29,42,34,0.05)]">
              {quoting ? (
                <P muted>Liczę odległość…</P>
              ) : quote.outOfRange ? (
                <P error>{quote.label}. Wybierz odbiór osobisty.</P>
              ) : (coords || !quote.needsManual) && (coords || form.street.trim().length >= 3) ? (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-[13.5px] font-semibold">
                    <IconPin className="h-4 w-4 text-[#A79E8C]" />
                    {quote.inCity ? "Kościerzyna — stawka stała" : `${quote.km} km ${coords ? "od Ciebie" : "od Kościerzyny"}`}
                  </span>
                  <span className="text-[15px] font-extrabold">{zl(deliveryFee)}</span>
                </div>
              ) : quote.needsManual ? (
                <P muted>Podaj odległość (km), aby policzyć dostawę:</P>
              ) : (
                <P muted>Użyj lokalizacji lub wpisz adres — dostawa policzy się sama.</P>
              )}

              {coords && (
                <button
                  type="button"
                  onClick={() => setCoords(null)}
                  className="mt-1.5 text-xs font-bold text-[#A79E8C] underline underline-offset-2"
                >
                  wpisz adres zamiast lokalizacji
                </button>
              )}

              {quote.needsManual && !coords && (
                <input
                  type="number"
                  min={1}
                  max={15}
                  value={manualKm}
                  onChange={(e) => setManualKm(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="Odległość w km"
                  className="mt-2.5 w-full rounded-2xl bg-[#F5F1E8] px-4 py-3 text-[15px] outline-none placeholder:text-[#B9B09D]"
                />
              )}
              {coords && quote.estimated && !quote.outOfRange && (
                <p className="mt-1.5 text-[11px] text-[#B9B09D]">
                  Szacunek z lokalizacji — z kluczem map policzymy dokładną trasę.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Na kiedy */}
        <Lbl>Na kiedy?</Lbl>
        <Segmented
          value={timeMode}
          onChange={(v) => setTimeMode(v as TimeMode)}
          options={[
            { value: "asap", label: "Najszybciej", icon: <IconBolt className="h-4.5 w-4.5" /> },
            { value: "scheduled", label: "Na godzinę", icon: <IconClock className="h-4.5 w-4.5" /> },
          ]}
        />
        {timeMode === "asap" ? (
          <p className="mt-2 px-1 text-xs text-[#A79E8C]">
            Obsługa potwierdzi czas przygotowania — zobaczysz go po złożeniu zamówienia.
          </p>
        ) : (
          <input
            type="time"
            value={scheduledTime}
            onChange={(e) => setScheduledTime(e.target.value)}
            className="mt-2.5 w-full rounded-2xl bg-white px-4 py-3.5 text-[15px] font-semibold shadow-[0_2px_12px_rgba(29,42,34,0.05)] outline-none"
          />
        )}

        {/* Dane */}
        <Lbl>Dane kontaktowe</Lbl>
        <div className="space-y-2.5">
          <Field placeholder="Imię i nazwisko" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <Field placeholder="Telefon" inputMode="tel" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
          {mode === "delivery" && (
            <>
              <Field placeholder="Ulica i numer" value={form.street} onChange={(v) => setForm({ ...form, street: v })} />
              <div className="flex gap-2.5">
                <Field placeholder="Miasto" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
                <div className="w-32 flex-none">
                  <Field placeholder="Kod" value={form.zip} onChange={(v) => setForm({ ...form, zip: v })} />
                </div>
              </div>
            </>
          )}
          <Field placeholder="Uwagi (np. domofon, piętro)" value={form.note} onChange={(v) => setForm({ ...form, note: v })} />
        </div>

        {/* Płatność */}
        <Lbl>Płatność {mode === "delivery" ? "przy dostawie" : "przy odbiorze"}</Lbl>
        <div className="space-y-2.5">
          <PayOption
            icon={<IconCash className="h-5 w-5" />}
            label="Gotówka"
            checked={payment === "cash"}
            onClick={() => setPayment("cash")}
          />
          <PayOption
            icon={<IconCard className="h-5 w-5" />}
            label="Karta (terminal)"
            checked={payment === "card"}
            onClick={() => setPayment("card")}
          />
          <div className="flex items-center gap-3 rounded-3xl bg-white/60 px-4 py-3.5 text-[#B9B09D]">
            <span className="flex h-5 w-5 items-center justify-center">
              <svg viewBox="0 0 24 24" className="h-5 w-5"><circle cx="12" cy="12" r="8.5" {...stroke} /><path d="M3.5 12 H20.5 M12 3.5 C15 7 15 17 12 20.5 C9 17 9 7 12 3.5" {...stroke} /></svg>
            </span>
            <span className="flex-1 text-[14px] font-semibold">Płatność online</span>
            <span className="text-[11px] font-bold uppercase tracking-wider">wkrótce</span>
          </div>
        </div>

        {/* Podsumowanie */}
        <Lbl>Podsumowanie</Lbl>
        <div className="rounded-3xl bg-white p-4 shadow-[0_2px_12px_rgba(29,42,34,0.05)]">
          <Row label="Produkty" value={zl(subtotal)} />
          <Row
            label={mode === "pickup" ? "Odbiór osobisty" : quote.inCity ? "Dostawa — Kościerzyna" : `Dostawa${quote.km ? ` (${quote.km} km)` : ""}`}
            value={deliveryFee > 0 ? zl(deliveryFee) : "0,00 zł"}
          />
          <div className="mt-2 flex items-center justify-between border-t border-dashed border-[#E7DFCE] pt-3">
            <span className="text-[16px] font-extrabold">Razem</span>
            <span className="text-[18px] font-extrabold">{zl(total)}</span>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="fixed inset-x-0 bottom-5 z-40 flex justify-center px-5">
        <div className="w-full max-w-md">
          {error && <p className="mb-2 text-center text-sm font-semibold text-[#B7382F]">{error}</p>}
          <button
            disabled={!canOrder || submitting}
            onClick={submitOrder}
            className="flex w-full items-center justify-between rounded-full py-4 pl-7 pr-7 text-[15px] font-bold text-[#F5F1E8] shadow-[0_16px_36px_rgba(29,42,34,0.35)] transition disabled:opacity-45"
            style={{ background: INK }}
          >
            <span>{submitting ? "Wysyłam…" : canOrder ? "Zamawiam" : "Uzupełnij dane"}</span>
            <span style={{ color: LIME }}>{zl(total)}</span>
          </button>
        </div>
      </div>
    </main>
  );
}

/* ---------- Komponenty ---------- */

function Lbl({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2.5 mt-7 px-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#A79E8C]">
      {children}
    </div>
  );
}

function P({ children, muted, error }: { children: React.ReactNode; muted?: boolean; error?: boolean }) {
  return (
    <p className={`text-[13px] font-semibold ${error ? "text-[#B7382F]" : muted ? "text-[#A79E8C]" : ""}`}>
      {children}
    </p>
  );
}

function Segmented({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string; icon?: React.ReactNode }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-1 rounded-full bg-white p-1 shadow-[0_2px_12px_rgba(29,42,34,0.05)]">
      {options.map((o) => {
        const on = value === o.value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className="flex flex-1 items-center justify-center gap-2 rounded-full py-3 text-[13.5px] font-bold transition"
            style={on ? { background: INK, color: "#F5F1E8" } : { color: "#6E6759" }}
          >
            {o.icon}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Field({
  placeholder,
  value,
  onChange,
  inputMode,
}: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  inputMode?: "tel";
}) {
  return (
    <input
      value={value}
      inputMode={inputMode}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-2xl bg-white px-4 py-3.5 text-[15px] shadow-[0_2px_12px_rgba(29,42,34,0.05)] outline-none transition placeholder:text-[#B9B09D] focus:ring-2 focus:ring-[#1D2A22]/20"
    />
  );
}

function PayOption({
  icon,
  label,
  checked,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  checked: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-3xl bg-white px-4 py-3.5 text-left shadow-[0_2px_12px_rgba(29,42,34,0.05)] transition"
      style={checked ? { boxShadow: `inset 0 0 0 2px ${INK}` } : undefined}
    >
      <span className="text-[#6E6759]">{icon}</span>
      <span className="flex-1 text-[14px] font-bold">{label}</span>
      <span
        className="flex h-5 w-5 items-center justify-center rounded-full border-2 transition"
        style={checked ? { background: INK, borderColor: INK } : { borderColor: "#D8CFBC" }}
      >
        {checked && (
          <svg viewBox="0 0 24 24" className="h-3 w-3">
            <path d="M5 12.5 L10 17 L19 7" fill="none" stroke={LIME} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
    </button>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1 text-[13.5px] text-[#6E6759]">
      <span>{label}</span>
      <span className="font-semibold" style={{ color: INK }}>{value}</span>
    </div>
  );
}
