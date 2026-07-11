"use client";

/**
 * Przyjmowanie zamówienia TELEFONICZNEGO przez obsługę.
 * Kolejność odwrotna niż u klienta: najpierw dane klienta (prefill z CTI,
 * znany numer wypełnia się sam), potem pozycje z menu, na końcu czas i płatność.
 * Zapis → zamówienie ląduje w panelu i (po go-live) w Dotykačce jak każde inne.
 */

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import type { Menu, MenuProduct } from "@/lib/dotykacka/types";
import type { CallerInfo } from "@/lib/cti";
import { CartProvider, useCart, lineTotal } from "@/lib/cart/CartProvider";
import { ProductModal } from "@/components/ProductModal";
import { zl } from "@/lib/format";
import { isKoscierzyna, pickupQuote, flatCityQuote, type DeliveryQuote, type FulfillmentMode } from "@/lib/delivery";

const BG = "#F7F3EB";
const CARD = "#FFFEFA";
const SUB = "#F1EBDD";
const INK = "#1B1710";
const MUTED = "#7A7060";
const LIME = "#D5E36B";
const OLIVE = "#5B6B2E";
const ALERT = "#B7382F";
const BORDER = "#EAE2D2";

type TimeMode = "asap" | "scheduled";
type Payment = "cash" | "card";
type Quote = DeliveryQuote & { needsManual?: boolean; remembered?: boolean };

function Sec({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-2.5 mt-6 flex items-center gap-2 px-1 text-[11px] font-extrabold uppercase tracking-[0.14em]" style={{ color: MUTED }}>
      {children}
    </h2>
  );
}

function Field({
  label,
  value,
  onChange,
  inputMode,
  flex,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  inputMode?: "tel";
  flex?: boolean;
}) {
  return (
    <label className={flex ? "flex-1" : "block"}>
      <span className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.12em]" style={{ color: MUTED }}>
        {label}
      </span>
      <input
        value={value}
        inputMode={inputMode}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl px-3.5 py-3 text-[15px] outline-none"
        style={{ background: SUB, color: INK, border: "1px solid " + BORDER }}
      />
    </label>
  );
}

function Pill({
  on,
  onClick,
  children,
}: {
  on?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-full px-4 py-2.5 text-[13.5px] font-bold transition"
      style={on ? { background: INK, color: BG } : { background: SUB, color: INK, border: "1px solid " + BORDER }}
    >
      {children}
    </button>
  );
}

function PhoneOrderInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { lines, subtotal, setQty, remove, clear } = useCart();

  const [menu, setMenu] = useState<Menu | null>(null);
  const [activeCat, setActiveCat] = useState<string>("");
  const [modalProduct, setModalProduct] = useState<MenuProduct | null>(null);

  const [form, setForm] = useState({
    name: params.get("name") ?? "",
    phone: params.get("phone") ?? "",
    street: "",
    city: "Kościerzyna",
    zip: "",
    note: "",
  });
  const [mode, setMode] = useState<FulfillmentMode>("delivery");
  const [timeMode, setTimeMode] = useState<TimeMode>("asap");
  const [etaMinutes, setEtaMinutes] = useState<number | null>(null);
  const [scheduledTime, setScheduledTime] = useState("18:00");
  const [payment, setPayment] = useState<Payment>("cash");
  const [caller, setCaller] = useState<CallerInfo | null>(null);
  const [quote, setQuote] = useState<Quote>(flatCityQuote());
  const [manualKm, setManualKm] = useState<number | "">("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lookupTimer = useRef<number | null>(null);

  // Menu (to samo, które widzą klienci).
  useEffect(() => {
    fetch("/api/dotykacka/menu")
      .then((r) => r.json())
      .then((d: Menu) => {
        setMenu(d);
        setActiveCat(d?.categories?.[0]?.id ?? "");
      })
      .catch(() => setMenu(null));
  }, []);

  // Rozpoznanie klienta po numerze (auto-prefill przy znanym kliencie).
  const lookup = useCallback(async (phone: string) => {
    if (phone.replace(/\D/g, "").length < 9) {
      setCaller(null);
      return;
    }
    try {
      const res = await fetch(`/api/cti/lookup?phone=${encodeURIComponent(phone)}`);
      const info: CallerInfo = await res.json();
      setCaller(info);
      if (info.known) {
        setForm((f) => ({
          ...f,
          name: f.name || info.name || "",
          street: f.street || info.street || "",
          city: info.city || f.city,
          zip: f.zip || info.zip || "",
        }));
      }
    } catch {
      /* brak lookupu to nie błąd */
    }
  }, []);

  useEffect(() => {
    const initial = params.get("phone");
    if (initial) void lookup(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPhoneChange = (v: string) => {
    setForm((f) => ({ ...f, phone: v }));
    if (lookupTimer.current) window.clearTimeout(lookupTimer.current);
    lookupTimer.current = window.setTimeout(() => void lookup(v), 600);
  };

  // Wycena dostawy (bez GPS — kelnerka zna adres z rozmowy).
  useEffect(() => {
    if (mode === "pickup") {
      setQuote(pickupQuote());
      return;
    }
    if (isKoscierzyna(form.city)) {
      setQuote(flatCityQuote());
      return;
    }
    if (form.street.trim().length < 3) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch("/api/delivery/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode,
            street: form.street,
            city: form.city,
            manualKm: typeof manualKm === "number" ? manualKm : undefined,
          }),
          signal: ctrl.signal,
        });
        setQuote(await res.json());
      } catch {
        /* anulowane */
      }
    }, 500);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [mode, form.street, form.city, manualKm]);

  // Nowa miejscowość = nowa odległość (nie przenoś starej wartości).
  useEffect(() => {
    setManualKm("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.city]);

  // Rabat: kod z ulotki ALBO ręczny rabat kelnerki (jedno z dwóch).
  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState<{ code: string; discount: number; label: string } | null>(null);
  const [promoMsg, setPromoMsg] = useState<string | null>(null);
  const [manualAmount, setManualAmount] = useState<number | "">("");
  const [manualReason, setManualReason] = useState("");

  const applyPromo = useCallback(
    async (codeRaw: string, sub: number, m: FulfillmentMode) => {
      const code = codeRaw.trim();
      if (!code) return;
      setPromoMsg(null);
      try {
        const res = await fetch("/api/promo/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, subtotal: sub, mode: m, phone: form.phone, source: "phone" }),
        });
        const d = await res.json();
        if (d.ok) {
          setPromo({ code: d.code, discount: d.discount, label: d.label });
          setManualAmount("");
        } else {
          setPromo(null);
          setPromoMsg(d.reason ?? "Kod nie zadziałał.");
        }
      } catch {
        setPromoMsg("Nie udało się sprawdzić kodu.");
      }
    },
    [form.phone]
  );

  useEffect(() => {
    if (!promo) return;
    const t = setTimeout(() => applyPromo(promo.code, subtotal, mode), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal, mode]);

  const manual = promo ? 0 : typeof manualAmount === "number" && manualAmount > 0 ? Math.min(manualAmount, subtotal) : 0;
  const discount = promo?.discount ?? manual;

  const deliveryFee = quote.fee;
  const total = Math.max(0, subtotal - discount) + deliveryFee;
  // Minimalna wartość zamówienia z dostawą: do 6 km 40 zł, powyżej 60 zł
  // (bez kosztu dowozu, liczona PRZED rabatem).
  const minOrder = mode === "delivery" ? (quote.minOrder ?? 0) : 0;
  const belowMin = minOrder > 0 && lines.length > 0 && subtotal < minOrder;
  const phoneValid = form.phone.replace(/\D/g, "").length >= 9;
  const canSave =
    !belowMin &&
    lines.length > 0 &&
    form.name.trim().length > 1 &&
    phoneValid &&
    (mode === "pickup" ||
      (form.street.trim().length > 2 && quote.available && !quote.outOfRange && !quote.needsManual));

  async function save() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          timeMode,
          scheduledTime: timeMode === "scheduled" ? scheduledTime : undefined,
          customer: { ...form },
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
          source: "phone",
          staff: localStorage.getItem("mr_staff") ?? undefined,
          etaMinutes: timeMode === "asap" && etaMinutes ? etaMinutes : undefined,
          promoCode: promo?.code,
          manualDiscount: !promo && manual > 0 ? { amount: manual, reason: manualReason } : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Błąd zapisu.");
      clear();
      router.push("/panel");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd zapisu.");
      setSubmitting(false);
    }
  }

  const products = menu?.categories.find((c) => c.id === activeCat)?.products ?? [];
  const etaOptions = mode === "pickup" ? [15, 20, 30, 45] : [30, 45, 60, 75];

  return (
    <main className="min-h-screen pb-28" style={{ background: BG, color: INK }}>
      {/* Pasek górny */}
      <div
        className="sticky top-0 z-40 flex h-16 items-center justify-between px-4"
        style={{ background: CARD, borderBottom: "1px solid rgba(27,23,16,0.08)" }}
      >
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/icon-espresso.png" alt="" className="h-9 w-9 object-contain" />
          <div>
            <div className="text-[13px] font-semibold uppercase tracking-[0.18em]">Zamówienie telefoniczne</div>
            <div className="text-[11px]" style={{ color: MUTED }}>najpierw klient, potem pozycje</div>
          </div>
        </div>
        <Link href="/panel" className="rounded-full px-4 py-2 text-[13px] font-bold" style={{ background: SUB }}>
          ← Panel
        </Link>
      </div>

      <div className="mx-auto grid max-w-[1100px] grid-cols-1 gap-4 p-4 min-[1000px]:grid-cols-[1fr_380px]">
        {/* ---------------- lewa: klient + menu ---------------- */}
        <div>
          {/* KROK 1: KLIENT */}
          <div className="rounded-3xl p-4" style={{ background: CARD, border: "1px solid " + BORDER }}>
            <Sec>1 · Klient</Sec>
            <div className="flex flex-wrap gap-3">
              <Field flex label="Telefon" inputMode="tel" value={form.phone} onChange={onPhoneChange} />
              <Field flex label="Imię i nazwisko" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
            </div>
            {caller?.known && (
              <div
                className="mt-2.5 rounded-xl px-3.5 py-2 text-[12.5px] font-semibold"
                style={{ background: "rgba(140,165,59,0.12)", border: "1px solid rgba(140,165,59,0.35)", color: OLIVE }}
              >
                Stały klient · {caller.orderCount} zam.
                {caller.lastItems?.length ? ` · ostatnio: ${caller.lastItems.join(", ")}` : ""} — dane wypełnione
              </div>
            )}
            {caller && !caller.known && phoneValid && (
              <div className="mt-2.5 text-[12px] font-semibold" style={{ color: MUTED }}>
                Nowy klient — zapisz imię i adres, następnym razem wypełnią się same.
              </div>
            )}
            <div className="mt-3 flex gap-2">
              <Pill on={mode === "delivery"} onClick={() => setMode("delivery")}>Dostawa</Pill>
              <Pill on={mode === "pickup"} onClick={() => setMode("pickup")}>Odbiór osobisty</Pill>
            </div>
            {mode === "delivery" && (
              <div className="mt-3 space-y-3">
                <div className="flex flex-wrap gap-3">
                  <Field flex label="Ulica i numer" value={form.street} onChange={(v) => setForm({ ...form, street: v })} />
                  <Field flex label="Miejscowość" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
                </div>
                <div className="text-[12.5px] font-semibold" style={{ color: quote.outOfRange ? ALERT : MUTED }}>
                  {quote.outOfRange
                    ? `${quote.label} — zaproponuj odbiór osobisty.`
                    : quote.inCity
                      ? `Dostawa: Kościerzyna — ${zl(deliveryFee)} · zamówienie min. ${zl(quote.minOrder ?? 0)}`
                      : quote.km
                        ? `Dostawa: ${quote.km} km — ${zl(deliveryFee)}${quote.remembered ? " (zapamiętana miejscowość)" : ""} · zamówienie min. ${zl(quote.minOrder ?? 0)}`
                        : quote.needsManual
                          ? "Nowa miejscowość — podaj odległość raz, zapamiętamy ją:"
                          : "Wpisz adres — dostawa policzy się sama."}
                </div>
                {quote.needsManual && (
                  <div className="w-48">
                    <label className="block">
                      <span className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.12em]" style={{ color: MUTED }}>
                        Odległość (km)
                      </span>
                      <input
                        type="number"
                        min={1}
                        max={15}
                        value={manualKm}
                        onChange={(e) => setManualKm(e.target.value === "" ? "" : Number(e.target.value))}
                        className="w-full rounded-xl px-3.5 py-3 text-[15px] outline-none"
                        style={{ background: SUB, color: INK, border: "1px solid " + BORDER }}
                      />
                    </label>
                  </div>
                )}
              </div>
            )}
            <div className="mt-3">
              <Field label="Uwagi (domofon, piętro…)" value={form.note} onChange={(v) => setForm({ ...form, note: v })} />
            </div>
          </div>

          {/* KROK 2: MENU */}
          <div className="mt-4 rounded-3xl p-4" style={{ background: CARD, border: "1px solid " + BORDER }}>
            <Sec>2 · Pozycje</Sec>
            {!menu ? (
              <div className="py-6 text-center text-[13px]" style={{ color: MUTED }}>Ładowanie menu…</div>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  {menu.categories.map((c) => (
                    <Pill key={c.id} on={activeCat === c.id} onClick={() => setActiveCat(c.id)}>
                      {c.name}
                    </Pill>
                  ))}
                </div>
                <div className="mt-3 grid grid-cols-1 gap-1 min-[700px]:grid-cols-2">
                  {products.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setModalProduct(p)}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:opacity-90"
                      style={{ background: SUB, border: "1px solid " + BORDER }}
                    >
                      {p.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.image} alt="" className="h-11 w-11 flex-none object-contain" />
                      )}
                      <span className="min-w-0 flex-1 truncate text-[14px] font-bold">{p.name}</span>
                      <span className="flex-none text-[13.5px] font-extrabold" style={{ color: OLIVE }}>{zl(p.price)}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ---------------- prawa: koszyk + czas + zapis ---------------- */}
        <div className="min-[1000px]:sticky min-[1000px]:top-20 min-[1000px]:self-start">
          <div className="rounded-3xl p-4" style={{ background: CARD, border: "1px solid " + BORDER }}>
            <Sec>3 · Zamówienie</Sec>
            {lines.length === 0 ? (
              <div
                className="rounded-2xl py-6 text-center text-[13px]"
                style={{ border: "1.5px dashed rgba(27,23,16,0.15)", color: MUTED }}
              >
                dotknij pozycję z menu, aby dodać
              </div>
            ) : (
              lines.map((l) => (
                <div key={l.lineId} className="flex items-center gap-2.5 border-b py-2.5" style={{ borderColor: BORDER }}>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-bold">{l.name}</div>
                    {l.addons.length > 0 && (
                      <div className="truncate text-[11px]" style={{ color: MUTED }}>
                        {l.addons.map((a) => a.name).join(", ")}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => (l.qty === 1 ? remove(l.lineId) : setQty(l.lineId, l.qty - 1))}
                    className="h-7 w-7 rounded-lg border text-[14px] font-bold"
                    style={{ borderColor: INK }}
                  >
                    −
                  </button>
                  <b className="w-5 text-center text-[14px]">{l.qty}</b>
                  <button
                    onClick={() => setQty(l.lineId, l.qty + 1)}
                    className="h-7 w-7 rounded-lg border text-[14px] font-bold"
                    style={{ borderColor: INK }}
                  >
                    +
                  </button>
                  <span className="w-16 flex-none text-right text-[13.5px] font-extrabold">{zl(lineTotal(l))}</span>
                </div>
              ))
            )}

            <Sec>Na kiedy? (powiedz klientowi)</Sec>
            <div className="flex flex-wrap gap-2">
              <Pill on={timeMode === "asap"} onClick={() => setTimeMode("asap")}>Najszybciej</Pill>
              <Pill on={timeMode === "scheduled"} onClick={() => setTimeMode("scheduled")}>Na godzinę</Pill>
            </div>
            {timeMode === "asap" ? (
              <div className="mt-2.5 flex gap-1.5">
                {etaOptions.map((m) => (
                  <button
                    key={m}
                    onClick={() => setEtaMinutes(etaMinutes === m ? null : m)}
                    className="flex-1 rounded-full py-2.5 text-[14px] font-bold transition"
                    style={
                      etaMinutes === m
                        ? { background: LIME, color: INK }
                        : { background: SUB, border: "1px solid " + BORDER, color: INK }
                    }
                  >
                    {m}&#39;
                  </button>
                ))}
              </div>
            ) : (
              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="mt-2.5 w-full rounded-xl px-3.5 py-3 text-[15px] font-bold outline-none"
                style={{ background: SUB, border: "1px solid " + BORDER, color: INK }}
              />
            )}
            {timeMode === "asap" && !etaMinutes && (
              <div className="mt-1.5 text-[11.5px]" style={{ color: MUTED }}>
                Bez wybranego czasu zamówienie wpadnie do „Nowe" — czas ustawisz później.
              </div>
            )}

            <Sec>Płatność</Sec>
            <div className="flex gap-2">
              <Pill on={payment === "cash"} onClick={() => setPayment("cash")}>Gotówka</Pill>
              <Pill on={payment === "card"} onClick={() => setPayment("card")}>Karta</Pill>
            </div>

            <Sec>Rabat (opcjonalnie)</Sec>
            {promo ? (
              <div className="flex items-center justify-between rounded-xl px-3.5 py-2.5 text-[13px]" style={{ background: SUB }}>
                <span className="font-bold">Kod {promo.label}: −{zl(promo.discount)}</span>
                <button
                  onClick={() => {
                    setPromo(null);
                    setPromoInput("");
                  }}
                  className="text-[12px] font-semibold underline"
                  style={{ color: MUTED }}
                >
                  usuń
                </button>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <input
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === "Enter" && applyPromo(promoInput, subtotal, mode)}
                    placeholder="kod z ulotki, np. ULOTKA15"
                    className="min-w-0 flex-1 rounded-xl px-3.5 py-2.5 text-[13.5px] font-bold uppercase outline-none"
                    style={{ background: SUB, border: "1px solid " + BORDER, color: INK }}
                  />
                  <button
                    onClick={() => applyPromo(promoInput, subtotal, mode)}
                    disabled={!promoInput.trim()}
                    className="rounded-xl px-4 text-[13px] font-bold disabled:opacity-40"
                    style={{ background: LIME, color: "#1D2A22" }}
                  >
                    Zastosuj
                  </button>
                </div>
                <div className="mt-2 flex gap-2">
                  <input
                    type="number"
                    min={0}
                    value={manualAmount === "" ? "" : manualAmount}
                    onChange={(e) => setManualAmount(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="rabat zł"
                    className="w-24 rounded-xl px-3.5 py-2.5 text-[13.5px] font-bold outline-none"
                    style={{ background: SUB, border: "1px solid " + BORDER, color: INK }}
                  />
                  <input
                    value={manualReason}
                    onChange={(e) => setManualReason(e.target.value)}
                    placeholder="powód (np. spóźniona dostawa)"
                    className="min-w-0 flex-1 rounded-xl px-3.5 py-2.5 text-[13.5px] outline-none"
                    style={{ background: SUB, border: "1px solid " + BORDER, color: INK }}
                  />
                </div>
              </>
            )}
            {promoMsg && <p className="mt-1.5 text-[12px] font-semibold" style={{ color: ALERT }}>{promoMsg}</p>}

            <div className="mt-4 border-t pt-3" style={{ borderColor: BORDER }}>
              {discount > 0 && (
                <div className="mb-1 flex items-center justify-between text-[13px]" style={{ color: MUTED }}>
                  <span className="font-bold">Rabat{promo ? ` (${promo.code})` : manualReason ? ` — ${manualReason}` : ""}</span>
                  <span className="font-extrabold" style={{ color: ALERT }}>−{zl(discount)}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-bold" style={{ color: MUTED }}>
                  Razem{mode === "delivery" ? ` (z dostawą ${zl(deliveryFee)})` : ""}
                </span>
                <span className="text-[19px] font-extrabold">{zl(total)}</span>
              </div>
            </div>
            {belowMin && (
              <p className="mt-2 text-center text-[12.5px] font-semibold" style={{ color: ALERT }}>
                Minimum przy dostawie pod ten adres: {zl(minOrder)} (bez kosztu dowozu) — brakuje{" "}
                {zl(minOrder - subtotal)}. Powiedz klientowi albo zaproponuj odbiór osobisty.
              </p>
            )}
            {error && <p className="mt-2 text-center text-[12.5px] font-semibold" style={{ color: ALERT }}>{error}</p>}
            <button
              disabled={!canSave || submitting}
              onClick={save}
              className="mt-3 w-full rounded-full py-4 text-[15px] font-bold transition disabled:opacity-40"
              style={{ background: INK, color: BG }}
            >
              {submitting
                ? "Zapisuję…"
                : canSave
                  ? "Zapisz zamówienie"
                  : belowMin
                    ? `Minimum przy dostawie: ${zl(minOrder)}`
                    : "Uzupełnij dane i pozycje"}
            </button>
          </div>
        </div>
      </div>

      {modalProduct && (
        <ProductModal product={modalProduct} onClose={() => setModalProduct(null)} onAdded={() => {}} />
      )}
    </main>
  );
}

export default function PhoneOrderPage() {
  return (
    <CartProvider storageKey="mammarosa_phone_cart_v1">
      <Suspense
        fallback={
          <main className="grid min-h-screen place-items-center text-sm font-semibold" style={{ background: BG, color: MUTED }}>
            Ładowanie…
          </main>
        }
      >
        <PhoneOrderInner />
      </Suspense>
    </CartProvider>
  );
}
