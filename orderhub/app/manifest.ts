import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mammarosa — Zamówienia",
    short_name: "Mammarosa",
    description: "Zamawianie online + panel zamówień Mammarosa.",
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
