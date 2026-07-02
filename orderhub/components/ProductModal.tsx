"use client";

import { useMemo, useState } from "react";
import type { MenuAddon, MenuProduct } from "@/lib/dotykacka/types";
import { useCart } from "@/lib/cart/CartProvider";
import { zl } from "@/lib/format";
import { DishArt, dishKindFor } from "./DishArt";

const INK = "#1D2A22";
const LIME = "#D5E36B";

export function ProductModal({
  product,
  onClose,
  onAdded,
}: {
  product: MenuProduct;
  onClose: () => void;
  onAdded?: (name: string, qty: number) => void;
}) {
  const { addProduct } = useCart();
  const [qty, setQty] = useState(1);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const addons = product.addons ?? [];
  const chosen = useMemo<MenuAddon[]>(
    () => addons.filter((a) => selected[a.id]),
    [addons, selected]
  );
  const unit = product.price + chosen.reduce((s, a) => s + a.price, 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#1D2A22]/45 backdrop-blur-[2px] sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-t-[28px] bg-[#F5F1E8] sm:rounded-[28px]"
        style={{ color: INK }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ilustracja / zdjęcie */}
        <div className="relative bg-[radial-gradient(120%_120%_at_30%_15%,#FBF8F1_0%,#EFE7D6_100%)] px-10 pb-2 pt-8">
          {product.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.image} alt={product.name} className="mx-auto aspect-square w-56 rounded-3xl object-cover" />
          ) : (
            <DishArt kind={dishKindFor(product.name)} className="mx-auto aspect-square w-56" />
          )}
          <button
            onClick={onClose}
            aria-label="Zamknij"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm"
          >
            <svg viewBox="0 0 24 24" className="h-4.5 w-4.5">
              <path d="M6 6 L18 18 M18 6 L6 18" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="px-6 pb-6 pt-4">
          <h2 className="text-[22px] font-bold tracking-[-0.02em]">{product.name}</h2>
          {product.description && (
            <p className="mt-1 text-[13px] leading-relaxed text-[#A79E8C]">{product.description}</p>
          )}

          {addons.length > 0 && (
            <div className="mt-5">
              <div className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#A79E8C]">
                Dodatki
              </div>
              <div className="space-y-2">
                {addons.map((a) => {
                  const on = !!selected[a.id];
                  return (
                    <button
                      key={a.id}
                      onClick={() => setSelected((s) => ({ ...s, [a.id]: !s[a.id] }))}
                      className="flex w-full items-center gap-3 rounded-2xl bg-white px-4 py-3 text-left transition"
                      style={on ? { boxShadow: `inset 0 0 0 2px ${INK}` } : undefined}
                    >
                      <span
                        className="flex h-5 w-5 items-center justify-center rounded-full border-2 transition"
                        style={on ? { background: INK, borderColor: INK } : { borderColor: "#D8CFBC" }}
                      >
                        {on && (
                          <svg viewBox="0 0 24 24" className="h-3 w-3">
                            <path d="M5 12.5 L10 17 L19 7" fill="none" stroke={LIME} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                      <span className="flex-1 text-[14px] font-semibold">{a.name}</span>
                      <span className="text-[13px] font-bold text-[#A79E8C]">+{zl(a.price)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Ilość */}
          <div className="mt-5 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#A79E8C]">Ilość</span>
            <div className="flex items-center gap-1 rounded-full bg-white p-1">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="flex h-9 w-9 items-center justify-center rounded-full text-lg font-bold transition hover:bg-[#F1EADB]"
              >
                −
              </button>
              <span className="w-8 text-center text-[15px] font-extrabold">{qty}</span>
              <button
                onClick={() => setQty((q) => q + 1)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-lg font-bold transition hover:bg-[#F1EADB]"
              >
                +
              </button>
            </div>
          </div>

          <button
            onClick={() => {
              addProduct(product, qty, chosen);
              onClose();
              onAdded?.(product.name, qty);
            }}
            className="mt-5 flex w-full items-center justify-between rounded-full py-4 pl-6 pr-6 text-[15px] font-bold text-[#F5F1E8]"
            style={{ background: INK }}
          >
            <span>Dodaj do koszyka</span>
            <span style={{ color: LIME }}>{zl(unit * qty)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
