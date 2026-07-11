"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import type { MenuAddon, MenuProduct } from "@/lib/dotykacka/types";

export interface CartLineAddon {
  id: string;
  name: string;
  price: number;
}

export interface CartLine {
  lineId: string;
  productId: string;
  name: string;
  basePrice: number;
  qty: number;
  addons: CartLineAddon[];
  image?: string; // zdjęcie produktu (miniatura w koszyku/checkoucie)
  note?: string;
}

interface CartState {
  lines: CartLine[];
}

type Action =
  | { type: "ADD"; line: CartLine }
  | { type: "SET_QTY"; lineId: string; qty: number }
  | { type: "REMOVE"; lineId: string }
  | { type: "CLEAR" }
  | { type: "HYDRATE"; state: CartState };

const DEFAULT_STORAGE_KEY = "mammarosa_cart_v1";

function reducer(state: CartState, action: Action): CartState {
  switch (action.type) {
    case "ADD":
      return { lines: [...state.lines, action.line] };
    case "SET_QTY":
      return {
        lines: state.lines
          .map((l) => (l.lineId === action.lineId ? { ...l, qty: Math.max(0, action.qty) } : l))
          .filter((l) => l.qty > 0),
      };
    case "REMOVE":
      return { lines: state.lines.filter((l) => l.lineId !== action.lineId) };
    case "CLEAR":
      return { lines: [] };
    case "HYDRATE":
      return action.state;
    default:
      return state;
  }
}

export function lineTotal(line: CartLine): number {
  const addons = line.addons.reduce((s, a) => s + a.price, 0);
  return (line.basePrice + addons) * line.qty;
}

interface CartContextValue {
  lines: CartLine[];
  itemCount: number;
  subtotal: number;
  addProduct: (product: MenuProduct, qty: number, addons: MenuAddon[], note?: string) => void;
  setQty: (lineId: string, qty: number) => void;
  remove: (lineId: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

let lineCounter = 0;
function makeLineId(): string {
  lineCounter += 1;
  return `l${Date.now()}_${lineCounter}`;
}

export function CartProvider({
  children,
  storageKey = DEFAULT_STORAGE_KEY,
}: {
  children: ReactNode;
  /** Osobny klucz np. dla koszyka zamówień telefonicznych w panelu. */
  storageKey?: string;
}) {
  const [state, dispatch] = useReducer(reducer, { lines: [] });

  // Hydratacja z localStorage (po stronie klienta).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) dispatch({ type: "HYDRATE", state: JSON.parse(raw) as CartState });
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state, storageKey]);

  const value = useMemo<CartContextValue>(() => {
    const itemCount = state.lines.reduce((s, l) => s + l.qty, 0);
    const subtotal = state.lines.reduce((s, l) => s + lineTotal(l), 0);
    return {
      lines: state.lines,
      itemCount,
      subtotal,
      addProduct: (product, qty, addons, note) =>
        dispatch({
          type: "ADD",
          line: {
            lineId: makeLineId(),
            productId: product.id,
            name: product.name,
            basePrice: product.price,
            qty,
            addons: addons.map((a) => ({ id: a.id, name: a.name, price: a.price })),
            image: product.image,
            note,
          },
        }),
      setQty: (lineId, qty) => dispatch({ type: "SET_QTY", lineId, qty }),
      remove: (lineId) => dispatch({ type: "REMOVE", lineId }),
      clear: () => dispatch({ type: "CLEAR" }),
    };
  }, [state]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart musi być użyte wewnątrz <CartProvider>");
  return ctx;
}
