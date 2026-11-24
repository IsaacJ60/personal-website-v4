import type { MetadataRoute } from "next";
import { portfolioOrigin } from "@/features/photo-portfolio/lib/metadata";

export default function robots(): MetadataRoute.Robots {
  // Keep noindex pages crawlable so search engines can see their directives.
  // This also allows the public share cards and uploaded photo media to be read.
  return { rules: { userAgent: "*", allow: "/" }, sitemap: `${portfolioOrigin}/sitemap.xml` };
}
