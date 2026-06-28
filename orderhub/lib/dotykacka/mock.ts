/**
 * Przykładowe menu (tryb MOCK) — używane, gdy nie ma jeszcze kluczy do Dotykački.
 * Pozwala zobaczyć działający ekran zanim podłączymy realne dane.
 */

import type { Menu } from "./types";

const PIZZA_ADDONS = [
  { id: "a-ser", name: "Dodatkowy ser", price: 5 },
  { id: "a-pieczarki", name: "Pieczarki", price: 4 },
  { id: "a-szynka", name: "Szynka", price: 5 },
  { id: "a-salami", name: "Salami", price: 5 },
  { id: "a-oliwki", name: "Oliwki", price: 4 },
];

export function mockMenu(): Menu {
  return {
    source: "mock",
    branch: "Mammarosa (DEMO)",
    productCount: 11,
    fetchedAt: new Date(0).toISOString(),
    categories: [
      {
        id: "c-pizza",
        name: "Pizza",
        products: [
          { id: "p1", name: "Margherita", description: "Sos pomidorowy, mozzarella, bazylia", price: 26, color: "#c0392b", addons: PIZZA_ADDONS },
          { id: "p2", name: "Capricciosa", description: "Szynka, pieczarki, karczochy, mozzarella", price: 34, color: "#d35400", addons: PIZZA_ADDONS },
          { id: "p3", name: "Diavola", description: "Salami pikantne, papryczki, mozzarella", price: 34, color: "#8e44ad", addons: PIZZA_ADDONS },
          { id: "p4", name: "Hawajska", description: "Szynka, ananas, mozzarella", price: 32, color: "#2980b9", addons: PIZZA_ADDONS },
          { id: "p5", name: "Quattro Formaggi", description: "Cztery sery", price: 36, color: "#16a085", addons: PIZZA_ADDONS },
          { id: "p6", name: "Wiejska", description: "Boczek, cebula, kiełbasa, mozzarella", price: 33, color: "#27ae60", addons: PIZZA_ADDONS },
        ],
      },
      {
        id: "c-napoje",
        name: "Napoje",
        products: [
          { id: "p7", name: "Coca-Cola 0,5l", description: "", price: 7, color: "#f39c12" },
          { id: "p8", name: "Sok pomarańczowy", description: "", price: 6, color: "#7f8c8d" },
          { id: "p9", name: "Woda 0,5l", description: "", price: 5, color: "#1abc9c" },
        ],
      },
      {
        id: "c-desery",
        name: "Desery",
        products: [
          { id: "p10", name: "Tiramisu", description: "Klasyczne", price: 16, color: "#c0392b" },
          { id: "p11", name: "Panna cotta", description: "Z sosem malinowym", price: 15, color: "#a04000" },
        ],
      },
    ],
  };
}
