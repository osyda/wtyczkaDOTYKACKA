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

type TimeMode = "asap" | "scheduled";
type Payment = "cash" | "card";
type Quote = DeliveryQuote & { needsManual?: boolean };

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
  const [quote, setQuote] = useState<Quote>(flatCityQuote());
  const [quoting, setQuoting] = useState(false);

  // Automatyczne wyliczanie dostawy z adresu (debounce).
  useEffect(() => {
    if (mode === "pickup") {
      setQuote(pickupQuote());
      return;
    }
    // Kościerzyna → natychmiast 5 zł (bez odpytywania serwera).
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
        /* anulowane / błąd */
      } finally {
        setQuoting(false);
      }
    }, 500);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [mode, form.street, form.city, form.zip, manualKm]);

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

  if (lines.length === 0) {
    return (
      <main className="min-h-screen bg-[#F7E9D5] text-[#1F1714]">
        <Header />
        <div className="mx-auto max-w-md px-6 py-20 text-center">
          <div className="mb-3 text-5xl">🛒</div>
          <h1 className="text-xl font-bold">Koszyk jest pusty</h1>
          <Link
            href="/menu"
            className="mt-5 inline-block rounded-2xl bg-[#5C6B3C] px-6 py-3 font-bold text-white"
          >
            Zobacz menu
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F7E9D5] pb-32 text-[#1F1714]">
      <Header />
      <div className="mx-auto max-w-md space-y-4 px-4 py-5">
        {/* Pozycje */}
        <Card title="Twoje zamówienie">
          <div className="space-y-3">
            {lines.map((l) => (
              <div key={l.lineId} className="flex gap-3 border-b border-[#E7D4BC] pb-3 last:border-0 last:pb-0">
                <div className="flex-1">
                  <div className="font-semibold">{l.name}</div>
                  {l.addons.length > 0 && (
                    <div className="text-xs text-[#9a8a7c]">
                      {l.addons.map((a) => `+ ${a.name}`).join(", ")}
                    </div>
                  )}
                  <button
                    onClick={() => remove(l.lineId)}
                    className="mt-1 text-xs font-semibold text-[#B7382F]"
                  >
                    Usuń
                  </button>
                </div>
                <div className="flex flex-col items-end justify-between">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setQty(l.lineId, l.qty - 1)} className="h-7 w-7 rounded-lg bg-[#F0E2CD] font-bold">−</button>
                    <span className="w-5 text-center font-bold">{l.qty}</span>
                    <button onClick={() => setQty(l.lineId, l.qty + 1)} className="h-7 w-7 rounded-lg bg-[#F0E2CD] font-bold">+</button>
                  </div>
                  <div className="text-sm font-bold">{zl(lineTotal(l))}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Sposób odbioru */}
        <Card title="Sposób odbioru">
          <Segmented
            options={[
              { value: "delivery", label: "🚚 Dostawa" },
              { value: "pickup", label: "🏠 Odbiór osobisty" },
            ]}
            value={mode}
            onChange={(v) => setMode(v as FulfillmentMode)}
          />
          {mode === "delivery" && (
            <div className="mt-3 rounded-xl border border-[#E7D4BC] bg-[#FFF8EC] p-3 text-sm">
              {form.street.trim().length < 3 ? (
                <span className="text-[#9a8a7c]">Podaj adres — opłata policzy się automatycznie.</span>
              ) : quoting ? (
                <span className="text-[#9a8a7c]">Liczę odległość…</span>
              ) : quote.outOfRange ? (
                <span className="font-semibold text-[#B7382F]">
                  🚫 {quote.label}. Wybierz odbiór osobisty.
                </span>
              ) : quote.needsManual ? (
                <span className="text-[#9a8a7c]">Podaj odległość (km), aby policzyć dostawę:</span>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#5C6B3C]">
                    {quote.inCity ? "📍 Kościerzyna — stawka płaska" : `📍 ${quote.km} km od Kościerzyny`}
                  </span>
                  <span className="font-extrabold">{zl(deliveryFee)}</span>
                </div>
              )}
              {quote.needsManual && (
                <label className="mt-2 block">
                  <span className="mb-1 block text-xs text-[#9a8a7c]">
                    Odległość (km) — automat wymaga klucza map (dodamy); na razie podaj ręcznie:
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={15}
                    value={manualKm}
                    onChange={(e) => setManualKm(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full rounded-xl border border-[#E0CDB2] bg-white px-3 py-2.5 text-sm"
                  />
                </label>
              )}
              {quote.estimated && !quote.needsManual && (
                <p className="mt-1 text-xs text-[#9a8a7c]">Wartość szacowana — do potwierdzenia.</p>
              )}
            </div>
          )}
        </Card>

        {/* Na kiedy */}
        <Card title="Na kiedy?">
          <Segmented
            color="red"
            options={[
              { value: "asap", label: "⚡ Najszybciej" },
              { value: "scheduled", label: "🕒 Na godzinę" },
            ]}
            value={timeMode}
            onChange={(v) => setTimeMode(v as TimeMode)}
          />
          {timeMode === "asap" ? (
            <p className="mt-2 text-xs text-[#9a8a7c]">
              Obsługa ustali czas przygotowania — zobaczysz go na stronie potwierdzenia.
            </p>
          ) : (
            <label className="mt-3 block">
              <span className="mb-1 block text-xs text-[#9a8a7c]">Wybierz godzinę</span>
              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full rounded-xl border border-[#E0CDB2] bg-[#FFF8EC] px-3 py-2.5 text-sm"
              />
            </label>
          )}
        </Card>

        {/* Dane */}
        <Card title="Dane kontaktowe">
          <div className="space-y-2.5">
            <Field label="Imię i nazwisko" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Jan Kowalski" />
            <Field label="Telefon" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="500 100 200" />
            {mode === "delivery" && (
              <>
                <Field label="Ulica i numer" value={form.street} onChange={(v) => setForm({ ...form, street: v })} placeholder="ul. Świętojańska 12" />
                <div className="flex gap-2">
                  <Field label="Miasto" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
                  <Field label="Kod" value={form.zip} onChange={(v) => setForm({ ...form, zip: v })} placeholder="83-400" />
                </div>
              </>
            )}
            <Field label="Uwagi" value={form.note} onChange={(v) => setForm({ ...form, note: v })} placeholder="np. domofon 12" />
          </div>
        </Card>

        {/* Płatność */}
        <Card title="Płatność">
          <div className="space-y-2">
            <Radio label="💵 Gotówka" checked={payment === "cash"} onClick={() => setPayment("cash")} />
            <Radio label="💳 Karta (terminal)" checked={payment === "card"} onClick={() => setPayment("card")} />
            <div className="flex items-center gap-3 rounded-xl border-2 border-[#E3D2BA] p-3 text-sm font-semibold opacity-50">
              🌐 Online — wkrótce
            </div>
          </div>
        </Card>

        {/* Podsumowanie */}
        <Card title="Podsumowanie">
          <Row label="Produkty" value={zl(subtotal)} />
          <Row
            label={mode === "pickup" ? "Odbiór osobisty" : quote.inCity ? "Dostawa — Kościerzyna" : `Dostawa${quote.km ? ` (${quote.km} km)` : ""}`}
            value={deliveryFee > 0 ? zl(deliveryFee) : "0,00 zł"}
          />
          <div className="mt-2 flex justify-between border-t border-dashed border-[#E7D4BC] pt-3 text-lg font-extrabold">
            <span>Razem</span>
            <span>{zl(total)}</span>
          </div>
        </Card>
      </div>

      {/* CTA */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E7D4BC] bg-white px-4 py-3">
        {error && <p className="mx-auto mb-2 max-w-md text-center text-sm text-[#B7382F]">{error}</p>}
        <button
          disabled={!canOrder || submitting}
          onClick={submitOrder}
          className="mx-auto flex max-w-md items-center justify-between rounded-2xl px-5 py-4 font-extrabold text-white disabled:opacity-40"
          style={{ background: "#5C6B3C", width: "100%", maxWidth: "28rem" }}
        >
          <span>{submitting ? "Wysyłam…" : canOrder ? "Zamawiam" : "Uzupełnij dane"}</span>
          <span>{zl(total)} →</span>
        </button>
      </div>
    </main>
  );
}

function Header() {
  return (
    <div className="flex items-center gap-3 bg-[#B7382F] px-4 py-3.5 text-white">
      <Link href="/menu" className="text-2xl leading-none">←</Link>
      <b className="text-lg">Twoje zamówienie</b>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#E7D4BC] bg-white p-4">
      <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#9a8a7c]">{title}</div>
      {children}
    </div>
  );
}

function Segmented({
  options,
  value,
  onChange,
  color = "green",
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  color?: "green" | "red";
}) {
  const on = color === "red" ? "border-[#B7382F] bg-[#F7E3E1] text-[#B7382F]" : "border-[#5C6B3C] bg-[#EDEFE2] text-[#5C6B3C]";
  return (
    <div className="flex gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`flex-1 rounded-xl border-2 px-2 py-3 text-sm font-bold ${
            value === o.value ? on : "border-[#E3D2BA] text-[#8a7a6e]"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block flex-1">
      <span className="mb-1 block text-xs text-[#9a8a7c]">{label}</span>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-[#E0CDB2] bg-[#FFF8EC] px-3 py-2.5 text-sm outline-none focus:border-[#B7382F]"
      />
    </label>
  );
}

function Radio({ label, checked, onClick }: { label: string; checked: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl border-2 p-3 text-sm font-semibold ${
        checked ? "border-[#5C6B3C] bg-[#EDEFE2]" : "border-[#E3D2BA]"
      }`}
    >
      <span className="flex-1 text-left">{label}</span>
      <span className={`h-4 w-4 rounded-full border-2 ${checked ? "border-[#5C6B3C] bg-[#5C6B3C]" : "border-[#c9b9a9]"}`} />
    </button>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1 text-sm text-[#6a5a4e]">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
