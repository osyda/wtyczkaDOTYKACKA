"use client";

import { useState } from "react";
import type { Menu, MenuProduct } from "@/lib/dotykacka/types";
import { zl } from "@/lib/format";
import { useCart } from "@/lib/cart/CartProvider";
import { ProductModal } from "./ProductModal";
import { CartBar } from "./CartBar";

export function Shop({ menu }: { menu: Menu }) {
  const isLive = menu.source === "live";
  const [activeCat, setActiveCat] = useState(menu.categories[0]?.id ?? "");
  const [modalProduct, setModalProduct] = useState<MenuProduct | null>(null);
  const { addProduct } = useCart();

  const onAdd = (p: MenuProduct) => {
    if (p.addons && p.addons.length > 0) {
      setModalProduct(p);
    } else {
      addProduct(p, 1, []);
    }
  };

  return (
    <main className="min-h-screen bg-[#fff8f0] pb-28 text-[#2a211c]">
      {/* Hero */}
      <div className="bg-gradient-to-br from-[#b21f1f] to-[#7d1414] px-5 py-6 text-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-2xl">
              🍕
            </div>
            <div>
              <h1 className="text-xl font-bold leading-tight">Mamma Rosa</h1>
              <p className="text-xs opacity-85">Kościerzyna · Pizza &amp; Pasta</p>
            </div>
          </div>
          <span
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              isLive ? "bg-green-500/90 text-white" : "bg-amber-400 text-amber-950"
            }`}
          >
            {isLive ? "🟢 Na żywo" : "🟡 DEMO"}
          </span>
        </div>
      </div>

      {/* Kategorie (sticky) */}
      <div className="sticky top-0 z-30 border-b border-[#f0e3d6] bg-white">
        <div className="mx-auto flex max-w-3xl gap-2 overflow-auto px-5 py-3">
          {menu.categories.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setActiveCat(c.id);
                document.getElementById(`cat-${c.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ${
                activeCat === c.id ? "bg-[#b21f1f] text-white" : "bg-[#f6ece2] text-[#8a7a6e]"
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
          <section key={cat.id} id={`cat-${cat.id}`} className="mb-8 scroll-mt-20">
            <h2 className="mb-3 text-lg font-extrabold text-[#7d1414]">{cat.name}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {cat.products.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onAdd(p)}
                  className="flex gap-3 rounded-2xl border border-[#f0e3d6] bg-white p-3 text-left transition hover:border-[#b21f1f]"
                >
                  <div
                    className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl text-2xl"
                    style={{ background: p.color ? `${p.color}22` : "#fbeede" }}
                  >
                    🍕
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold">{p.name}</h3>
                    {p.description && (
                      <p className="line-clamp-2 text-xs leading-snug text-[#9a8a7c]">
                        {p.description}
                      </p>
                    )}
                    <div className="mt-2 flex items-center justify-between">
                      <span className="font-extrabold">{zl(p.price)}</span>
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#15803d] text-xl font-bold text-white">
                        +
                      </span>
                    </div>
                  </div>
                </button>
              ))}
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
