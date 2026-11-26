import PublicSeriesPage, { seriesPageMetadata } from "@/features/photo-portfolio/components/PublicSeriesPage";

type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props) {
  return seriesPageMetadata((await params).slug, "archive");
}
export default async function Page({ params }: Props) {
  return <PublicSeriesPage slug={(await params).slug} publicView="archive" />;
}
