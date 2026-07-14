import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: "https://zamow.mammarosa.pl/", changeFrequency: "weekly", priority: 1 },
    { url: "https://zamow.mammarosa.pl/menu", changeFrequency: "daily", priority: 0.9 },
  ];
}
