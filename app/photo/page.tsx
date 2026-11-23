import { getPortfolio } from "@/features/photo-portfolio/data/catalog";
import PortfolioViewer from "@/features/photo-portfolio/components/PortfolioViewer";
import styles from "@/features/photo-portfolio/portfolio.module.css";

export default async function PortfolioPreview() {
  const { selected } = await getPortfolio();
  if (!selected) return <div className={styles.emptyState}><h1>Selected Work</h1><p>This selection is waiting for its first photographs.</p></div>;
  return <PortfolioViewer {...selected} subtitle={null} />;
}
