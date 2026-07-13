/**
 * Pobranie menu z Dotykački i znormalizowanie go pod UI sklepu.
 * Gdy brak kluczy → zwraca menu MOCK (żeby ekran działał od ręki).
 *
 * Dodatki: Dotykačka trzyma je jako „customizations" — grupa przypięta do
 * produktu wskazuje KATEGORIĘ, z której pochodzą produkty-dodatki (np. grupa
 * „Dodatki" na pizzy → kategoria „DODATKI PIZZA"). Mapujemy: produkt → grupy
 * (po _productId) → produkty z kategorii grupy jako MenuAddon (cena z POS).
 * Gdy pizza nie ma własnej grupy, podpinamy grupę domyślną
 * (DOTYKACKA_PIZZA_CUSTOMIZATION_ID — jak w starej wtyczce WP).
 *
 * Porządek kategorii: gastronomiczny (pizza pierwsza, napoje na końcu),
 * kategorie techniczne (DOWÓZ) ukrywamy — to produkty opłat, nie jedzenie.
 */

import { dotykackaConfig, hasCredentials } from "./config";
import { dotyGetAll } from "./client";
import { mockMenu } from "./mock";
import type { DotyCategory, DotyCustomization, DotyProduct, Menu, MenuAddon, MenuCategory } from "./types";

function toNumber(v: number | string | undefined): number {
  if (v === undefined) return 0;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function norm(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ł/g, "l");
}

/** Kategorie techniczne — nie pokazujemy ich klientom (produkty opłat itp.). */
function isHiddenCategory(name: string): boolean {
  return /dowoz|dostawa|delivery|opłat|oplat/.test(norm(name));
}

/** Ranking kolejności: jedzenie od pizzy, napoje i dodatki na końcu. */
const CATEGORY_RANKS: Array<[RegExp, number]> = [
  [/dodatk.*pizz|pizz.*dodatk/, 80],
  [/dodatk/, 81],
  [/sos/, 82],
  [/pizz/, 0],
  [/zapiekank/, 10],
  [/danie dnia/, 12],
  [/zup/, 20],
  [/salatk/, 25],
  [/makaron/, 30],
  [/sniadan/, 32],
  [/nalesnik/, 44],
  [/deser/, 46],
  [/napoje zimne/, 60],
  [/napoje/, 61],
  [/piw/, 62],
  [/win/, 63],
  [/koktajl/, 64],
  [/pozostale/, 99],
];

function categoryRank(name: string): number {
  const n = norm(name);
  for (const [re, rank] of CATEGORY_RANKS) if (re.test(n)) return rank;
  return 38; // nieznane kategorie jedzeniowe — między daniami a deserami
}

export async function getMenu(): Promise<Menu> {
  if (!hasCredentials()) {
    return mockMenu();
  }

  const { cloudId } = dotykackaConfig;

  const [rawCategories, rawProducts, rawCustomizations] = await Promise.all([
    dotyGetAll<DotyCategory>(`/clouds/${cloudId}/categories`),
    dotyGetAll<DotyProduct>(`/clouds/${cloudId}/products`),
    dotyGetAll<DotyCustomization>(`/clouds/${cloudId}/product-customizations`).catch(
      () => [] as DotyCustomization[] // brak uprawnień/endpointu → menu bez dodatków
    ),
  ]);

  const visibleCats = rawCategories.filter((c) => c.display !== false && c.deleted !== true);
  const liveProducts = rawProducts.filter((p) => p.display !== false && p.deleted !== true);

  // Produkty-dodatki wg kategorii (do rozwijania grup customizations).
  const productsByCat = new Map<string, DotyProduct[]>();
  for (const p of liveProducts) {
    const key = String(p._categoryId ?? "");
    if (!productsByCat.has(key)) productsByCat.set(key, []);
    productsByCat.get(key)!.push(p);
  }

  // Grupa → lista dodatków (produkty z kategorii wskazanej przez grupę).
  const groups = rawCustomizations.filter((g) => g.deleted !== true);
  const addonsOfGroup = (g: DotyCustomization): MenuAddon[] =>
    (productsByCat.get(String(g._categoryId ?? "")) ?? []).map((p) => ({
      id: String(p.id),
      name: p.name,
      price: toNumber(p.priceWithVat),
      customizationId: String(g.id),
    }));

  // Produkt → grupy przypięte wprost (po _productId).
  const groupsByProduct = new Map<string, DotyCustomization[]>();
  for (const g of groups) {
    if (g._productId === undefined || g._productId === null) continue;
    const key = String(g._productId);
    if (!groupsByProduct.has(key)) groupsByProduct.set(key, []);
    groupsByProduct.get(key)!.push(g);
  }

  // Grupa domyślna dla pizz (jak „przypnij pod pizzę" w starej wtyczce WP).
  const defaultGroupId = process.env.DOTYKACKA_PIZZA_CUSTOMIZATION_ID?.trim();
  const defaultGroup = defaultGroupId ? groups.find((g) => String(g.id) === defaultGroupId) : undefined;

  const byCategory = new Map<string, MenuCategory>();
  for (const c of visibleCats) {
    if (isHiddenCategory(c.name)) continue;
    byCategory.set(String(c.id), { id: String(c.id), name: c.name, products: [] });
  }
  const uncategorized: MenuCategory = { id: "uncategorized", name: "Pozostałe", products: [] };

  const catNameById = new Map(visibleCats.map((c) => [String(c.id), c.name]));

  let productCount = 0;
  for (const p of liveProducts) {
    const target = byCategory.get(String(p._categoryId)) ?? (catNameById.has(String(p._categoryId)) ? null : uncategorized);
    if (!target) continue; // produkt z ukrytej kategorii (np. DOWÓZ)

    // Dodatki: grupy przypięte do produktu, a dla pizz bez grup — grupa domyślna.
    let addons: MenuAddon[] = (groupsByProduct.get(String(p.id)) ?? []).flatMap(addonsOfGroup);
    if (addons.length === 0 && defaultGroup) {
      const catName = norm(catNameById.get(String(p._categoryId)) ?? "");
      if (catName.includes("pizz") && !catName.includes("dodatk")) {
        addons = addonsOfGroup(defaultGroup);
      }
    }
    // Bez duplikatów (ten sam produkt-dodatek w dwóch grupach).
    const seen = new Set<string>();
    addons = addons.filter((a) => (seen.has(a.id) ? false : (seen.add(a.id), true)));

    target.products.push({
      id: String(p.id),
      name: p.name,
      description: p.description ?? "",
      price: toNumber(p.priceWithVat),
      color: p.hexColor,
      image: p.imageUrl,
      ...(addons.length > 0 ? { addons } : {}),
    });
    productCount++;
  }

  const categories = [...byCategory.values()].filter((c) => c.products.length > 0);
  if (uncategorized.products.length > 0) categories.push(uncategorized);
  categories.sort((a, b) => categoryRank(a.name) - categoryRank(b.name));

  return {
    source: "live",
    branch: dotykackaConfig.branchId || null,
    categories,
    productCount,
    fetchedAt: new Date().toISOString(),
  };
}
