import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PortfolioViewer from "@/features/photo-portfolio/components/PortfolioViewer";
import { getPortfolio } from "@/features/photo-portfolio/data/catalog";

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
  return { title: collection.title, description: collection.description || undefined };
}

export default async function SeriesPage({ params }: Props) {
  const collection = await getSeries(params);
  return <PortfolioViewer key={collection.id} title={collection.title}
    description={collection.description} photos={collection.photos} isDemo={collection.isDemo}
    backHref="/photo/series" backLabel="All series" />;
}
