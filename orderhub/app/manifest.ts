import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mamma Rosa — Zamówienia",
    short_name: "Mamma Rosa",
    description: "Zamawianie online + panel zamówień Mamma Rosa.",
    start_url: "/panel",
    display: "standalone",
    background_color: "#0f1115",
    theme_color: "#b21f1f",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
