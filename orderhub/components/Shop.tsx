"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Menu, MenuProduct } from "@/lib/dotykacka/types";
import { zl } from "@/lib/format";
import { useCart } from "@/lib/cart/CartProvider";
import { ProductModal } from "./ProductModal";
import { DishArt, dishKindFor } from "./DishArt";

/* ---------- Ikony (minimalne, kreskowe — zero emoji) ---------- */

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

function IconSearch({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...{ width: undefined }}>
      <circle cx="11" cy="11" r="6.5" {...stroke} />
      <path d="M16 16 L21 21" {...stroke} />
    </svg>
  );
}
function IconCart({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path d="M3 4h2l2.4 12.2a1.6 1.6 0 0 0 1.6 1.3h8.6a1.6 1.6 0 0 0 1.6-1.3L21 8H6" {...stroke} />
      <circle cx="10" cy="21" r="1.4" fill="currentColor" />
      <circle cx="17.5" cy="21" r="1.4" fill="currentColor" />
    </svg>
  );
}
function IconGrid({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <rect x="4" y="4" width="7" height="7" rx="2" {...stroke} />
      <rect x="13" y="4" width="7" height="7" rx="2" {...stroke} />
      <rect x="4" y="13" width="7" height="7" rx="2" {...stroke} />
      <rect x="13" y="13" width="7" height="7" rx="2" {...stroke} />
    </svg>
  );
}
function IconPizza({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path d="M12 3 L21 19 Q12 23 3 19 Z" {...stroke} />
      <path d="M5.5 17.5 Q12 20.5 18.5 17.5" {...stroke} />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" />
      <circle cx="9" cy="16" r="1.2" fill="currentColor" />
      <circle cx="15" cy="16" r="1.2" fill="currentColor" />
    </svg>
  );
}
function IconCup({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path d="M6 4 L7.5 20 a1.5 1.5 0 0 0 1.5 1.3 h6 a1.5 1.5 0 0 0 1.5 -1.3 L18 4 Z" {...stroke} />
      <path d="M6.5 9 H17.5" {...stroke} />
      <path d="M14 4 L16.5 1.5" {...stroke} />
    </svg>
  );
}
function IconCake({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path d="M4 20 V13 a2 2 0 0 1 2-2 h12 a2 2 0 0 1 2 2 v7" {...stroke} />
      <path d="M4 16 q2 1.6 4 0 t4 0 t4 0 t4 0" {...stroke} />
      <path d="M12 11 V8" {...stroke} />
      <circle cx="12" cy="6.4" r="1.1" fill="currentColor" />
      <path d="M3 20.5 H21" {...stroke} />
    </svg>
  );
}
function IconArrow({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path d="M4 12 H20 M14 6 L20 12 L14 18" {...stroke} />
    </svg>
  );
}

function catIcon(name: string, className: string) {
  const s = name.toLowerCase();
  if (/pizza/.test(s)) return <IconPizza className={className} />;
  if (/(napo|drink)/.test(s)) return <IconCup className={className} />;
  if (/(deser|dessert)/.test(s)) return <IconCake className={className} />;
  return <IconGrid className={className} />;
}

/* ---------- Ekran ---------- */

const INK = "#1D2A22"; // głęboka zieleń-czerń
const LIME = "#D5E36B"; // akcent

