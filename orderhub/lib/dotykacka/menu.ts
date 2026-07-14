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

import { Redis } from "@upstash/redis";
import { dotykackaConfig, hasCredentials } from "./config";
import { dotyGetAll } from "./client";
import { descriptionFor } from "./descriptions";
import { mockMenu } from "./mock";
import type { DotyCategory, DotyCustomization, DotyProduct, Menu, MenuAddon, MenuCategory } from "./types";

/* ---------- CACHE MENU (14.07.2026 — strona ładowała się 2–4 s) ----------
 * Pobranie pełnego menu z Dotykački to kilka zapytań (produkty stronami po
 * 100 itd.). Trzymamy zbudowane menu 5 min: w pamięci procesu i w Redis
 * (przeżywa zimny start serverless). Gdy API padnie — podajemy ostatnią
 * dobrą kopię zamiast błędu. */
const MENU_TTL_MS = 5 * 60 * 1000;

const URL_KV = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN_KV = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
let kv: Redis | null = null;
function redis(): Redis | null {
  if (!URL_KV || !TOKEN_KV) return null;
  if (!kv) kv = new Redis({ url: URL_KV, token: TOKEN_KV });
  return kv;
}

type MenuCacheEntry = { menu: Menu; at: number };
declare global {
  // eslint-disable-next-line no-var
  var __mrMenuCache: Record<string, MenuCacheEntry> | undefined;
}
const gCache = (globalThis as typeof globalThis & { __mrMenuCache?: Record<string, MenuCacheEntry> }).__mrMenuCache ??
  ((globalThis as typeof globalThis & { __mrMenuCache?: Record<string, MenuCacheEntry> }).__mrMenuCache = {});

async function cachedMenu(key: string): Promise<Menu | null> {
  const mem = gCache[key];
  if (mem && Date.now() - mem.at < MENU_TTL_MS) return mem.menu;
  try {
    const fromKv = await redis()?.get<MenuCacheEntry>(`menu:cache:${key}`);
    if (fromKv && Date.now() - fromKv.at < MENU_TTL_MS) {
      gCache[key] = fromKv;
      return fromKv.menu;
    }
  } catch {
    /* cache to tylko przyspieszacz */
  }
  return null;
}

async function saveMenuCache(key: string, menu: Menu): Promise<void> {
  const entry: MenuCacheEntry = { menu, at: Date.now() };
  gCache[key] = entry;
  try {
    await redis()?.set(`menu:cache:${key}`, entry, { ex: Math.ceil(MENU_TTL_MS / 1000) + 60 });
  } catch {
    /* pamięć już ma */
  }
}

/** Ostatnia dobra kopia (bez limitu wieku) — awaryjnie, gdy API Dotykački nie odpowiada. */
async function staleMenu(key: string): Promise<Menu | null> {
  if (gCache[key]) return gCache[key].menu;
  try {
    const fromKv = await redis()?.get<MenuCacheEntry>(`menu:cache:${key}`);
    return fromKv?.menu ?? null;
  } catch {
    return null;
  }
}

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

/** Kategorie techniczne — ukryte ZAWSZE i wszędzie (produkty opłat itp.). */
function isTechnicalCategory(name: string): boolean {
  return /dowoz|dostawa|delivery|opłat|oplat/.test(norm(name));
}

/**
 * Kategorie ukryte przed KLIENTAMI (decyzja właściciela 13.07.2026) — ekran
 * telefoniczny kelnerki widzi je nadal (?full=1), żeby dało się wbić np. colę.
 * Można nadpisać zmienną MENU_HIDDEN_CATEGORIES (frazy po przecinku).
 */
const DEFAULT_CUSTOMER_HIDDEN = [
  "napoje zimne",
  "napoje gorace",
  "piwa",
  "dodatki pizza",
  "koktajle",
  "danie dnia",
  "wina",
  "pozostale",
  "sniadania",
  "desery",
];

function customerHiddenList(): string[] {
  const env = process.env.MENU_HIDDEN_CATEGORIES;
  if (env?.trim()) return env.split(",").map((s) => norm(s.trim())).filter(Boolean);
  return DEFAULT_CUSTOMER_HIDDEN;
}

