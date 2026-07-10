/** Model zamówienia wspólny dla sklepu, POS i panelu kelnerki. */

export type FulfillmentMode = "delivery" | "pickup";
export type TimeMode = "asap" | "scheduled";
export type Payment = "cash" | "card" | "online";

/** Cykl życia zamówienia w naszym systemie. */
export type OrderStatus =
  | "new" // ASAP, czeka na ustawienie czasu przez kelnerkę
  | "scheduled" // na konkretną godzinę, omija ETA
  | "in_progress" // czas ustawiony / w przygotowaniu
  | "ready" // gotowe do odbioru / wydania
  | "on_delivery" // w drodze
  | "completed"
  | "canceled";

export interface OrderItemAddon {
  id: string;
  name: string;
  price: number;
}

export interface OrderItem {
  productId: string;
  name: string;
  qty: number;
  basePrice: number;
  addons: OrderItemAddon[];
  lineTotal: number;
}

export interface OrderCustomer {
  name: string;
  phone: string;
  street?: string;
  city?: string;
  zip?: string;
  note?: string;
}

export interface Order {
  id: string;
  externalId: string; // np. mr-1043 — idempotencja w POS
  number: number; // krótki numer dla obsługi
  createdAt: string;
  status: OrderStatus;

  mode: FulfillmentMode;
  timeMode: TimeMode;
  scheduledTime?: string; // "18:00" gdy timeMode=scheduled
  etaMinutes?: number; // ustawione przez kelnerkę dla ASAP
  etaAt?: string; // wyliczona godzina gotowości (ISO)

  customer: OrderCustomer;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  payment: Payment;

  /** Kto obsłużył (imię z logowania kodem Dotykački / "obsługa"). */
  staff?: string;
  /** Powód anulowania (gdy status = canceled). */
  cancelReason?: string;

  // Integracja z Dotykačką
  pos: {
    sent: boolean;
    simulated: boolean;
    orderNumber?: string | null;
    customerId?: string | null;
    error?: string | null;
  };
}

/** Dane przychodzące z checkoutu (przed nadaniem id/numeru). */
export interface NewOrderInput {
  mode: FulfillmentMode;
  timeMode: TimeMode;
  scheduledTime?: string;
  customer: OrderCustomer;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  payment: Payment;
}