export function Shop({ menu }: { menu: Menu }) {
  const isLive = menu.source === "live";
  const [activeCat, setActiveCat] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [modalProduct, setModalProduct] = useState<MenuProduct | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const { lines, itemCount, subtotal } = useCart();

  // Świadome dodawanie: klik w kartę ZAWSZE otwiera kartę produktu —
  // dodanie wyłącznie przyciskiem w środku (zero przypadkowych kliknięć).
  const onOpen = (p: MenuProduct) => setModalProduct(p);

  const onAdded = (name: string, qty: number) => {
    setToast(`Dodano: ${name} ×${qty}`);
    window.setTimeout(() => setToast(null), 2400);
  };

  const inCartQty = (productId: string) =>
    lines.filter((l) => l.productId === productId).reduce((s, l) => s + l.qty, 0);

  const products = useMemo(() => {
    const all = menu.categories.flatMap((c) => c.products.map((p) => ({ ...p, cat: c.name, catId: c.id })));
    const q = query.trim().toLowerCase();
    if (q) return all.filter((p) => p.name.toLowerCase().includes(q));
    if (activeCat === "all") return all;
    return all.filter((p) => p.catId === activeCat);
  }, [menu, activeCat, query]);

  return (
    <main className="min-h-screen bg-[#F5F1E8] pb-32" style={{ color: INK }}>
      <div className="mx-auto max-w-md px-5">
        {/* Top bar */}
        <div className="flex items-center justify-between pt-6">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/icon-espresso.png" alt="" className="h-8 w-8 object-contain opacity-90" />
            <span className="text-[13px] font-semibold uppercase tracking-[0.18em]">Mammarosa</span>
          </div>
          <div className="flex items-center gap-2">
            {!isLive && (
              <span className="rounded-full border border-[#E2D9C8] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#A79E8C]">
                demo
              </span>
            )}
            <Link
              href="/checkout"
              aria-label="Koszyk"
              className="relative flex h-11 w-11 items-center justify-center rounded-full text-[#F5F1E8]"
              style={{ background: INK }}
            >
              <IconCart className="h-5 w-5" />
              {itemCount > 0 && (
                <span
                  className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-extrabold"
                  style={{ background: LIME, color: INK }}
                >
                  {itemCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Nagłówek */}
        <h1 className="pt-7 text-[30px] font-bold leading-[1.12] tracking-[-0.02em]">
          Na co masz dziś
          <br />
          ochotę?
        </h1>

        {/* Szukaj */}
        <label className="mt-5 flex items-center gap-3 rounded-2xl bg-white px-4 py-3.5 shadow-[0_2px_12px_rgba(29,42,34,0.05)]">
          <IconSearch className="h-5 w-5 text-[#A79E8C]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Szukaj w menu…"
            className="w-full bg-transparent text-[15px] outline-none placeholder:text-[#B9B09D]"
          />
        </label>

        {/* Kategorie */}
        <div className="mt-5 grid grid-cols-4 gap-2.5">
          {[{ id: "all", name: "Wszystko" }, ...menu.categories].map((c) => {
            const on = activeCat === c.id && !query;
            return (
              <button
                key={c.id}
                onClick={() => {
                  setActiveCat(c.id);
                  setQuery("");
                }}
                className="flex flex-col items-center gap-1.5 rounded-2xl px-1 py-3 transition"
                style={on ? { background: INK, color: "#F5F1E8" } : { background: "#FFFFFF", color: "#6E6759" }}
              >
                {catIcon(c.name, "h-5 w-5")}
                <span className="text-[11px] font-semibold">{c.name}</span>
              </button>
            );
          })}
        </div>

        {/* Sekcja */}
        <div className="flex items-baseline justify-between pb-3 pt-7">
          <h2 className="text-[17px] font-bold tracking-[-0.01em]">
            {query ? "Wyniki wyszukiwania" : activeCat === "all" ? "Popularne teraz" : menu.categories.find((c) => c.id === activeCat)?.name}
          </h2>
          <span className="text-xs text-[#A79E8C]">{products.length} pozycji</span>
        </div>

        {/* Karty */}
        <div className="grid grid-cols-2 gap-3.5">
          {products.map((p) => {
            const qty = inCartQty(p.id);
            return (
              <div
                key={p.id}
                className="group relative overflow-hidden rounded-[24px] bg-white shadow-[0_2px_14px_rgba(29,42,34,0.06)] transition hover:shadow-[0_10px_28px_rgba(29,42,34,0.10)]"
              >
                {qty > 0 && (
                  <span
                    className="absolute right-2.5 top-2.5 z-10 rounded-full px-2.5 py-1 text-[11px] font-extrabold shadow-md"
                    style={{ background: LIME, color: INK }}
                  >
                    W koszyku ×{qty}
                  </span>
                )}
                <button onClick={() => onOpen(p)} className="block w-full text-left">
                  <div className="relative aspect-square w-full bg-[radial-gradient(120%_120%_at_30%_20%,#FBF8F1_0%,#F1EADB_100%)] p-5">
                    {p.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.image}
                        alt={p.name}
                        className="h-full w-full object-contain drop-shadow-[0_16px_20px_rgba(29,42,34,0.28)]"
                      />
                    ) : (
                      <DishArt kind={dishKindFor(p.name)} className="h-full w-full" />
                    )}
                  </div>
                  <div className="px-3.5 pb-3.5 pt-1">
                    <div className="truncate text-[15px] font-bold tracking-[-0.01em]">{p.name}</div>
                    {p.description ? (
                      <div className="mt-0.5 truncate text-[11.5px] text-[#A79E8C]">{p.description}</div>
                    ) : (
                      <div className="mt-0.5 text-[11.5px] text-transparent">·</div>
                    )}
                    <div className="mt-2.5 flex items-center justify-between">
                      <span className="text-[15px] font-extrabold">{zl(p.price)}</span>
                      <span className="rounded-full bg-[#F5F1E8] px-3.5 py-2 text-[12px] font-bold text-[#6E6759] transition group-hover:bg-[#EDE6D6]">
                        Wybierz
                      </span>
                    </div>
                  </div>
                </button>
              </div>
            );
          })}
        </div>

        {products.length === 0 && (
          <p className="py-10 text-center text-sm text-[#A79E8C]">Nic nie znaleziono — spróbuj inaczej.</p>
        )}
      </div>

      {/* Pływająca dolna nawigacja */}
      <div className="pointer-events-none fixed inset-x-0 bottom-5 z-40 flex justify-center px-5">
        {itemCount === 0 ? (
          <div
            className="pointer-events-auto flex items-center gap-6 rounded-full px-7 py-3.5 text-[#F5F1E8] shadow-[0_16px_36px_rgba(29,42,34,0.35)]"
            style={{ background: INK }}
          >
            <span className="flex items-center gap-2 text-sm font-semibold">
              <span className="h-2 w-2 rounded-full" style={{ background: LIME }} />
              Menu
            </span>
            <span className="flex items-center gap-2 text-sm text-white/50">
              <IconCart className="h-4.5 w-4.5" /> Koszyk pusty
            </span>
          </div>
        ) : (
          <Link
            href="/checkout"
            className="pointer-events-auto flex w-full max-w-md items-center justify-between rounded-full py-4 pl-6 pr-2.5 text-[#F5F1E8] shadow-[0_16px_36px_rgba(29,42,34,0.35)]"
            style={{ background: INK }}
          >
            <span className="flex items-center gap-3 text-[15px] font-bold">
              <span
                className="flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-extrabold"
                style={{ background: LIME, color: INK }}
              >
                {itemCount}
              </span>
              {zl(subtotal)}
            </span>
            <span className="flex items-center gap-2 rounded-full bg-white/10 px-5 py-2.5 text-sm font-bold">
              Do koszyka <IconArrow className="h-4 w-4" />
            </span>
          </Link>
        )}
      </div>

      {/* Toast — widoczne potwierdzenie dodania */}
      <div
        className="pointer-events-none fixed left-1/2 top-4 z-[60] flex -translate-x-1/2 items-center whitespace-nowrap gap-2.5 rounded-full py-3 pl-3 pr-5 text-sm font-semibold text-[#F5F1E8] shadow-[0_16px_36px_rgba(29,42,34,0.4)] transition-transform duration-300"
        style={{ background: INK, transform: `translate(-50%, ${toast ? "0" : "-90px"})` }}
      >
        <span
          className="flex h-6 w-6 items-center justify-center rounded-full text-[13px] font-extrabold"
          style={{ background: LIME, color: INK }}
        >
          ✓
        </span>
        {toast ?? ""}
      </div>

      {modalProduct && (
        <ProductModal product={modalProduct} onClose={() => setModalProduct(null)} onAdded={onAdded} />
      )}
    </main>
  );
}
