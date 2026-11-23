import Link from "next/link";
import type { PortfolioPhoto } from "../types";
import styles from "../portfolio.module.css";
import PortfolioImage from "./PortfolioImage";

export default function SeriesCard({ id, title, description, cover, count, href, label, eager }: {
  id: string; title: string; description: string; cover: PortfolioPhoto;
  count: number; href: string; label?: string; eager?: boolean;
}) {
  return <article className={styles.seriesCard}>
    <Link href={href} aria-labelledby={`series-${id}`}>
      <span className={styles.seriesImage}><PortfolioImage photo={cover} thumbnail eager={eager} /></span>
      <h2 id={`series-${id}`}>{title}</h2>
      {description && <p>{description}</p>}
      <span className={styles.seriesMeta}>
        {count} {count === 1 ? "photograph" : "photographs"}{label && ` · ${label}`}
      </span>
    </Link>
  </article>;
}
