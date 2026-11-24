import Link from "next/link";
import SeriesCard from "@/features/photo-portfolio/components/SeriesCard";
import PortfolioPageHeader from "@/features/photo-portfolio/components/PortfolioPageHeader";
import { getPortfolio } from "@/features/photo-portfolio/data/catalog";
import styles from "@/features/photo-portfolio/portfolio.module.css";
import { portfolioMetadata } from "@/features/photo-portfolio/lib/metadata";

export const metadata = portfolioMetadata("Series", "Photographic series and sequences by Isaac Jiang.", "/photo/series");

export default async function SeriesPage() {
  const { collections } = await getPortfolio();
  const series = collections.filter((collection) => collection.kind === "series" && collection.photos.length > 0);

  return <section aria-labelledby="series-title">
    <PortfolioPageHeader id="series-title" title="Series" />
    {series.length ? <div className={styles.seriesGrid}>
      {series.map((collection, index) => <SeriesCard key={collection.id} id={collection.id}
        title={collection.title} description={collection.description}
        cover={collection.photos.find((photo) => photo.id === collection.coverPhotoId) ?? collection.photos[0]}
        count={collection.photos.length} href={`/photo/series/${collection.slug}`}
        label={collection.isDemo ? "Demo series" : undefined} eager={index < 2} />)}
    </div> : <div className={styles.emptyState}>
      <p>The first sequences are still taking shape.</p>
      <Link href="/photo">Explore Selected Work</Link>
    </div>}
  </section>;
}
