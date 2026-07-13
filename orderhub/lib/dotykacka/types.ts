/**
 * Typy encji Dotykačka API v2 (na podstawie docs/dotypos_api_brain.md).
 * Pola, których jeszcze nie używamy, są celowo pominięte — dodamy w kolejnych fazach.
 */

export interface DotyBranch {
  id: number | string;
  name: string;
  display?: boolean;
  deleted?: boolean;
}

export interface DotyCategory {
  id: number | string;
  name: string;
  sortOrder?: number;
  display?: boolean;
  deleted?: boolean;
}

export interface DotyProduct {
  id: number | string;
  _categoryId?: number | string;
  name: string;
  description?: string;
  priceWithVat?: number | string;
  currency?: string;
  unit?: string;
  display?: boolean;
  deleted?: boolean;
  flags?: number;
  hexColor?: string;
  imageUrl?: string;
}

/** Grupa dodatków (customization) — wskazuje kategorię, z której pochodzą produkty-dodatki. */
export interface DotyCustomization {
  id: number | string;
  _categoryId?: number | string;
  _productId?: number | string;
  _defaultProductIds?: Array<number | string>;
  name?: string;
  minSelected?: number;
  maxSelected?: number;
  sortOrder?: number;
  deleted?: boolean;
}

/** Standardowa koperta paginacji w API v2. */
export interface DotyPage<T> {
  currentPage: number;
  perPage: number;
  totalItemsCount: number | null;
  lastPage: number | null;
  nextPage: number | null;
  data: T[];
}

/* ---- Znormalizowany kształt pod UI (sklep / panel) ---- */

export interface MenuAddon {
  id: string;
  name: string;
  price: number;
  /** ID grupy customizations w Dotykačce — potrzebne przy wysyłce dodatku do POS. */
  customizationId?: string;
}

export interface MenuProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  color?: string;
  image?: string; // zdjęcie potrawy (Dotykačka imageUrl) — gdy brak, pokazujemy placeholder
  emoji?: string; // emoji wg kategorii (placeholder)
  addons?: MenuAddon[];
  /** Opakowanie na wynos doliczane do tego dania (produkt z POS: id + cena). */
  packaging?: { id: string; price: number };
}

export interface MenuCategory {
  id: string;
  name: string;
  products: MenuProduct[];
}

export interface Menu {
  source: "live" | "mock";
  branch: string | null;
  categories: MenuCategory[];
  productCount: number;
  fetchedAt: string;
}