function isCustomerHidden(name: string): boolean {
  const n = norm(name);
  return customerHiddenList().some((h) => n.includes(h));
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

export async function getMenu(opts?: { full?: boolean }): Promise<Menu> {
  const full = opts?.full === true;
  if (!hasCredentials()) {
    return mockMenu();
  }

  // Najpierw cache (pamięć → Redis) — świeże menu w ułamku sekundy.
  const cacheKey = full ? "full" : "customer";
  const cached = await cachedMenu(cacheKey);
  if (cached) return cached;

  const { cloudId } = dotykackaConfig;

  let rawCategories: DotyCategory[], rawProducts: DotyProduct[], rawCustomizations: DotyCustomization[];
  try {
    [rawCategories, rawProducts, rawCustomizations] = await Promise.all([
      dotyGetAll<DotyCategory>(`/clouds/${cloudId}/categories`),
      dotyGetAll<DotyProduct>(`/clouds/${cloudId}/products`),
      dotyGetAll<DotyCustomization>(`/clouds/${cloudId}/product-customizations`).catch(
        () => [] as DotyCustomization[] // brak uprawnień/endpointu → menu bez dodatków
      ),
    ]);
  } catch (e) {
    // API Dotykački nie odpowiada → ostatnia dobra kopia zamiast błędu.
    const stale = await staleMenu(cacheKey);
    if (stale) return stale;
    throw e;
  }

  const visibleCats = rawCategories.filter((c) => c.display !== false && c.deleted !== true);
  const liveProducts = rawProducts.filter((p) => p.display !== false && p.deleted !== true);

  // Produkty-dodatki wg kategorii (do rozwijania grup customizations).
  const productsByCat = new Map<string, DotyProduct[]>();
  for (const p of liveProducts) {
    const key = String(p._categoryId ?? "");
    if (!productsByCat.has(key)) productsByCat.set(key, []);
    productsByCat.get(key)!.push(p);
  }

  // Grupa → lista dodatków (produkty z kategorii wskazanej przez grupę),
  // ułożona wg popularności: frytki/ziemniaki najpierw, surówki w środku,
  // pieczywo itp. na końcu (życzenie właściciela 13.07.2026). Nazwy spoza
  // listy (np. dodatki do pizzy) zachowują kolejność z POS.
  const ADDON_RANKS: Array<[RegExp, number]> = [
    [/frytk/, 0],
    [/ziemnia/, 1],
    [/pure/, 2],
    [/ryz/, 3],
    [/kasz/, 4],
    [/makaron|kluski/, 5],
    [/surowk/, 20],
    [/buraczk/, 21],
    [/marchewk/, 22],
    [/kapust/, 23],
    [/salatk/, 24],
    [/warzyw/, 25],
    [/grzank/, 85],
    [/pieczyw|chleb|bulk|maslo/, 90],
  ];
  const addonRank = (name: string): number => {
    const n = norm(name);
    for (const [re, rank] of ADDON_RANKS) if (re.test(n)) return rank;
    return 50;
  };

  // Produkty ukryte NA LISTACH DODATKÓW (w swojej kategorii pozostają widoczne).
  // Nadpisywalne zmienną MENU_HIDDEN_ADDONS (frazy po przecinku).
  const hiddenAddons = (process.env.MENU_HIDDEN_ADDONS ?? "frytki danie")
    .split(",")
    .map((s) => norm(s.trim()))
    .filter(Boolean);
  const isHiddenAddon = (name: string) => {
    const n = norm(name);
    return hiddenAddons.some((h) => n.includes(h));
  };

  const groups = rawCustomizations.filter((g) => g.deleted !== true);
  const addonsOfGroup = (g: DotyCustomization): MenuAddon[] =>
    (productsByCat.get(String(g._categoryId ?? "")) ?? [])
      .filter((p) => !isHiddenAddon(p.name))
      .map((p) => ({
        id: String(p.id),
        name: p.name,
        price: toNumber(p.priceWithVat),
        customizationId: String(g.id),
      }))
      .sort((a, b) => addonRank(a.name) - addonRank(b.name));

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

  // Opakowanie na wynos: produkt z POS doliczany do każdego dania głównego.
  const packagingId = process.env.DOTYKACKA_PACKAGING_PRODUCT_ID?.trim();
  const packagingProduct = packagingId ? rawProducts.find((p) => String(p.id) === packagingId) : undefined;
  const packaging = packagingProduct
    ? { id: String(packagingProduct.id), price: toNumber(packagingProduct.priceWithVat) }
    : undefined;
  // Dania główne = kategorie jedzeniowe (ranking < 60: pizza…desery); napoje,
  // dodatki i sosy bez opakowania (jadą w opakowaniu dania).
  const needsPackaging = (catName: string) => categoryRank(catName) < 60;

  const byCategory = new Map<string, MenuCategory>();
  for (const c of visibleCats) {
    if (isTechnicalCategory(c.name)) continue;
    if (!full && isCustomerHidden(c.name)) continue;
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

    // Warianty bez dopłaty — „Szybkie notatki" z karty produktu w POS
    // (np. SZYNKA MIELONA / SZYNKA PLASTRY). Klient wybiera jeden.
    let variants = (Array.isArray(p.notes) ? p.notes : [])
      .map((n) => (typeof n === "string" ? n : (n?.note ?? "")))
      .map((s) => s.trim())
      .filter(Boolean);

    const catName = catNameById.get(String(p._categoryId)) ?? "";
    const description = p.description?.trim() || p.subtitle?.trim() || descriptionFor(p.name);

    // Rodzaj szynki (decyzja właściciela 14.07.2026): przy KAŻDEJ zapiekance
    // i pizzy z szynką mieloną w składzie klient MUSI wybrać mielona/plastry.
    let variantsRequired = false;
    if (/zapiekank/.test(norm(catName)) || /szynka mielona/.test(norm(description))) {
      if (variants.length === 0) variants = ["SZYNKA MIELONA", "SZYNKA PLASTRY"];
      variantsRequired = true;
    }

    target.products.push({
      id: String(p.id),
      name: p.name,
      description,
      price: toNumber(p.priceWithVat),
      color: p.hexColor,
      image: p.imageUrl,
      ...(variants.length > 0 ? { variants } : {}),
      ...(variantsRequired ? { variantsRequired } : {}),
      ...(addons.length > 0 ? { addons } : {}),
      ...(packaging && String(p.id) !== packaging.id && needsPackaging(catName) ? { packaging } : {}),
    });
    productCount++;
  }

  const categories = [...byCategory.values()].filter((c) => c.products.length > 0);
  // „Pozostałe" (produkty bez kategorii) — tylko w pełnym widoku dla obsługi.
  if (full && uncategorized.products.length > 0) categories.push(uncategorized);
  categories.sort((a, b) => categoryRank(a.name) - categoryRank(b.name));

  const menu: Menu = {
    source: "live",
    branch: dotykackaConfig.branchId || null,
    categories,
    productCount,
    fetchedAt: new Date().toISOString(),
  };
  await saveMenuCache(cacheKey, menu);
  return menu;
}
