import { notFound, redirect } from "next/navigation";
import { getPortfolio } from "../data/catalog";
import { portfolioMetadata } from "../lib/metadata";
import { publicSeriesHref } from "../lib/public-views";
import PortfolioViewer from "./PortfolioViewer";

async function getSeries(slug: string, publicView: string) {
  const { collections } = await getPortfolio();
  const series = collections.find((item) => item.kind === "series" && item.slug === slug);
  if (!series) notFound();
  if ((series.publicView ?? "series") !== publicView) redirect(publicSeriesHref(series.slug, series.publicView));
  return series;
}

export async function seriesPageMetadata(slug: string, publicView: string) {
  const series = await getSeries(slug, publicView);
  const cover = series.photos.find((photo) => photo.id === series.coverPhotoId) ?? series.photos[0];
  return portfolioMetadata(series.title, series.description.trim() || `${series.title} — a photographic series by Isaac Jiang.`,
    publicSeriesHref(series.slug, publicView), !series.isDemo,
    { path: `/photo/share/series/${encodeURIComponent(series.slug)}`, alt: cover?.alt || series.title });
}

export default async function PublicSeriesPage({ slug, publicView }: { slug: string; publicView: "series" | "archive" }) {
  const series = await getSeries(slug, publicView);
  return <PortfolioViewer key={series.id} title={series.title} description={series.description}
    photos={series.photos} isDemo={series.isDemo} backHref={`/photo/${publicView}`}
    backLabel={publicView === "archive" ? "All archived series" : "All series"} />;
}
