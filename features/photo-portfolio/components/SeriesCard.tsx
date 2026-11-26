import Link from "next/link";
import type { PortfolioPhoto } from "../types";
import styles from "../portfolio.module.css";
import PortfolioImage from "./PortfolioImage";

export default function SeriesCard({ id, title, cover, href, eager }: {
  id: string; title: string; cover: PortfolioPhoto;
  href: string; eager?: boolean;
}) {
  return <article className={styles.seriesCard}>
    <Link href={href} aria-labelledby={`series-${id}`}>
      <span className={styles.seriesImage}><PortfolioImage photo={cover} thumbnail eager={eager} showLoading fadeIn /></span>
      <h2 id={`series-${id}`}>{title}</h2>
    </Link>
  </article>;
}
