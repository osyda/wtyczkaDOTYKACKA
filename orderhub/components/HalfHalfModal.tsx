"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { MenuAddon, MenuProduct } from "@/lib/dotykacka/types";
import { useCart } from "@/lib/cart/CartProvider";
import { zl } from "@/lib/format";
import { C } from "@/lib/carta";

/* ============ CARTA · pizza pół na pół ============
 * Klient wybiera dwie połówki; cena = 50% jednej + 50% drugiej
 * (dokładnie jak „porcje 50%" w POS właściciela). Dodatki liczą się na całość.
 */

export function HalfHalfModal({
  pizzas,
  onClose,
  onAdded,
}: {
  pizzas: MenuProduct[];
  onClose: () => void;
  onAdded?: (name: string, qty: number) => void;
}) {
  const { addHalves } = useCart();
  const [a, setA] = useState<MenuProduct | null>(null);
  const [b, setB] = useState<MenuProduct | null>(null);
  const [qty, setQty] = useState(1);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [closing, setClosing] = useState(false);
  const closeTimer = useRef(0);

  const requestClose = () => {
    if (closing) return;
    setClosing(true);
    closeTimer.current = window.setTimeout(onClose, 230);
  };
  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  // Dodatki na całość: suma dodatków obu połówek (bez duplikatów).
  const addons = useMemo<MenuAddon[]>(() => {
    const seen = new Map<string, MenuAddon>();
    for (const p of [a, b]) for (const ad of p?.addons ?? []) if (!seen.has(ad.id)) seen.set(ad.id, ad);
    return [...seen.values()];
  }, [a, b]);
  const chosen = useMemo(() => addons.filter((x) => selected[x.id]), [addons, selected]);

  const base = a && b ? Math.round(((a.price + b.price) / 2) * 100) / 100 : 0;
  const unit = base + chosen.reduce((s, x) => s + x.price, 0);

  const pick = (p: MenuProduct) => {
    if (!a) return setA(p);
    if (!b) return setB(p);
    setB(p); // obie wybrane → podmieniaj drugą
  };

  const Half = ({ which, product }: { which: "L" | "P"; product: MenuProduct | null }) => (
    <div className="flex-1 text-center">
      <div
        className="relative mx-auto h-[92px] w-[46px] overflow-hidden"
        style={{ [which === "L" ? "borderRight" : "borderLeft"]: `1px dashed ${C.leader}` } as React.CSSProperties}
      >
        {product?.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image}
            alt=""
            className="absolute top-0 h-[92px] w-[92px] max-w-none drop-shadow-[0_10px_12px_rgba(27,23,16,0.18)]"
            style={{ [which === "L" ? "left" : "right"]: 0 } as React.CSSProperties}
          />
        ) : (
          <div className="absolute inset-0" style={{ background: C.paper, border: `1px dashed ${C.leader}` }} />
        )}
      </div>
      <div className="mt-2 text-[9px] uppercase tracking-[0.24em]" style={{ color: C.muted, textIndent: "0.24em" }}>
        {which === "L" ? "POŁÓWKA 1" : "POŁÓWKA 2"}
      </div>
      <div className="font-carta mt-0.5 min-h-[20px] text-[14.5px] italic">{product?.name ?? "—"}</div>
      {product && (
        <button
          onClick={() => (which === "L" ? setA(null) : setB(null))}
          className="mt-0.5 cursor-pointer text-[10px] underline underline-offset-2"
          style={{ color: C.muted }}
        >
          zmień
        </button>
      )}
    </div>
  );

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
        <button onClick={requestClose} aria-label="Zamknij" className="float-right cursor-pointer px-1.5 py-0.5 text-[20px]" style={{ color: C.muted }}>
          ✕
        </button>

        <div className="font-carta mt-1 text-center text-[26px] italic">Pizza pół na pół</div>
        <div className="mt-1 text-center text-[11px]" style={{ color: C.muted }}>
          Dwie ulubione na jednej pizzy — cena to połowa jednej i połowa drugiej.
        </div>

        <div className="mt-5 flex items-start gap-1">
          <Half which="L" product={a} />
          <Half which="P" product={b} />
        </div>

        {(!a || !b) && (
          <>
            <div className="mt-5 flex items-center gap-3.5">
              <span className="h-px flex-1" style={{ background: C.hairline }} />
              <span className="text-[9.5px] tracking-[0.3em]" style={{ color: C.muted, textIndent: "0.3em" }}>
                {!a ? "WYBIERZ POŁÓWKĘ 1" : "WYBIERZ POŁÓWKĘ 2"}
              </span>
              <span className="h-px flex-1" style={{ background: C.hairline }} />
            </div>
            {pizzas.map((p) => (
              <button
                key={p.id}
                onClick={() => pick(p)}
                className="flex w-full cursor-pointer items-baseline gap-3 border-b py-[11px] text-left"
                style={{ borderColor: C.hairlineSoft }}
              >
                <span className="font-carta text-[15px]">{p.name}</span>
                <span className="flex-1 translate-y-1 border-b border-dotted" style={{ borderColor: C.leader }} />
                <span className="font-carta text-[13.5px]" style={{ color: C.muted }}>½ · {zl(p.price / 2)}</span>
              </button>
            ))}
          </>
        )}

        {a && b && (
          <>
            {addons.length > 0 && (
              <>
                <div className="mt-5 flex items-center gap-3.5">
                  <span className="h-px flex-1" style={{ background: C.hairline }} />
                  <span className="text-[9.5px] tracking-[0.3em]" style={{ color: C.muted, textIndent: "0.3em" }}>
                    DODATKI (NA CAŁOŚĆ)
                  </span>
                  <span className="h-px flex-1" style={{ background: C.hairline }} />
                </div>
                {addons.map((x) => {
                  const on = !!selected[x.id];
                  return (
                    <button
                      key={x.id}
                      onClick={() => setSelected((s) => ({ ...s, [x.id]: !s[x.id] }))}
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
                      <span className="text-[13.5px]">{x.name}</span>
                      <span className="flex-1 translate-y-1 border-b border-dotted" style={{ borderColor: C.leader }} />
                      <span className="font-carta text-[14.5px]">+{zl(x.price)}</span>
                    </button>
                  );
                })}
              </>
            )}

            <div className="mt-[22px] flex items-center justify-between">
              <span className="text-[9.5px] tracking-[0.3em]" style={{ color: C.muted, textIndent: "0.3em" }}>
                ILOŚĆ
              </span>
              <div className="flex items-center gap-[18px]">
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="h-[34px] w-[34px] cursor-pointer border text-[17px]" style={{ borderColor: C.ink }}>
                  −
                </button>
                <b className="font-carta min-w-4 text-center text-[18px] font-normal">{qty}</b>
                <button onClick={() => setQty((q) => q + 1)} className="h-[34px] w-[34px] cursor-pointer border text-[17px]" style={{ borderColor: C.ink }}>
                  +
                </button>
              </div>
            </div>

            <button
              onClick={() => {
                addHalves(a, b, qty, chosen);
                requestClose();
                onAdded?.(`Pół na pół: ${a.name} / ${b.name}`, qty);
              }}
              className="mt-[26px] flex w-full cursor-pointer items-center justify-between px-[22px] py-[18px] text-[11px] uppercase tracking-[0.24em] transition-transform active:scale-[0.985]"
              style={{ background: C.ink, color: C.ivory, textIndent: "0.24em" }}
            >
              <span>Dodaj do zamówienia</span>
              <b className="font-carta text-[16px] font-normal normal-case tracking-normal">{zl(unit * qty)}</b>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
