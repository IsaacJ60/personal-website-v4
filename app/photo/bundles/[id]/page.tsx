import { redirect } from "next/navigation";
import { getPortfolio } from "@/features/photo-portfolio/data/catalog";

// Public Series equivalents verified during cutover. The old pages also
// cover these links if a photographer later takes a Series offline.
const publishedEquivalents = new Map([
  ["couple-portraits-1-fzbca1", "couple-portraits-1"],
  ["blue-flower-series-a5jki2", "blue-flower-series"],
]);

export default async function LegacyBundleLink({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const slug = publishedEquivalents.get(id);
  if (slug) {
    const { collections } = await getPortfolio();
    if (collections.some((collection) => collection.kind === "series" && !collection.isDemo && collection.slug === slug)) {
      redirect(`/photo/series/${slug}`);
    }
  }
  redirect(`/photo-legacy/bundles/${encodeURIComponent(id)}`);
}
