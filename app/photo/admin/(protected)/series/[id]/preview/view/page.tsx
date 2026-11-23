import Link from "next/link";
import PortfolioViewer from "@/features/photo-portfolio/components/PortfolioViewer";
import { getSeriesPreview } from "@/features/photo-portfolio/data/admin";

export default async function SeriesSequencePreview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { draft, photos } = await getSeriesPreview(id);
  const backHref = `/photo/admin/series/${draft.id}/preview`;
  if (!photos.length) return <section>
    <h1>{draft.title}</h1><p>Add photographs to preview this series.</p>
    <Link href={backHref}>Back to tile preview</Link>
  </section>;
  return <PortfolioViewer key={id} title={draft.title} description={draft.description} photos={photos}
    isDemo={false} subtitle="Private draft" backHref={backHref} backLabel="Back to tile preview" />;
}
