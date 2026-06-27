/**
 * Przykładowe menu (tryb MOCK) — używane, gdy nie ma jeszcze kluczy do Dotykački.
 * Pozwala zobaczyć działający ekran zanim podłączymy realne dane.
 */

import type { Menu } from "./types";

export function mockMenu(): Menu {
  return {
    source: "mock",
    branch: "Mamma Rosa (DEMO)",
    productCount: 11,
    fetchedAt: new Date(0).toISOString(),
    categories: [
      {
        id: "c-pizza",
        name: "Pizza",
        products: [
          { id: "p1", name: "Margherita", description: "Sos pomidorowy, mozzarella, bazylia", price: 26, color: "#c0392b" },
          { id: "p2", name: "Capricciosa", description: "Szynka, pieczarki, karczochy, mozzarella", price: 34, color: "#d35400" },
          { id: "p3", name: "Diavola", description: "Salami pikantne, papryczki, mozzarella", price: 34, color: "#8e44ad" },
          { id: "p4", name: "Hawajska", description: "Szynka, ananas, mozzarella", price: 32, color: "#2980b9" },
          { id: "p5", name: "Quattro Formaggi", description: "Cztery sery", price: 36, color: "#16a085" },
          { id: "p6", name: "Wiejska", description: "Boczek, cebula, kiełbasa, mozzarella", price: 33, color: "#27ae60" },
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
