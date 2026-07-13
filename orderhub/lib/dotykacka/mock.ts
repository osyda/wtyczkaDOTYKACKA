/**
 * Menu demonstracyjne (tryb MOCK) — prawdziwe pizze Mammarosa ze zdjęciami
 * (tła wycięte, /public/food/*.webp). Używane, dopóki nie podłączymy Dotykački.
 * ⚠️ CENY I OPISY ROBOCZE — do potwierdzenia z właścicielem; docelowo wszystko
 * przyjdzie z API Dotykački (imageUrl produktów ma priorytet).
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
  const pizzas = [
    { id: "pz-margherita", name: "Margherita", description: "Sos pomidorowy, mozzarella, oregano", price: 26, image: "/food/margherita.webp" },
    { id: "pz-vesuvio", name: "Vesuvio", description: "Sos pomidorowy, mozzarella, szynka", price: 30, image: "/food/vesuvio.webp" },
    { id: "pz-capricciosa", name: "Capricciosa", description: "Szynka, pieczarki, mozzarella", price: 32, image: "/food/capricciosa.webp", variants: ["SZYNKA MIELONA", "SZYNKA PLASTRY"] },
    { id: "pz-milanese", name: "Milanese", description: "Kurczak, kukurydza, pieczarki", price: 33, image: "/food/milanese.webp" },
    { id: "pz-carbonara", name: "Carbonara", description: "Sos śmietanowy, boczek, pieczarki, cebula", price: 34, image: "/food/carbonara.webp" },
    { id: "pz-gyros", name: "Gyros", description: "Kurczak gyros, czerwona cebula, pomidorki", price: 35, image: "/food/gyros.webp" },
    { id: "pz-mista", name: "Mista", description: "Salami, pieczarki, czerwona cebula", price: 33, image: "/food/mista.webp" },
    { id: "pz-palermo", name: "Palermo", description: "Salami, boczek, papryczki chili", price: 35, image: "/food/palermo.webp" },
    { id: "pz-vegetariana", name: "Vegetariana", description: "Pieczarki, papryka, świeże warzywa", price: 32, image: "/food/vegetariana.webp" },
    { id: "pz-campagnola", name: "Campagnola", description: "Salami, cebula, mozzarella", price: 34, image: "/food/campagnola.webp" },
    { id: "pz-labussola", name: "La Bussola", description: "Szynka, krewetki, mozzarella", price: 36, image: "/food/labussola.webp" },
    { id: "pz-formaggi", name: "Quattro Formaggi", description: "Cztery sery, bazylia", price: 36, image: "/food/formaggi.webp" },
    { id: "pz-parma", name: "Parma", description: "Szynka dojrzewająca, pomidorki, bazylia", price: 38, image: "/food/parma.webp" },
  ].map((p) => ({ ...p, addons: PIZZA_ADDONS }));

  return {
    source: "mock",
    branch: "Mammarosa (DEMO)",
    productCount: pizzas.length + 5,
    fetchedAt: new Date(0).toISOString(),
    categories: [
      { id: "c-pizza", name: "Pizza", products: pizzas },
      {
        id: "c-napoje",
        name: "Napoje",
        products: [
          { id: "d1", name: "Coca-Cola 0,5l", description: "Mocno schłodzona", price: 7 },
          { id: "d2", name: "Sok pomarańczowy", description: "100% wyciskany", price: 6 },
          { id: "d3", name: "Woda 0,5l", description: "Gazowana lub niegazowana", price: 5 },
        ],
      },
      {
        id: "c-desery",
        name: "Desery",
        products: [
          { id: "s1", name: "Tiramisu", description: "Mascarpone, espresso, kakao", price: 16 },
          { id: "s2", name: "Panna cotta", description: "Z sosem malinowym", price: 15 },
        ],
      },
    ],
  };
}
