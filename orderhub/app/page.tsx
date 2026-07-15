// Główny adres serwuje sklep BEZPOŚREDNIO (bez skoku przez przekierowanie
// na /menu — to była dodatkowa runda do serwera przy każdym wejściu).
// /menu zostaje jako drugi adres tej samej strony (linki, sitelinki Google).
export { default, metadata } from "./menu/page";
export const dynamic = "force-dynamic";
