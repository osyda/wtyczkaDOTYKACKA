"use client";

import { useMemo, useState } from "react";
import type { MenuAddon, MenuProduct } from "@/lib/dotykacka/types";
import { useCart } from "@/lib/cart/CartProvider";
import { zl } from "@/lib/format";

export function ProductModal({
  product,
  onClose,
}: {
  product: MenuProduct;
  onClose: () => void;
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
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-t-3xl bg-white text-[#1F1714] sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Nagłówek ze zdjęciem / placeholderem */}
        <div
          className="relative aspect-[16/10] w-full"
          style={{
            background: product.color
              ? `radial-gradient(120% 120% at 30% 20%, ${product.color}40 0%, ${product.color}26 45%, #FFF8EC 100%)`
              : "radial-gradient(120% 120% at 30% 20%, #F3E6D2 0%, #FFF8EC 100%)",
          }}
        >
          {product.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center text-7xl drop-shadow-sm">
              {product.emoji ?? "🍕"}
            </span>
          )}
          <button
            onClick={onClose}
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/85 text-xl leading-none text-[#1F1714] shadow"
          >
            ×
          </button>
        </div>

        <div className="p-5">
          <h2 className="font-display text-2xl font-semibold">{product.name}</h2>
          {product.description && (
            <p className="mb-4 mt-1 text-sm text-[#9a8a7c]">{product.description}</p>
          )}

        {addons.length > 0 && (
          <div className="mb-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#9a8a7c]">
              Dodatki
            </div>
            <div className="space-y-2">
              {addons.map((a) => (
                <label
                  key={a.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-3 text-sm ${
                    selected[a.id] ? "border-[#5C6B3C] bg-[#EDEFE2]" : "border-[#E3D2BA]"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[#5C6B3C]"
                    checked={!!selected[a.id]}
                    onChange={(e) => setSelected((s) => ({ ...s, [a.id]: e.target.checked }))}
                  />
                  <span className="flex-1 font-medium">{a.name}</span>
                  <span className="text-[#6a5a4e]">+ {zl(a.price)}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm font-semibold text-[#9a8a7c]">Ilość</span>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="h-9 w-9 rounded-lg bg-[#F0E2CD] text-xl font-bold"
            >
              −
            </button>
            <span className="w-6 text-center text-lg font-bold">{qty}</span>
            <button
              onClick={() => setQty((q) => q + 1)}
              className="h-9 w-9 rounded-lg bg-[#F0E2CD] text-xl font-bold"
            >
              +
            </button>
          </div>
        </div>

        <button
          onClick={() => {
            addProduct(product, qty, chosen);
            onClose();
          }}
          className="flex w-full items-center justify-between rounded-2xl bg-[#5C6B3C] px-5 py-4 font-extrabold text-white"
        >
          <span>Dodaj do koszyka</span>
          <span>{zl(unit * qty)}</span>
        </button>
        </div>
      </div>
    </div>
  );
}
