"use client";

import styles from "@/features/photo-portfolio/portfolio.module.css";

export default function PreviewError({ reset }: {reset:()=>void}) {
  return <section className={styles.emptyState}><h1>The photographs couldn’t load.</h1><p>Please try again in a moment.</p><button className={styles.textButton} type="button" onClick={reset}>Try again</button></section>;
}
