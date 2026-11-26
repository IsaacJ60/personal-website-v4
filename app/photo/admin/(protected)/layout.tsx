import { isSeriesPublishingReady, requirePortfolioAdmin } from "@/features/photo-portfolio/data/admin";
import styles from "@/features/photo-portfolio/admin.module.css";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requirePortfolioAdmin();
  if (!await isSeriesPublishingReady()) return <section className={styles.editor}>
    <header className={styles.header}><h1>Series publishing setup is pending</h1></header>
    <p>This version needs its database update before photos and series can be edited. Existing public pages remain available.</p>
  </section>;
  return children;
}
