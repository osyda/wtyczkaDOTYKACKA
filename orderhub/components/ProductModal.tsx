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
        className="w-full max-w-md rounded-t-3xl bg-white p-5 text-[#2a211c] sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-start justify-between">
          <h2 className="text-xl font-extrabold">{product.name}</h2>
          <button onClick={onClose} className="text-2xl leading-none text-[#9a8a7c]">
            ×
          </button>
        </div>
        {product.description && (
          <p className="mb-4 text-sm text-[#9a8a7c]">{product.description}</p>
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
                    selected[a.id] ? "border-[#15803d] bg-[#eaf6ee]" : "border-[#eaddcf]"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[#15803d]"
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
              className="h-9 w-9 rounded-lg bg-[#f6ece2] text-xl font-bold"
            >
              −
            </button>
            <span className="w-6 text-center text-lg font-bold">{qty}</span>
            <button
              onClick={() => setQty((q) => q + 1)}
              className="h-9 w-9 rounded-lg bg-[#f6ece2] text-xl font-bold"
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
          className="flex w-full items-center justify-between rounded-2xl bg-[#15803d] px-5 py-4 font-extrabold text-white"
        >
          <span>Dodaj do koszyka</span>
          <span>{zl(unit * qty)}</span>
        </button>
      </div>
    </div>
  );
}
