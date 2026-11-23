import styles from "../portfolio.module.css";

export default function PortfolioPageHeader({ id, title }: { id: string; title: string }) {
  return <header className={styles.pageHeader}><h1 id={id}>{title}</h1></header>;
}
