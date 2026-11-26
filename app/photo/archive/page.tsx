import Link from "next/link";
import SeriesCard from "@/features/photo-portfolio/components/SeriesCard";
import PortfolioPageHeader from "@/features/photo-portfolio/components/PortfolioPageHeader";
import { getPortfolio } from "@/features/photo-portfolio/data/catalog";
import styles from "@/features/photo-portfolio/portfolio.module.css";
import { portfolioMetadata } from "@/features/photo-portfolio/lib/metadata";

export const metadata = portfolioMetadata("Archive", "Archived photographic series by Isaac Jiang.", "/photo/archive");

export default async function ArchivePage() {
  const { collections } = await getPortfolio();
  const series = collections.filter((collection) => collection.kind === "series" && (collection.publicView ?? "series") === "archive" && collection.photos.length > 0);

  return <section aria-labelledby="series-title">
    <PortfolioPageHeader id="series-title" title="Archive" />
    {series.length ? <div className={styles.seriesGrid}>
      {series.map((collection, index) => <SeriesCard key={collection.id} id={collection.id}
        title={collection.title} description={collection.description}
        cover={collection.photos.find((photo) => photo.id === collection.coverPhotoId) ?? collection.photos[0]}
        count={collection.photos.length} href={`/photo/archive/${collection.slug}`}
        label={collection.isDemo ? "Demo series" : undefined} eager={index < 2} />)}
    </div> : <div className={styles.emptyState}>
      <p>No series have been archived yet.</p>
      <Link href="/photo/series">Explore Series</Link>
    </div>}
  </section>;
}
