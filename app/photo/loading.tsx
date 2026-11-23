import styles from "@/features/photo-portfolio/portfolio.module.css";

export default function LoadingPortfolio() {
  return <div className={styles.loadingState} role="status" aria-live="polite">
    <span className={styles.loadingIndicator} aria-hidden="true" />
    <span>Bringing the photographs into view…</span>
  </div>;
}
