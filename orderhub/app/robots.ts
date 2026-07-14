import type { MetadataRoute } from "next";

/**
 * Google ma indeksować TYLKO witrynę klienta (menu). Strony obsługi, koszyk
 * i strony osobiste są wyłączone — nie mają wartości w wynikach wyszukiwania,
 * a panel dodatkowo chroni hasło.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/panel", "/panel/", "/status", "/api/", "/checkout", "/moje", "/dziekujemy/"],
    },
    sitemap: "https://zamow.mammarosa.pl/sitemap.xml",
  };
}
