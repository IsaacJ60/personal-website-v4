"use client";

import { usePathname } from "next/navigation";
import styles from "@/features/photo-portfolio/portfolio.module.css";

export default function LoadingPortfolio() {
  const pathname = usePathname();
  if (pathname === "/photo/series" || pathname === "/photo/archive") {
    return <div className={styles.seriesGrid} role="status" aria-label="Loading series">
      {Array.from({ length: 6 }, (_, index) => <div key={index} aria-hidden="true">
        <span className={`${styles.seriesImage} ${styles.seriesPlaceholder}`}>
          <span className={styles.imageLoading}><span className={styles.loadingIndicator} /></span>
        </span>
        <span className={styles.seriesPlaceholderTitle} />
      </div>)}
    </div>;
  }

  return <div className={styles.loadingState} role="status" aria-live="polite">
    <span className={styles.loadingDots} aria-hidden="true"><span /><span /><span /></span>
    <span>Loading photographs…</span>
  </div>;
}
