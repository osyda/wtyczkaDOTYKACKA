import type { Metadata } from "next";
import { getMenu } from "@/lib/dotykacka/menu";
import { getWeekHours } from "@/lib/hours";
import { Shop } from "@/components/Shop";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Menu i zamówienia online — pizza, zapiekanki, obiady",
  description:
    "Pełne menu pizzerii Mammarosa w Kościerzynie z cenami. Pizza z pieca, zapiekanki, dania obiadowe, pizza pół na pół. Zamów z dostawą albo odbierz osobiście.",
  alternates: { canonical: "/menu" },
};

/** Dane strukturalne schema.org (Restaurant) — wizytówka dla Google:
 *  lokal, telefon, godziny (z wizytówki Google/env), link do zamówień. */
async function restaurantJsonLd(): Promise<string> {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  let opening: Array<Record<string, unknown>> = [];
  try {
    const { week } = await getWeekHours();
    opening = week.flatMap((h, i) =>
      h ? [{ "@type": "OpeningHoursSpecification", dayOfWeek: days[i], opens: h.open, closes: h.close }] : []
    );
  } catch {
    /* bez godzin — reszta wizytówki i tak się przyda */
  }
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: "Mammarosa — Restauracja Pizzeria",
    url: "https://zamow.mammarosa.pl",
    sameAs: ["https://www.mammarosa.pl"],
    telephone: "+48586865530",
    servesCuisine: ["pizza", "kuchnia włoska", "kuchnia polska"],
    priceRange: "$$",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Rynek 13",
      postalCode: "83-400",
      addressLocality: "Kościerzyna",
      addressCountry: "PL",
    },
    ...(opening.length > 0 ? { openingHoursSpecification: opening } : {}),
    potentialAction: {
      "@type": "OrderAction",
      target: "https://zamow.mammarosa.pl/menu",
      deliveryMethod: [
        "http://purl.org/goodrelations/v1#DeliveryModeOwnFleet",
        "http://purl.org/goodrelations/v1#DeliveryModePickUp",
      ],
    },
  });
}

export default async function MenuPage() {
  const [menu, jsonLd] = await Promise.all([getMenu(), restaurantJsonLd()]);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <Shop menu={menu} />
    </>
  );
}
