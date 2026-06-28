import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mamma Rosa — Zamówienia",
    short_name: "Mamma Rosa",
    description: "Zamawianie online + panel zamówień Mamma Rosa.",
    start_url: "/panel",
    display: "standalone",
    background_color: "#1F1714",
    theme_color: "#B7382F",
    icons: [
      {
        src: "/brand/icon-tomato.png",
        sizes: "165x160",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
