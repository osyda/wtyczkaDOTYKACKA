"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Menu, MenuProduct } from "@/lib/dotykacka/types";
import { zl } from "@/lib/format";
import { useCart, lineTotal } from "@/lib/cart/CartProvider";
import { ProductModal } from "./ProductModal";
import { C, SERIF } from "@/lib/carta";

/* ================= CARTA · menu jak redakcyjna karta ================= */

type HoursState = { open: boolean; acceptingOrders: boolean; message: string; lastOrder: string | null };

export function Shop({ menu }: { menu: Menu }) {
  const isLive = menu.source === "live";
  const [modalProduct, setModalProduct] = useState<MenuProduct | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [hours, setHours] = useState<HoursState | null>(null);
  const { lines, itemCount, subtotal, setQty, remove } = useCart();

  // Godziny otwarcia: po zamknięciu (i 20 min przed) blokujemy przejście do kasy.
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/hours")
        .then((r) => r.json())
        .then((d: HoursState) => {
          if (alive) setHours(d);
        })
        .catch(() => {});
    load();
    const t = window.setInterval(load, 60_000);
    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, []);
  const closedNow = hours !== null && !hours.acceptingOrders;

  const cats = menu.categories;
  const [activeCat, setActiveCat] = useState<string>(cats[0]?.id ?? "");
  const spyLock = useRef(0);

  // Wyróżniona pozycja: pierwszy produkt ze zdjęciem.
  const featured = cats.flatMap((c) => c.products).find((p) => p.image);

  const onAdded = (name: string, qty: number) => {
    setToast(`Dodano: ${name} ×${qty}`);
    window.setTimeout(() => setToast(null), 1800);
  };

  const inCartQty = (productId: string) =>
    lines.filter((l) => l.productId === productId).reduce((s, l) => s + l.qty, 0);

  // Scrollspy: pasek kategorii podświetla przeglądaną sekcję.
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const bar = document.getElementById("catbar");
        if (!bar) return;
        bar.classList.toggle("shadow-[0_10px_24px_rgba(27,23,16,0.07)]", bar.getBoundingClientRect().top <= 0);
        if (Date.now() < spyLock.current) return;
        let act = cats[0]?.id ?? "";
        if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 8) {
          act = cats[cats.length - 1]?.id ?? act;
        } else {
          const line = bar.getBoundingClientRect().bottom + 42;
          for (const c of cats) {
            const s = document.getElementById(`sec-${c.id}`);
            if (s && s.getBoundingClientRect().top <= line) act = c.id;
          }
        }
        setActiveCat(act);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [cats]);

  const catGo = (id: string) => {
    setActiveCat(id);
    spyLock.current = Date.now() + 900;
    document.getElementById(`sec-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <main className="min-h-screen pb-32" style={{ background: C.ivory, color: C.ink }}>
      <div className="mx-auto max-w-[430px] px-[26px] min-[700px]:max-w-[760px] min-[700px]:px-11 min-[1000px]:max-w-[900px]">
        {/* Masthead */}
        <header className="ct-reveal pt-[34px] text-center">
          <div className="text-[9px] tracking-[0.34em] text-[#7A7060]" style={{ textIndent: "0.34em" }}>
            RESTAURACJA — PIZZERIA
          </div>
          <div
            className="mt-[22px] whitespace-nowrap text-[31px] font-extrabold tracking-[0.4em] min-[700px]:text-[40px]"
            style={{ textIndent: "0.4em" }}
          >
            MAMMAROSA
          </div>
          <div className="mt-4 flex items-center gap-3.5">
            <span className="h-px flex-1" style={{ background: C.hairline }} />
            <span className="whitespace-nowrap text-[8.5px] tracking-[0.3em] text-[#7A7060]" style={{ textIndent: "0.3em" }}>
              MENU · KOŚCIERZYNA · DOSTAWA 5–15 KM{isLive ? "" : " · DEMO"}
            </span>
            <span className="h-px flex-1" style={{ background: C.hairline }} />
          </div>
        </header>

        {/* Poza godzinami — menu można oglądać, zamówić nie */}
        {closedNow && hours && (
          <div className="ct-reveal mt-7 border px-6 py-5 text-center" style={{ borderColor: C.accent, background: C.paper }}>
            <div className="text-[9px] uppercase tracking-[0.3em]" style={{ color: C.accent, textIndent: "0.3em" }}>
              ZAMÓWIENIA WSTRZYMANE
            </div>
            <p className="font-carta mt-2.5 text-[15.5px] italic leading-snug">{hours.message}</p>
          </div>
        )}

        {/* Pasek kategorii — przykleja się u góry */}
        <nav
          id="catbar"
          className="sticky top-0 z-40 -mx-[26px] mt-6 flex justify-center gap-[34px] border-b px-[26px] backdrop-blur-[10px] transition-shadow duration-300 min-[700px]:-mx-11 min-[700px]:px-11"
          style={{ background: "rgba(247,243,235,.94)", borderColor: C.hairline }}
        >
          {cats.map((c) => {
            const on = activeCat === c.id;
            return (
              <button
                key={c.id}
                onClick={() => catGo(c.id)}
                className="-mb-px cursor-pointer border-b-2 pb-[13px] pt-[15px] text-[11px] uppercase tracking-[0.24em] transition-colors duration-300"
                style={{
                  textIndent: "0.24em",
                  color: on ? C.ink : C.muted,
                  borderColor: on ? C.accent : "transparent",
                }}
              >
                {c.name}
              </button>
            );
          })}
        </nav>

        {/* Pizza tygodnia */}
        {featured && (
          <button
            onClick={() => setModalProduct(featured)}
            className="ct-reveal mt-[30px] flex w-full cursor-pointer items-center gap-5 border p-[22px] text-left transition-colors active:bg-[#F4EEE1] min-[700px]:gap-[30px] min-[700px]:p-[30px]"
            style={{ background: C.paper, borderColor: C.border, animationDelay: ".1s" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={featured.image}
              alt=""
              className="h-[148px] w-[148px] object-contain drop-shadow-[0_14px_16px_rgba(27,23,16,0.18)] min-[700px]:h-[200px] min-[700px]:w-[200px]"
            />
            <div>
              <div className="text-[8.5px] tracking-[0.28em]" style={{ color: C.accent, textIndent: "0.28em" }}>
                PIZZA TYGODNIA
              </div>
              <div className="font-carta mt-[7px] text-[25px] italic min-[700px]:text-[30px]">{featured.name}</div>
              {featured.description && (
                <div className="mt-[7px] text-[11.5px] leading-[1.65]" style={{ color: C.muted }}>
                  {featured.description}
                </div>
              )}
              <div className="mt-3 flex items-baseline gap-3.5">
                <span className="font-carta whitespace-nowrap text-[20px]">{zl(featured.price)}</span>
                <span
                  className="border-b pb-0.5 text-[10px] uppercase tracking-[0.2em]"
                  style={{ color: C.accent, borderColor: C.accent, textIndent: "0.2em" }}
                >
                  Zamów
                </span>
              </div>
            </div>
          </button>
        )}

        {/* Sekcje menu */}
        {cats.map((c, ci) => (
          <section key={c.id}>
            <div
              id={`sec-${c.id}`}
              className="ct-reveal mb-2 mt-[38px] flex items-center gap-4 scroll-mt-[74px]"
              style={{ animationDelay: `${0.16 + ci * 0.05}s` }}
            >
              <span className="h-px flex-1" style={{ background: C.hairline }} />
              <span className="text-[10.5px] uppercase tracking-[0.32em]" style={{ textIndent: "0.32em" }}>
                {c.name}
              </span>
              <span className="h-px flex-1" style={{ background: C.hairline }} />
            </div>
            <div className="min-[700px]:grid min-[700px]:grid-cols-2 min-[700px]:gap-x-[58px]">
              {c.products
                .filter((p) => p.id !== featured?.id)
                .map((p, i) => {
                  const q = inCartQty(p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => setModalProduct(p)}
                      className="ct-reveal flex w-full cursor-pointer items-center gap-4 border-b py-[17px] text-left transition-colors active:bg-[#F0EADD]"
                      style={{ borderColor: C.hairlineSoft, animationDelay: `${0.2 + ci * 0.05 + i * 0.04}s` }}
                    >
                      {p.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.image}
                          alt=""
                          className="h-[66px] w-[66px] object-contain drop-shadow-[0_8px_9px_rgba(27,23,16,0.16)]"
                        />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline">
                          <span className="font-carta whitespace-nowrap text-[18.5px]">{p.name}</span>
                          <span
                            className="mx-2.5 flex-1 -translate-y-1 border-b border-dotted"
                            style={{ borderColor: C.leader }}
                          />
                          <span className="font-carta whitespace-nowrap text-[16.5px]">{zl(p.price)}</span>
                        </span>
                        {p.description && (
                          <span className="mt-[5px] block text-[11px] leading-relaxed" style={{ color: C.muted }}>
                            {p.description}
                          </span>
                        )}
                        {q > 0 && (
                          <span
                            className="mt-1.5 inline-block text-[9.5px] uppercase tracking-[0.22em]"
                            style={{ color: C.accent, textIndent: "0.22em" }}
                          >
                            W zamówieniu × {q}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
            </div>
          </section>
        ))}

        <div className="mt-[34px] text-center text-[9px] tracking-[0.22em]" style={{ color: C.faint, textIndent: "0.22em" }}>
          CIASTO 48H · PIEC OPALANY DREWNEM · ZAMÓWIENIA ONLINE
        </div>
      </div>

      {/* Toast */}
      <div
        className="pointer-events-none fixed bottom-24 left-1/2 z-[55] w-max max-w-[calc(100vw-52px)] border px-6 py-[13px] text-center text-[10px] uppercase leading-relaxed tracking-[0.22em] transition-all duration-400"
        style={{
          background: C.paper,
          borderColor: C.ink,
          color: C.ink,
          textIndent: "0.22em",
          opacity: toast ? 1 : 0,
          transform: `translate(-50%, ${toast ? 0 : 12}px)`,
        }}
      >
        {toast ?? "Dodano do zamówienia"}
      </div>

      {/* Pasek dolny */}
      <footer className="pointer-events-none fixed inset-x-0 bottom-0 z-30">
        <button
          onClick={() => setCartOpen(true)}
          className="pointer-events-auto mx-auto mb-[18px] flex w-[calc(100%-52px)] max-w-[378px] cursor-pointer items-center justify-between px-[26px] py-[17px] shadow-[0_18px_38px_rgba(27,23,16,0.3)] transition-transform active:scale-[0.985]"
          style={{ background: C.ink, color: C.ivory }}
        >
          <span className="text-[10px] uppercase tracking-[0.26em] text-[#B9AE97]" style={{ textIndent: "0.26em" }}>
            {itemCount > 0 ? `Twoje zamówienie · ${itemCount} poz.` : "Twoje zamówienie"}
          </span>
          <b className="font-carta text-[15px] font-normal">{zl(subtotal)}</b>
        </button>
      </footer>

      {/* Karta produktu */}
      {modalProduct && (
        <ProductModal product={modalProduct} onClose={() => setModalProduct(null)} onAdded={onAdded} />
      )}

      {/* Koszyk */}
      {cartOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center min-[700px]:items-center min-[700px]:p-[34px]"
          style={{ background: "rgba(27,23,16,.36)" }}
          onClick={(e) => e.target === e.currentTarget && setCartOpen(false)}
        >
          <div
            className="max-h-[92vh] w-full max-w-[430px] overflow-y-auto border-t p-[26px] min-[700px]:max-h-[88vh] min-[700px]:max-w-[560px] min-[700px]:border"
            style={{ background: C.ivory, borderColor: C.ink }}
          >
            <button
              onClick={() => setCartOpen(false)}
              aria-label="Zamknij"
              className="float-right cursor-pointer px-1.5 py-0.5 text-[20px]"
              style={{ color: C.muted }}
            >
              ✕
            </button>
            <div className="font-carta text-[30px] italic">Twoje zamówienie</div>
            {lines.length === 0 ? (
              <div className="py-8 text-center text-[12px]" style={{ color: C.faint }}>
                Zamówienie jest puste
              </div>
            ) : (
              lines.map((l) => (
                <div key={l.lineId} className="flex items-center gap-3 border-b py-[15px]" style={{ borderColor: C.hairlineSoft }}>
                  <div className="min-w-0 flex-1">
                    <div className="font-carta text-[16.5px]">{l.name}</div>
                    {l.addons.length > 0 && (
                      <div className="mt-[3px] text-[10.5px]" style={{ color: C.muted }}>
                        {l.addons.map((a) => a.name).join(", ")}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => (l.qty === 1 ? remove(l.lineId) : setQty(l.lineId, l.qty - 1))}
                      className="h-[26px] w-[26px] cursor-pointer border text-[14px]"
                      style={{ borderColor: C.ink }}
                    >
                      −
                    </button>
                    <b className="font-carta text-[15px] font-normal">{l.qty}</b>
                    <button
                      onClick={() => setQty(l.lineId, l.qty + 1)}
                      className="h-[26px] w-[26px] cursor-pointer border text-[14px]"
                      style={{ borderColor: C.ink }}
                    >
                      +
                    </button>
                  </div>
                  <span className="font-carta min-w-[56px] text-right text-[15.5px]">{zl(lineTotal(l))}</span>
                </div>
              ))
            )}
            <div className="mt-[18px] flex items-baseline">
              <span className="text-[10px] uppercase tracking-[0.26em]" style={{ color: C.muted, textIndent: "0.26em" }}>
                RAZEM
              </span>
              <span className="mx-3 flex-1 -translate-y-[3px] border-b border-dotted" style={{ borderColor: C.leader }} />
              <span className="font-carta text-[19px]">{zl(subtotal)}</span>
            </div>
            <Link
              href="/checkout"
              onClick={(e) => {
                if (lines.length === 0 || closedNow) e.preventDefault();
              }}
              className="mt-[26px] flex w-full items-center justify-between px-[22px] py-[18px] text-[11px] uppercase tracking-[0.24em] transition-transform active:scale-[0.985]"
              style={{
                background: C.ink,
                color: C.ivory,
                textIndent: "0.24em",
                opacity: lines.length === 0 || closedNow ? 0.35 : 1,
                pointerEvents: lines.length === 0 || closedNow ? "none" : undefined,
              }}
            >
              <span>{closedNow ? "Poza godzinami zamówień" : "Przejdź do kasy"}</span>
              <b className="font-carta text-[16px] font-normal normal-case tracking-normal">{zl(subtotal)}</b>
            </Link>
          </div>
        </div>
      )}

      <span className="hidden" style={{ fontFamily: SERIF }} />
    </main>
  );
}
