import type { MetadataRoute } from "next";
import type { PortfolioCollection, PortfolioPhoto } from "../types";

// The caller supplies the anonymous, published-only catalog. Never use admin data.
export function portfolioSitemap(origin: string, photos: Pick<PortfolioPhoto, "slug" | "updatedAt">[],
  collections: Pick<PortfolioCollection, "slug" | "kind" | "isDemo" | "updatedAt">[]): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = ["/", "/photo", "/photo/series", "/photo/archive", "/photo/about"]
    .map((path) => ({ url: new URL(path, origin).href }));
  for (const photo of photos) {
    entries.push({ url: new URL(`/photo/photos/${encodeURIComponent(photo.slug)}`, origin).href,
      ...(photo.updatedAt ? { lastModified: photo.updatedAt } : {}) });
  }
  for (const collection of collections) {
    if (collection.kind !== "series" || collection.isDemo) continue;
    entries.push({ url: new URL(`/photo/series/${encodeURIComponent(collection.slug)}`, origin).href,
      ...(collection.updatedAt ? { lastModified: collection.updatedAt } : {}) });
  }
  return entries;
}
