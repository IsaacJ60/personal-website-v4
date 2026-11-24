import { getPortfolio } from "@/features/photo-portfolio/data/catalog";
import { portfolioOrigin } from "@/features/photo-portfolio/lib/metadata";
import { portfolioSitemap } from "@/features/photo-portfolio/lib/sitemap";

// No deployment or separate cache invalidation needed when public content changes.
export const dynamic = "force-dynamic";

export default async function sitemap() {
  const { photos, collections } = await getPortfolio();
  return portfolioSitemap(portfolioOrigin, photos, collections);
}
