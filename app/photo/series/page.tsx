import Link from "next/link";
import SeriesCard from "@/features/photo-portfolio/components/SeriesCard";
import { getPortfolio } from "@/features/photo-portfolio/data/catalog";
import styles from "@/features/photo-portfolio/portfolio.module.css";
import { portfolioMetadata } from "@/features/photo-portfolio/lib/metadata";

export const metadata = portfolioMetadata("Series", "Photographic series and sequences by Isaac Jiang.", "/photo/series");

export default async function SeriesPage() {
  const { collections } = await getPortfolio();
  const series = collections.filter((collection) => collection.kind === "series" && (collection.publicView ?? "series") === "series" && collection.photos.length > 0);

  return <section aria-label="Series">
    {series.length ? <div className={styles.seriesGrid}>
      {series.map((collection, index) => <SeriesCard key={collection.id} id={collection.id}
        title={collection.title}
        cover={collection.photos.find((photo) => photo.id === collection.coverPhotoId) ?? collection.photos[0]}
        href={`/photo/series/${collection.slug}`} eager={index < 2} />)}
    </div> : <div className={styles.emptyState}>
      <p>The first sequences are still taking shape.</p>
      <Link href="/photo">Explore Selected Work</Link>
    </div>}
  </section>;
}
