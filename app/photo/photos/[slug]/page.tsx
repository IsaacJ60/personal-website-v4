import { notFound } from "next/navigation";
import { getPortfolio } from "@/features/photo-portfolio/data/catalog";
import PortfolioViewer from "@/features/photo-portfolio/components/PortfolioViewer";
import { photoViewerContext, type PortfolioSearch } from "@/features/photo-portfolio/lib/archive";
import { portfolioMetadata } from "@/features/photo-portfolio/lib/metadata";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<PortfolioSearch>;
};

async function getPhotoPage({ params, searchParams }: Props) {
  const [{ slug }, search] = await Promise.all([params, searchParams]);
  const { photos } = await getPortfolio();
  const context = photoViewerContext(photos, slug, search);
  if (!context) notFound();
  return context;
}

export async function generateMetadata(props: Props) {
  const { active } = await getPhotoPage(props);
  return portfolioMetadata(active.title, active.description?.trim() || `${active.title} — a photograph by Isaac Jiang.`,
    `/photo/photos/${encodeURIComponent(active.slug)}`, true,
    { path: `/photo/share/photos/${encodeURIComponent(active.slug)}`, alt: active.alt });
}

export default async function PreviewPhoto(props: Props) {
  const { photo, sequence, fromArchive, archiveContext, backHref } = await getPhotoPage(props);
  if (fromArchive) {
    return <PortfolioViewer title="Archive" description="" subtitle="From the photographic archive"
      photos={sequence}
      initialSlug={photo.slug} isDemo={false}
      archiveContext={archiveContext} backHref={backHref} />;
  }
  return <PortfolioViewer title={photo.title} description={photo.description || ""} photos={[photo]} isDemo={false} subtitle={null} />;
}
