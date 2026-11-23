import type { Metadata } from "next";
import Sidebar from "@/features/photo-portfolio/components/Sidebar";
import styles from "@/features/photo-portfolio/portfolio.module.css";
import { portfolioTypography } from "@/features/photo-portfolio/typography";
import { portfolioDarkPalette } from "@/features/photo-portfolio/appearance";

export const metadata: Metadata = {
  title: { default: "IJ.PRIME — Photography", template: "%s — IJ.PRIME" },
  description: "Photography by Isaac Jiang.",
};
// Preview data should reflect independent v2 changes without changing the legacy
// admin invalidation list or exposing authenticated/draft data to public requests.
export const dynamic = "force-dynamic";

export default function PortfolioLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${styles.portfolio} ${portfolioTypography.className}`} data-dark-palette={portfolioDarkPalette}>
    <a className={styles.skipLink} href="#portfolio-content">Skip to photographs</a>
    <Sidebar wordmarkClassName={portfolioTypography.wordmarkClassName} />
    <main className={styles.main} id="portfolio-content">
      {children}
    </main>
  </div>;
}
