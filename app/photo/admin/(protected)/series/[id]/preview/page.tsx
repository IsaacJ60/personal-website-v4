import Link from "next/link";
import PortfolioPageHeader from "@/features/photo-portfolio/components/PortfolioPageHeader";
import PublishDraft from "@/features/photo-portfolio/components/PublishDraft";
import SeriesCard from "@/features/photo-portfolio/components/SeriesCard";
import { getDraftPublication, getSeriesPreview } from "@/features/photo-portfolio/data/admin";
import adminStyles from "@/features/photo-portfolio/admin.module.css";
import styles from "@/features/photo-portfolio/portfolio.module.css";

export default async function SeriesTilePreview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { draft, photos, cover } = await getSeriesPreview(id);
  const publication = cover ? await getDraftPublication(id) : null;
  const editor = `/photo/admin/series/${draft.id}`;
  return <section aria-labelledby="series-preview">
    <div className={adminStyles.draftBar}>
      <Link className={adminStyles.textLink} href={editor}>← Back to editor</Link>
      <span>Private preview</span>
      {cover && <PublishDraft id={id} title={draft.title} revision={draft.revision}
        publication={publication} hasPrivatePhotos={false} isSeries />}
    </div>
    <PortfolioPageHeader id="series-preview" title="Series" />
    {cover ? <div className={styles.seriesGrid}>
      <SeriesCard id={draft.id} title={draft.title}
        cover={cover} href={`${editor}/preview/view`} eager />
    </div> : <p>Add photographs to preview this series.</p>}
  </section>;
}
