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
}

export interface MenuProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  color?: string;
  addons?: MenuAddon[];
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
