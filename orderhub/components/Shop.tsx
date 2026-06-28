"use client";

import { useState } from "react";
import type { Menu, MenuProduct } from "@/lib/dotykacka/types";
import { zl } from "@/lib/format";
import { useCart } from "@/lib/cart/CartProvider";
import { ProductModal } from "./ProductModal";
import { CartBar } from "./CartBar";

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

export function Shop({ menu }: { menu: Menu }) {
  const isLive = menu.source === "live";
  const [activeCat, setActiveCat] = useState(menu.categories[0]?.id ?? "");
  const [modalProduct, setModalProduct] = useState<MenuProduct | null>(null);
  const { addProduct } = useCart();

  const onAdd = (p: MenuProduct) => {
    if (p.addons && p.addons.length > 0) setModalProduct(p);
    else addProduct(p, 1, []);
  };

  return (
    <main className="min-h-screen bg-[#F7E9D5] pb-28 text-[#1F1714]">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#B7382F] to-[#8E2C24] px-5 pb-7 pt-6 text-white">
        <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-16 -left-10 h-44 w-44 rounded-full bg-black/10" />
        <div className="relative mx-auto max-w-3xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/icon-white.png" alt="Mamma Rosa" className="h-12 w-12 object-contain" />
              <div>
                <h1 className="font-display text-2xl font-semibold leading-tight">Mamma Rosa</h1>
                <p className="text-xs opacity-85">Kościerzyna · Pizza &amp; Pasta</p>
              </div>
            </div>
            <span
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                isLive ? "bg-[#5C6B3C] text-white" : "bg-[#E0C089] text-[#1F1714]"
              }`}
            >
              {isLive ? "🟢 Na żywo" : "🟡 DEMO"}
            </span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-white/15 px-3 py-1.5 font-medium backdrop-blur">⏱ ~35 min</span>
            <span className="rounded-full bg-white/15 px-3 py-1.5 font-medium backdrop-blur">🛵 dostawa od 5 zł</span>
            <span className="rounded-full bg-white/15 px-3 py-1.5 font-medium backdrop-blur">🏠 odbiór osobisty</span>
          </div>
        </div>
      </div>

      {/* Kategorie (sticky) */}
      <div className="sticky top-0 z-30 border-b border-[#E7D4BC] bg-[#F7E9D5]/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl gap-2 overflow-auto px-5 py-3">
          {menu.categories.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setActiveCat(c.id);
                document.getElementById(`cat-${c.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeCat === c.id
                  ? "bg-[#B7382F] text-white shadow-sm"
                  : "bg-white text-[#8a7a6e] hover:bg-[#F0E2CD]"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      <div className="mx-auto max-w-3xl px-5 py-6">
        {menu.categories.map((cat) => (
          <section key={cat.id} id={`cat-${cat.id}`} className="mb-9 scroll-mt-20">
            <h2 className="mb-4 font-display text-2xl font-semibold text-[#8E2C24]">{cat.name}</h2>
            <div className="grid grid-cols-2 gap-4">
              {cat.products.map((p) => {
                const emoji = p.emoji ?? emojiFor(cat.name, p.name);
                return (
                  <button
                    key={p.id}
                    onClick={() => onAdd(p)}
                    className="group flex flex-col overflow-hidden rounded-3xl border border-[#EEDFC9] bg-white text-left shadow-[0_6px_18px_rgba(31,23,20,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(31,23,20,0.1)]"
                  >
                    {/* Zdjęcie / placeholder */}
                    <div
                      className="relative aspect-[5/4] w-full"
                      style={{
                        background: p.color
                          ? `radial-gradient(120% 120% at 30% 20%, ${p.color}33 0%, ${p.color}1f 45%, #FFF8EC 100%)`
                          : "radial-gradient(120% 120% at 30% 20%, #F3E6D2 0%, #FFF8EC 100%)",
                      }}
                    >
                      {p.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
                      ) : (
                        <span className="absolute inset-0 flex items-center justify-center text-6xl drop-shadow-sm">
                          {emoji}
                        </span>
                      )}
                      {/* Floating add */}
                      <span className="absolute -bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#5C6B3C] text-2xl font-bold text-white shadow-lg transition group-hover:scale-105">
                        +
                      </span>
                    </div>
                    {/* Treść */}
                    <div className="flex flex-1 flex-col p-3 pt-4">
                      <h3 className="font-display text-base font-semibold leading-tight">{p.name}</h3>
                      {p.description && (
                        <p className="mt-1 line-clamp-2 text-xs leading-snug text-[#9a8a7c]">{p.description}</p>
                      )}
                      <div className="mt-2 font-extrabold text-[#1F1714]">{zl(p.price)}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <CartBar />
      {modalProduct && (
        <ProductModal product={modalProduct} onClose={() => setModalProduct(null)} />
      )}
    </main>
  );
}
