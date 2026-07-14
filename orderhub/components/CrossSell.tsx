"use client";

/**
 * CROSS-SELL (życzenie właściciela 14.07.2026): gdy w koszyku jest danie
 * główne (pizza, zapiekanka, frytki…), podpowiadamy dobierki jednym
 * dotknięciem — frytki, sosy, ewentualnie napoje (gdy kategoria widoczna).
 * Pokazuje się w koszyku na /menu i w podsumowaniu kasy.
 */

import { useEffect, useMemo, useState } from "react";
import type { Menu, MenuProduct } from "@/lib/dotykacka/types";
import { useCart } from "@/lib/cart/CartProvider";
import { zl } from "@/lib/format";
import { C } from "@/lib/carta";

function norm(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ł/g, "l");
}

/** Kategorie „dobierkowe" — z nich pochodzą podpowiedzi. */
const isSauceCat = (n: string) => /sos/.test(n);
const isAddonsCat = (n: string) => /dodatk/.test(n) && !/pizz/.test(n);
const isDrinkCat = (n: string) => /napoje/.test(n);
/** Kategorie, których NIE traktujemy jako danie główne. */
const isSideCat = (n: string) => isSauceCat(n) || isAddonsCat(n) || isDrinkCat(n) || /piw|win|koktajl|deser|dodatki pizza/.test(n);

function pickSuggestions(menu: Menu | null, cartIds: Set<string>, cartNames: string[], max: number): MenuProduct[] {
  if (!menu) return [];

  // Czy w koszyku jest danie główne? (produkt z kategorii innej niż dobierki)
  const sideIds = new Set<string>();
  const mainIds = new Set<string>();
  for (const c of menu.categories) {
    const side = isSideCat(norm(c.name));
    for (const p of c.products) (side ? sideIds : mainIds).add(p.id);
  }
  const hasMain = [...cartIds].some((id) => mainIds.has(id));
  if (!hasMain) return [];

  const eligible = (p: MenuProduct) => !cartIds.has(p.id) && !p.variantsRequired;
  const out: MenuProduct[] = [];

  // 1) Frytki — jedna propozycja, jeśli w koszyku ich nie ma.
  const hasFries = cartNames.some((n) => /frytk/.test(norm(n)));
  if (!hasFries) {
    const fries = menu.categories
      .filter((c) => isAddonsCat(norm(c.name)))
      .flatMap((c) => c.products)
      .find((p) => /frytk/.test(norm(p.name)) && eligible(p));
    if (fries) out.push(fries);
  }

  // 2) Sosy (w kolejności z POS), potem napoje — do limitu.
  for (const test of [isSauceCat, isDrinkCat]) {
    for (const c of menu.categories) {
      if (!test(norm(c.name))) continue;
      for (const p of c.products) {
        if (out.length >= max) return out;
        if (eligible(p) && !out.some((x) => x.id === p.id)) out.push(p);
      }
    }
  }
  return out.slice(0, max);
}

export function CrossSell({ menu: menuProp, max = 4 }: { menu?: Menu | null; max?: number }) {
  const { lines, addProduct } = useCart();
  const [fetched, setFetched] = useState<Menu | null>(null);

  // Tam, gdzie menu nie jest pod ręką (kasa) — dociągamy je raz.
  useEffect(() => {
    if (menuProp) return;
    fetch("/api/dotykacka/menu")
      .then((r) => r.json())
      .then((d: Menu) => setFetched(d?.categories ? d : null))
      .catch(() => {});
  }, [menuProp]);

  const menu = menuProp ?? fetched;
  const cartIds = useMemo(() => new Set(lines.map((l) => l.productId)), [lines]);
  const cartNames = useMemo(() => lines.map((l) => l.name), [lines]);
  const picks = useMemo(() => pickSuggestions(menu ?? null, cartIds, cartNames, max), [menu, cartIds, cartNames, max]);

  if (lines.length === 0 || picks.length === 0) return null;

  return (
    <div className="mt-5">
      <div className="mb-2.5 flex items-center gap-3.5">
        <span className="h-px flex-1" style={{ background: C.hairline }} />
        <span className="text-[9px] tracking-[0.28em]" style={{ color: C.muted, textIndent: "0.28em" }}>
          DOBIERZ DO ZAMÓWIENIA
        </span>
        <span className="h-px flex-1" style={{ background: C.hairline }} />
      </div>
      <div className="flex flex-wrap gap-2">
        {picks.map((p) => (
          <button
            key={p.id}
            onClick={() => addProduct(p, 1, [])}
            className="flex cursor-pointer items-baseline gap-2 border px-3.5 py-2 text-[12px] transition-transform active:scale-[0.97]"
            style={{ borderColor: C.hairline, color: C.ink, background: C.paper }}
          >
            <span className="text-[13px] leading-none" style={{ color: C.accent }}>+</span>
            <span>{p.name}</span>
            <span className="font-carta text-[12.5px]" style={{ color: C.muted }}>{zl(p.price)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
