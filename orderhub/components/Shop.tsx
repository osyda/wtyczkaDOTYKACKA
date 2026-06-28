"use client";

import Link from "next/link";
import { useState } from "react";
import type { Menu, MenuProduct } from "@/lib/dotykacka/types";
import { zl } from "@/lib/format";
import { useCart } from "@/lib/cart/CartProvider";
import { ProductModal } from "./ProductModal";

function emojiFor(cat: string, name: string): string {
  const s = `${cat} ${name}`.toLowerCase();
  if (/pizza/.test(s)) return "🍕";
  if (/(napój|napoj|cola|sok|woda|piwo|drink|lemoniad|kawa|herbat)/.test(s)) return "🥤";
  if (/(deser|tiramisu|panna|lody|ciasto|cake|sernik)/.test(s)) return "🍰";
  if (/(makaron|pasta|spaghetti|tagliatelle|lasagne|gnocchi)/.test(s)) return "🍝";
  if (/(sałat|salat|salad|cezar)/.test(s)) return "🥗";
  if (/burger/.test(s)) return "🍔";
  if (/(zupa|soup)/.test(s)) return "🍲";
  return "🍽️";
}

// Naprzemienne odcienie kart (jak w referencji: jaśniejszy / ciemniejszy róż).
const CARD_TINTS = [
  "linear-gradient(180deg,#D8A9A2 0%,#C88E88 100%)",
  "linear-gradient(180deg,#C58C8A 0%,#B07A79 100%)",
];

export function Shop({ menu }: { menu: Menu }) {
  const isLive = menu.source === "live";
  const [activeCat, setActiveCat] = useState(menu.categories[0]?.id ?? "");
  const [modalProduct, setModalProduct] = useState<MenuProduct | null>(null);
  const { addProduct, itemCount } = useCart();

  const onAdd = (p: MenuProduct) => {
    if (p.addons && p.addons.length > 0) setModalProduct(p);
    else addProduct(p, 1, []);
  };

  const current = menu.categories.find((c) => c.id === activeCat) ?? menu.categories[0];

  return (
    <main className="min-h-screen bg-[#F3ECE7] pb-24 text-[#33272A]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-6">
        <button className="text-2xl text-[#33272A]" aria-label="Menu">≡</button>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-[#9B8B86]">
            {isLive ? "🟢 live" : "DEMO"}
          </span>
          <Link
            href="/checkout"
            className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg shadow-sm"
          >
            🛒
            {itemCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#C88E88] text-[11px] font-bold text-white">
                {itemCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Tytuł + sort */}
      <div className="flex items-end justify-between px-6 pb-5 pt-6">
        <h1 className="font-display text-[34px] font-semibold leading-[1.05]">
          Mamma&nbsp;Rosa
          <br />
          <span className="text-[#9B8B86]">menu dostawy</span>
        </h1>
        <div className="pb-1 text-right text-xs text-[#9B8B86]">
          Sortuj wg
          <br />
          <span className="font-semibold text-[#33272A]">Popularności ⌄</span>
        </div>
      </div>

      {/* Siatka produktów */}
      <div className="grid grid-cols-2 gap-4 px-5">
        {current?.products.map((p, i) => {
          const emoji = p.emoji ?? emojiFor(current.name, p.name);
          return (
            <div
              key={p.id}
              className="relative rounded-[28px] px-4 pb-7 pt-6 text-center text-[#33272A] shadow-[0_14px_30px_rgba(120,70,70,0.18)]"
              style={{ background: CARD_TINTS[i % 2] }}
            >
              {/* Talerz / zdjęcie */}
              <div className="mx-auto mb-3 h-28 w-28 overflow-hidden rounded-full shadow-[0_10px_22px_rgba(0,0,0,0.28)]">
                {p.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
                ) : (
                  <div
                    className="flex h-full w-full items-center justify-center text-5xl"
                    style={{ background: "radial-gradient(circle at 35% 30%,#4b3a3a,#241b1b)" }}
                  >
                    {emoji}
                  </div>
                )}
              </div>

              <div className="text-lg font-extrabold">{zl(p.price)}</div>
              <div className="mx-auto mt-1 min-h-[34px] text-sm font-medium leading-tight">
                {p.name}
              </div>
              <div className="mt-1 text-xs tracking-wide text-white/70">★★★★★</div>

              {/* Przycisk + */}
              <button
                onClick={() => onAdd(p)}
                aria-label={`Dodaj ${p.name}`}
                className="absolute -bottom-4 left-1/2 flex h-11 w-11 -translate-x-1/2 items-center justify-center rounded-full bg-[#5E423F] text-2xl font-light text-white shadow-lg transition active:scale-95"
              >
                +
              </button>
            </div>
          );
        })}
      </div>

      {/* Dolny pasek kategorii */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#E6DAD4] bg-[#F3ECE7]/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl gap-2 overflow-auto px-5 py-3">
          {menu.categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCat(c.id)}
              className={`whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                activeCat === c.id
                  ? "bg-[#5E423F] text-white"
                  : "bg-white text-[#9B8B86]"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {modalProduct && (
        <ProductModal product={modalProduct} onClose={() => setModalProduct(null)} />
      )}
    </main>
  );
}
