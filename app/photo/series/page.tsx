import Link from "next/link";
import SeriesCard from "@/features/photo-portfolio/components/SeriesCard";
import { getSeriesCards } from "@/features/photo-portfolio/data/series-cards";
import styles from "@/features/photo-portfolio/portfolio.module.css";
import { portfolioMetadata } from "@/features/photo-portfolio/lib/metadata";

export const metadata = portfolioMetadata("Series", "Photographic series and sequences by Isaac Jiang.", "/photo/series");

export default async function SeriesPage() {
  const cards = await getSeriesCards();
  const series = cards.filter((collection) => collection.publicView === "series");

  return <section aria-label="Series">
    {series.length ? <div className={styles.seriesGrid}>
      {series.map((collection, index) => <SeriesCard key={collection.id} id={collection.id}
        title={collection.title}
        cover={collection.cover}
        href={`/photo/series/${collection.slug}`} eager={index < 2} />)}
    </div> : <div className={styles.emptyState}>
      <p>The first sequences are still taking shape.</p>
      <Link href="/photo">Explore Selected Work</Link>
    </div>}
  </section>;
}
