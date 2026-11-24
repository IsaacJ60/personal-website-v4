import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PortfolioViewer from "@/features/photo-portfolio/components/PortfolioViewer";
import { getPortfolio } from "@/features/photo-portfolio/data/catalog";
import { portfolioMetadata } from "@/features/photo-portfolio/lib/metadata";

type Props = { params: Promise<{ slug: string }> };

async function getSeries(params: Props["params"]) {
  const { slug } = await params;
  const { collections } = await getPortfolio();
  const collection = collections.find((item) => item.kind === "series" && item.slug === slug);
  if (!collection) notFound();
  return collection;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const collection = await getSeries(params);
  const cover = collection.photos.find((photo) => photo.id === collection.coverPhotoId) ?? collection.photos[0];
  return portfolioMetadata(collection.title, collection.description.trim() || `${collection.title} — a photographic series by Isaac Jiang.`,
    `/photo/series/${encodeURIComponent(collection.slug)}`, !collection.isDemo,
    { path: `/photo/share/series/${encodeURIComponent(collection.slug)}`, alt: cover?.alt || collection.title });
}

export default async function SeriesPage({ params }: Props) {
  const collection = await getSeries(params);
  return <PortfolioViewer key={collection.id} title={collection.title}
    description={collection.description} photos={collection.photos} isDemo={collection.isDemo}
    backHref="/photo/series" backLabel="All series" />;
}
