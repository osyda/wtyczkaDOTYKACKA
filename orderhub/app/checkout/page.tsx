"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useCart, lineTotal } from "@/lib/cart/CartProvider";
import { zl } from "@/lib/format";
import {
  quoteDelivery,
  type DeliveryZone,
  type FulfillmentMode,
} from "@/lib/delivery";

type TimeMode = "asap" | "scheduled";
type Payment = "cash" | "card";

export default function CheckoutPage() {
  const router = useRouter();
  const { lines, subtotal, setQty, remove, clear } = useCart();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<FulfillmentMode>("delivery");
  const [timeMode, setTimeMode] = useState<TimeMode>("asap");
  const [scheduledTime, setScheduledTime] = useState("18:00");
  const [zone, setZone] = useState<DeliveryZone>("kosc");
  const [km, setKm] = useState(3);
  const [payment, setPayment] = useState<Payment>("cash");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    street: "",
    city: "Kościerzyna",
    zip: "",
    note: "",
  });

  const delivery = useMemo(
    () => quoteDelivery(mode, zone, km),
    [mode, zone, km]
  );
  const total = subtotal + delivery.fee;

  const phoneValid = form.phone.replace(/\D/g, "").length >= 9;
  const canOrder =
    lines.length > 0 &&
    form.name.trim().length > 1 &&
    phoneValid &&
    (mode === "pickup" || form.street.trim().length > 2);

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
      deliveryFee: delivery.fee,
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
      <main className="min-h-screen bg-[#fff8f0] text-[#2a211c]">
        <Header />
        <div className="mx-auto max-w-md px-6 py-20 text-center">
          <div className="mb-3 text-5xl">🛒</div>
          <h1 className="text-xl font-bold">Koszyk jest pusty</h1>
          <Link
            href="/menu"
            className="mt-5 inline-block rounded-2xl bg-[#15803d] px-6 py-3 font-bold text-white"
          >
            Zobacz menu
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fff8f0] pb-32 text-[#2a211c]">
      <Header />
      <div className="mx-auto max-w-md space-y-4 px-4 py-5">
        {/* Pozycje */}
        <Card title="Twoje zamówienie">
          <div className="space-y-3">
            {lines.map((l) => (
              <div key={l.lineId} className="flex gap-3 border-b border-[#f0e3d6] pb-3 last:border-0 last:pb-0">
                <div className="flex-1">
                  <div className="font-semibold">{l.name}</div>
                  {l.addons.length > 0 && (
                    <div className="text-xs text-[#9a8a7c]">
                      {l.addons.map((a) => `+ ${a.name}`).join(", ")}
                    </div>
                  )}
                  <button
                    onClick={() => remove(l.lineId)}
                    className="mt-1 text-xs font-semibold text-[#b21f1f]"
                  >
                    Usuń
                  </button>
                </div>
                <div className="flex flex-col items-end justify-between">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setQty(l.lineId, l.qty - 1)} className="h-7 w-7 rounded-lg bg-[#f6ece2] font-bold">−</button>
                    <span className="w-5 text-center font-bold">{l.qty}</span>
                    <button onClick={() => setQty(l.lineId, l.qty + 1)} className="h-7 w-7 rounded-lg bg-[#f6ece2] font-bold">+</button>
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
            <div className="mt-3 space-y-3">
              <Segmented
                color="red"
                options={[
                  { value: "kosc", label: "Kościerzyna · 4 zł" },
                  { value: "outside", label: "Poza · 2 zł/km" },
                ]}
                value={zone}
                onChange={(v) => setZone(v as DeliveryZone)}
              />
              {zone === "outside" && (
                <label className="block">
                  <span className="mb-1 block text-xs text-[#9a8a7c]">Odległość (km)</span>
                  <input
                    type="number"
                    min={1}
                    value={km}
                    onChange={(e) => setKm(Number(e.target.value))}
                    className="w-full rounded-xl border border-[#ece0d2] bg-[#faf3ec] px-3 py-2.5 text-sm"
                  />
                </label>
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
                className="w-full rounded-xl border border-[#ece0d2] bg-[#faf3ec] px-3 py-2.5 text-sm"
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
            <div className="flex items-center gap-3 rounded-xl border-2 border-[#eaddcf] p-3 text-sm font-semibold opacity-50">
              🌐 Online — wkrótce
            </div>
          </div>
        </Card>

        {/* Podsumowanie */}
        <Card title="Podsumowanie">
          <Row label="Produkty" value={zl(subtotal)} />
          <Row label={delivery.label} value={delivery.fee > 0 ? zl(delivery.fee) : "0,00 zł"} />
          <div className="mt-2 flex justify-between border-t border-dashed border-[#f0e3d6] pt-3 text-lg font-extrabold">
            <span>Razem</span>
            <span>{zl(total)}</span>
          </div>
        </Card>
      </div>

      {/* CTA */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#f0e3d6] bg-white px-4 py-3">
        {error && <p className="mx-auto mb-2 max-w-md text-center text-sm text-[#b21f1f]">{error}</p>}
        <button
          disabled={!canOrder || submitting}
          onClick={submitOrder}
          className="mx-auto flex max-w-md items-center justify-between rounded-2xl px-5 py-4 font-extrabold text-white disabled:opacity-40"
          style={{ background: "#15803d", width: "100%", maxWidth: "28rem" }}
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
    <div className="flex items-center gap-3 bg-[#b21f1f] px-4 py-3.5 text-white">
      <Link href="/menu" className="text-2xl leading-none">←</Link>
      <b className="text-lg">Twoje zamówienie</b>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#f0e3d6] bg-white p-4">
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
  const on = color === "red" ? "border-[#b21f1f] bg-[#fcecec] text-[#b21f1f]" : "border-[#15803d] bg-[#eaf6ee] text-[#15803d]";
  return (
    <div className="flex gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`flex-1 rounded-xl border-2 px-2 py-3 text-sm font-bold ${
            value === o.value ? on : "border-[#eaddcf] text-[#8a7a6e]"
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
        className="w-full rounded-xl border border-[#ece0d2] bg-[#faf3ec] px-3 py-2.5 text-sm outline-none focus:border-[#b21f1f]"
      />
    </label>
  );
}

function Radio({ label, checked, onClick }: { label: string; checked: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl border-2 p-3 text-sm font-semibold ${
        checked ? "border-[#15803d] bg-[#eaf6ee]" : "border-[#eaddcf]"
      }`}
    >
      <span className="flex-1 text-left">{label}</span>
      <span className={`h-4 w-4 rounded-full border-2 ${checked ? "border-[#15803d] bg-[#15803d]" : "border-[#c9b9a9]"}`} />
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
