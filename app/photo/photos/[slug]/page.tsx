import { notFound } from "next/navigation";
import { getPortfolio } from "@/features/photo-portfolio/data/catalog";
import PortfolioViewer from "@/features/photo-portfolio/components/PortfolioViewer";
import { archiveHref, archivePage, archivePageSize, filterArchive } from "@/features/photo-portfolio/lib/archive";

export default async function PreviewPhoto({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ slug }, search] = await Promise.all([params, searchParams]);
  const { photos } = await getPortfolio();
  const photo = photos.find((p) => p.slug === slug);
  if (!photo) notFound();
  if (search.from === "archive") {
    const query = typeof search.q === "string" ? search.q : "";
    const place = typeof search.place === "string" ? search.place : "";
    const year = typeof search.year === "string" ? search.year : "";
    const matches = filterArchive(photos, query, place, year);
    const page = archivePage(typeof search.page === "string" ? search.page : null,
      Math.max(1, Math.ceil(matches.length / archivePageSize)));
    return <PortfolioViewer title="Archive" description="" subtitle="From the photographic archive"
      photos={matches.some((item) => item.id === photo.id) ? matches : [photo]}
      initialSlug={photo.slug} isDemo={false}
      archiveContext={matches.some((item) => item.id === photo.id) ? { query, place, year } : undefined}
      backHref={`${archiveHref(query, place, year, page)}#photo-${photo.slug}`} />;
  }
  return <PortfolioViewer title={photo.title} description={photo.description || ""} photos={[photo]} isDemo={false} subtitle={null} />;
}
