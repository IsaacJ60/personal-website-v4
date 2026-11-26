import Link from "next/link";
import SeriesCard from "@/features/photo-portfolio/components/SeriesCard";
import { getSeriesCards } from "@/features/photo-portfolio/data/series-cards";
import styles from "@/features/photo-portfolio/portfolio.module.css";
import { portfolioMetadata } from "@/features/photo-portfolio/lib/metadata";

export const metadata = portfolioMetadata("Archive", "Archived photographic series by Isaac Jiang.", "/photo/archive");

export default async function ArchivePage() {
  const cards = await getSeriesCards();
  const series = cards.filter((collection) => collection.publicView === "archive");

  return <section aria-label="Archive">
    {series.length ? <div className={styles.seriesGrid}>
      {series.map((collection, index) => <SeriesCard key={collection.id} id={collection.id}
        title={collection.title}
        cover={collection.cover}
        href={`/photo/archive/${collection.slug}`} eager={index < 2} />)}
    </div> : <div className={styles.emptyState}>
      <p>No series have been archived yet.</p>
      <Link href="/photo/series">Explore Series</Link>
    </div>}
  </section>;
}
