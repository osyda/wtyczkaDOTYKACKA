import { NextResponse, after } from "next/server";
import { orderStore, setEta } from "@/lib/orders/store";
import { sendOrderToPos, issueOrderInPos } from "@/lib/dotykacka/pos";
import { hasCredentials, posSendEnabled } from "@/lib/dotykacka/config";
import { getOpenState } from "@/lib/hours";
import { minOrderForFee } from "@/lib/delivery";
import { checkPromoCode, redeemPromoCode } from "@/lib/promo";
import { sendOrderConfirmation } from "@/lib/email";
import type { NewOrderInput, Order } from "@/lib/orders/types";

type OrderPayload = NewOrderInput & {
  source?: "online" | "phone";
  staff?: string;
  /** Telefoniczne: kelnerka podaje czas od razu podczas rozmowy. */
  etaMinutes?: number;
  /** Kod rabatowy — serwer sam przelicza i zużywa. */
  promoCode?: string;
  /** Rabat ręczny obsługi (tylko telefoniczne), z powodem. */
  manualDiscount?: { amount?: number; reason?: string };
  /** Kierowca przypisany od razu przy przyjęciu telefonu (dostawy). */
  driver?: string;
};

export const dynamic = "force-dynamic";

export async function GET() {
  const orders = await orderStore.list();
  return NextResponse.json({ orders });
}

export async function POST(req: Request) {
  let input: OrderPayload;
  try {
    input = (await req.json()) as OrderPayload;
  } catch {
    return NextResponse.json({ error: "Nieprawidłowe dane." }, { status: 400 });
  }

  if (!input.items?.length || !input.customer?.phone) {
    return NextResponse.json({ error: "Brak pozycji lub telefonu." }, { status: 400 });
  }

  // Godziny otwarcia: klienci online tylko w oknie przyjmowania zamówień.
  // Telefoniczne (kelnerka) przechodzą zawsze — obsługa wie, co robi.
  if (input.source !== "phone") {
    const hours = await getOpenState();
    if (!hours.acceptingOrders) {
      return NextResponse.json({ error: hours.message }, { status: 403 });
    }
    // Minimalna wartość zamówienia z dostawą (do 6 km: 40 zł, dalej: 60 zł).
    if (input.mode === "delivery") {
      const min = minOrderForFee(input.deliveryFee ?? 0);
      if ((input.subtotal ?? 0) < min) {
        return NextResponse.json(
          { error: `Minimalna wartość zamówienia z dostawą pod ten adres to ${min} zł (bez kosztu dostawy).` },
          { status: 400 }
        );
      }
    }
  }

  // Rabat: kod (przeliczany i pilnowany na serwerze) albo ręczny od kelnerki.
  // Minimum dostawy sprawdzone wyżej OD KOSZYKA PRZED rabatem — zgodnie z planem.
  let discount: Order["discount"];
  if (input.promoCode?.trim()) {
    const check = await checkPromoCode({
      code: input.promoCode,
      subtotal: input.subtotal ?? 0,
      mode: input.mode,
      phone: input.customer.phone,
      source: input.source ?? "online",
    });
    if (!check.ok) {
      return NextResponse.json({ error: `Kod rabatowy: ${check.reason}` }, { status: 400 });
    }
    discount = { amount: check.discount, code: check.code };
  } else if (input.source === "phone" && input.manualDiscount?.amount) {
    const amount = Math.min(Math.round(Number(input.manualDiscount.amount) * 100) / 100, input.subtotal ?? 0);
    if (amount > 0) discount = { amount, reason: input.manualDiscount.reason?.trim() || "rabat obsługi" };
  }
  // Opakowania na wynos: liczone z pozycji (sztuki × cena produktu z POS).
  const packagingFee =
    Math.round(
      (input.items ?? []).reduce((s, it) => s + (it.packaging && it.packaging.price > 0 ? it.qty * it.packaging.price : 0), 0) * 100
    ) / 100;

  // Suma zawsze liczona na serwerze: koszyk − rabat + opakowania + dostawa.
  input.total =
    Math.round(
      (Math.max(0, (input.subtotal ?? 0) - (discount?.amount ?? 0)) + packagingFee + (input.deliveryFee ?? 0)) * 100
    ) / 100;

  let order = await orderStore.create(input);

  // Metadane spoza koszyka: źródło, podpis obsługi, czas podany przy telefonie.
  const extra: Partial<Order> = {};
  if (discount) {
    extra.discount = discount;
    if (discount.code) await redeemPromoCode(discount.code, input.customer.phone);
  }
  if (input.source) extra.source = input.source;
  if (input.staff?.trim()) extra.staff = input.staff.trim();
  if (input.driver?.trim() && input.mode === "delivery") extra.driver = input.driver.trim();
  if (input.etaMinutes && order.timeMode === "asap" && Number.isFinite(input.etaMinutes)) {
    Object.assign(extra, setEta(order, Number(input.etaMinutes)));
  }
  if (Object.keys(extra).length > 0) {
    order = (await orderStore.update(order.id, extra)) ?? order;
  }

  // Wyślij do POS (lub symuluj w trybie DEMO).
  // Tryb „rachunek na koncie kierowcy" (DOTYKACKA_CREATE_ON_DRIVER=true):
  // dostawy BEZ kierowcy czekają z wysyłką do POS do momentu przypisania —
  // wtedy zamówienie powstaje od razu z user-id kierowcy.
  const deferToDriver =
    process.env.DOTYKACKA_CREATE_ON_DRIVER === "true" &&
    hasCredentials() &&
    posSendEnabled() &&
    order.mode === "delivery" &&
    !order.driver;

  const pos = deferToDriver
    ? { sent: false, simulated: false, orderNumber: null, customerId: null, error: null, deferred: true }
    : await sendOrderToPos(order);
  let updated = await orderStore.update(order.id, { pos });

  // Telefoniczne z kierowcą wybranym od razu: rachunek (niefiskalny) drukuje się
  // z konta kierowcy już teraz (za podwójnym bezpiecznikiem — patrz issueOrderInPos).
  if ((updated ?? order).driver && (updated ?? order).mode === "delivery") {
    const issue = await issueOrderInPos(updated ?? order);
    if (!issue.ok && issue.error) {
      updated = (await orderStore.update(order.id, { pos: { ...pos, error: issue.error } })) ?? updated;
    }
  }

  // Potwierdzenie mailowe (gdy klient podał adres) — PO wysłaniu odpowiedzi.
  // after() gwarantuje, że serverless nie utnie wysyłki (goły void był ucinany).
  const origin = new URL(req.url).origin;
  const forEmail = updated ?? order;
  after(async () => {
    const result = await sendOrderConfirmation(forEmail, origin);
    if (result.error) console.error(`[email] zamówienie #${forEmail.number}:`, result.error);
  });

  return NextResponse.json({ order: updated ?? order }, { status: 201 });
}
