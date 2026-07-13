"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { MenuAddon, MenuProduct } from "@/lib/dotykacka/types";
import { useCart } from "@/lib/cart/CartProvider";
import { zl } from "@/lib/format";
import { C, toppingKind, TOPPING_SCATTER, TOPPING_SIZE, TOPPING_VARIANTS } from "@/lib/carta";

/* ================= CARTA · karta produktu ================= */

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
  const [variant, setVariant] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const closeTimer = useRef(0);

  // Płynne zamknięcie: najpierw animacja wyjścia, potem zdjęcie okna z ekranu.
  const requestClose = () => {
    if (closing) return;
    setClosing(true);
    closeTimer.current = window.setTimeout(onClose, 230);
  };
  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  const addons = product.addons ?? [];
  const chosen = useMemo<MenuAddon[]>(() => addons.filter((a) => selected[a.id]), [addons, selected]);
  const unit = product.price + chosen.reduce((s, a) => s + a.price, 0);

  // Spadające składniki: dla każdego zaznaczonego dodatku rozsyp jego grafiki po zdjęciu.
  const toppings = useMemo(() => {
    let delay = 0;
    const out: { key: string; src: string; left: number; top: number; rot: number; w: number; delay: number }[] = [];
    for (const a of chosen) {
      const kind = toppingKind(a.name);
      if (!kind) continue;
      const pts = TOPPING_SCATTER[kind];
      const variants = TOPPING_VARIANTS[kind];
      pts.forEach(([left, top, rot], i) => {
        out.push({
          key: `${a.id}-${i}`,
          src: `/toppings/${kind}${(i % variants) + 1}.webp`,
          left,
          top,
          rot,
          w: TOPPING_SIZE[kind],
          delay: delay * 50,
        });
        delay++;
      });
    }
    return out;
  }, [chosen]);

  return (
    <div
      className={`fixed inset-0 z-[60] flex items-end justify-center min-[700px]:items-center min-[700px]:p-[34px] ${closing ? "ct-modal-closing" : ""}`}
      onClick={(e) => e.target === e.currentTarget && requestClose()}
    >
      <div className="ct-backdrop pointer-events-none absolute inset-0" style={{ background: "rgba(27,23,16,.36)" }} />
      <div
        className="ct-sheet relative max-h-[92vh] w-full max-w-[430px] overflow-y-auto border-t p-[26px] min-[700px]:max-h-[88vh] min-[700px]:max-w-[560px] min-[700px]:border"
        style={{ background: C.ivory, borderColor: C.ink, color: C.ink }}
      >
        <button
          onClick={requestClose}
          aria-label="Zamknij"
          className="float-right cursor-pointer px-1.5 py-0.5 text-[20px]"
          style={{ color: C.muted }}
        >
          ✕
        </button>

        {product.image && (
          <div className="relative mx-auto mt-1.5 w-[250px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={product.image}
              alt={product.name}
              className="block w-full drop-shadow-[0_18px_20px_rgba(27,23,16,0.2)]"
            />
            <div className="pointer-events-none absolute inset-0">
              {toppings.map((t) => (
                <span
                  key={t.key}
                  className="ct-topping"
                  style={{ left: `${t.left}%`, top: `${t.top}%`, width: `${t.w}%`, animationDelay: `${t.delay}ms` }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={t.src} alt="" style={{ transform: `rotate(${t.rot}deg)` }} />
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="font-carta mt-3.5 text-center text-[28px] italic">{product.name}</div>
        {product.description && (
          <div className="mt-1.5 text-center text-[11.5px] leading-[1.65]" style={{ color: C.muted }}>
            {product.description}
          </div>
        )}

        {(product.variants?.length ?? 0) > 0 && (
          <>
            <div className="mt-6 flex items-center gap-3.5">
              <span className="h-px flex-1" style={{ background: C.hairline }} />
              <span className="text-[9.5px] tracking-[0.3em]" style={{ color: C.muted, textIndent: "0.3em" }}>
                {product.variantsRequired ? "DO WYBORU · WYMAGANE" : "DO WYBORU"}
              </span>
              <span className="h-px flex-1" style={{ background: C.hairline }} />
            </div>
            {product.variants!.map((v) => {
              const on = variant === v;
              return (
                <button
                  key={v}
                  onClick={() => setVariant(on && !product.variantsRequired ? null : v)}
                  className="flex w-full cursor-pointer items-center gap-3.5 border-b py-[13px] text-left"
                  style={{ borderColor: C.hairlineSoft }}
                >
                  <span
                    className="flex h-[17px] w-[17px] flex-none items-center justify-center rounded-full border transition-colors duration-200"
                    style={{ borderColor: C.ink }}
                  >
                    <span
                      className="h-[9px] w-[9px] rounded-full transition-opacity duration-200"
                      style={{ background: C.ink, opacity: on ? 1 : 0 }}
                    />
                  </span>
                  <span className="text-[13.5px]">{v}</span>
                  <span className="flex-1 translate-y-1 border-b border-dotted" style={{ borderColor: C.leader }} />
                  <span className="text-[11px]" style={{ color: C.muted }}>
                    bez dopłaty
                  </span>
                </button>
              );
            })}
          </>
        )}

        {addons.length > 0 && (
          <>
            <div className="mt-6 flex items-center gap-3.5">
              <span className="h-px flex-1" style={{ background: C.hairline }} />
              <span className="text-[9.5px] tracking-[0.3em]" style={{ color: C.muted, textIndent: "0.3em" }}>
                DODATKI
              </span>
              <span className="h-px flex-1" style={{ background: C.hairline }} />
            </div>
            {addons.map((a) => {
              const on = !!selected[a.id];
              return (
                <button
                  key={a.id}
                  onClick={() => setSelected((s) => ({ ...s, [a.id]: !s[a.id] }))}
                  className="flex w-full cursor-pointer items-center gap-3.5 border-b py-[13px] text-left"
                  style={{ borderColor: C.hairlineSoft }}
                >
                  <span
                    className="flex h-[17px] w-[17px] flex-none items-center justify-center border transition-colors duration-200"
                    style={{ borderColor: C.ink, background: on ? C.ink : "transparent" }}
                  >
                    <svg viewBox="0 0 24 24" className="h-2.5 w-2.5 transition-opacity duration-200" style={{ opacity: on ? 1 : 0 }}>
                      <path d="M5 12.5 L10 17 L19 7" fill="none" stroke={C.ivory} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span className="text-[13.5px]">{a.name}</span>
                  <span className="flex-1 translate-y-1 border-b border-dotted" style={{ borderColor: C.leader }} />
                  <span className="font-carta text-[14.5px]">+{zl(a.price)}</span>
                </button>
              );
            })}
          </>
        )}

        {/* Ilość */}
        <div className="mt-[22px] flex items-center justify-between">
          <span className="text-[9.5px] tracking-[0.3em]" style={{ color: C.muted, textIndent: "0.3em" }}>
            ILOŚĆ
          </span>
          <div className="flex items-center gap-[18px]">
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="h-[34px] w-[34px] cursor-pointer border text-[17px]"
              style={{ borderColor: C.ink, color: C.ink }}
            >
              −
            </button>
            <b className="font-carta min-w-4 text-center text-[18px] font-normal">{qty}</b>
            <button
              onClick={() => setQty((q) => q + 1)}
              className="h-[34px] w-[34px] cursor-pointer border text-[17px]"
              style={{ borderColor: C.ink, color: C.ink }}
            >
              +
            </button>
          </div>
        </div>

        <button
          onClick={() => {
            if (product.variantsRequired && !variant) return; // najpierw wybór wariantu
            // Wariant jedzie jako darmowy „dodatek" bez customizationId —
            // w POS trafia do notatki pozycji (jak Szybka notatka przy terminalu).
            const withVariant = variant
              ? [{ id: `wariant:${variant}`, name: variant, price: 0 }, ...chosen]
              : chosen;
            addProduct(product, qty, withVariant);
            requestClose();
            onAdded?.(product.name, qty);
          }}
          className="mt-[26px] flex w-full cursor-pointer items-center justify-between px-[22px] py-[18px] text-[11px] uppercase tracking-[0.24em] transition-transform active:scale-[0.985]"
          style={{
            background: C.ink,
            color: C.ivory,
            textIndent: "0.24em",
            ...(product.variantsRequired && !variant ? { opacity: 0.45, cursor: "not-allowed" } : {}),
          }}
        >
          <span>{product.variantsRequired && !variant ? "Najpierw wybierz wariant" : "Dodaj do zamówienia"}</span>
          <b className="font-carta text-[16px] font-normal normal-case tracking-normal">{zl(unit * qty)}</b>
        </button>
      </div>
    </div>
  );
}
