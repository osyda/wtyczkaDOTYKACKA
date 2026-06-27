/**
 * Pobranie menu z Dotykački i znormalizowanie go pod UI sklepu.
 * Gdy brak kluczy → zwraca menu MOCK (żeby ekran działał od ręki).
 *
 * Faza 0: dowodzi, że umiemy się zalogować i zaciągnąć produkty/kategorie z POS.
 */

import { dotykackaConfig, hasCredentials } from "./config";
import { dotyGetAll } from "./client";
import { mockMenu } from "./mock";
import type { DotyCategory, DotyProduct, Menu, MenuCategory } from "./types";

function toNumber(v: number | string | undefined): number {
  if (v === undefined) return 0;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export async function getMenu(): Promise<Menu> {
  if (!hasCredentials()) {
    return mockMenu();
  }

  const { cloudId } = dotykackaConfig;

  const [rawCategories, rawProducts] = await Promise.all([
    dotyGetAll<DotyCategory>(`/clouds/${cloudId}/categories`),
    dotyGetAll<DotyProduct>(`/clouds/${cloudId}/products`),
  ]);

  const visibleCats = rawCategories.filter((c) => c.display !== false && c.deleted !== true);

  const byCategory = new Map<string, MenuCategory>();
  for (const c of visibleCats) {
    byCategory.set(String(c.id), { id: String(c.id), name: c.name, products: [] });
  }
  const uncategorized: MenuCategory = { id: "uncategorized", name: "Pozostałe", products: [] };

  let productCount = 0;
  for (const p of rawProducts) {
    if (p.display === false || p.deleted === true) continue;
    const target = byCategory.get(String(p._categoryId)) ?? uncategorized;
    target.products.push({
      id: String(p.id),
      name: p.name,
      description: p.description ?? "",
      price: toNumber(p.priceWithVat),
      color: p.hexColor,
    });
    productCount++;
  }

  const categories = [...byCategory.values()].filter((c) => c.products.length > 0);
  if (uncategorized.products.length > 0) categories.push(uncategorized);

  return {
    source: "live",
    branch: dotykackaConfig.branchId || null,
    categories,
    productCount,
    fetchedAt: new Date().toISOString(),
  };
}
