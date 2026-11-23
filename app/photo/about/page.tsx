import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import PortfolioPageHeader from "@/features/photo-portfolio/components/PortfolioPageHeader";
import { portfolioProfile } from "@/features/photo-portfolio/data/profile";
import styles from "@/features/photo-portfolio/portfolio.module.css";

export const metadata: Metadata = {
  title: "About / Contact",
  description: "About Isaac Jiang and how to get in touch.",
};

export default function AboutPage() {
  return <section aria-labelledby="about-title">
    <PortfolioPageHeader id="about-title" title="About / Contact" />
    <div className={styles.aboutLayout}>
      <div className={styles.aboutIntroduction}>
        <p>CS student @ University of Waterloo who enjoys taking photos :)</p>
      </div>
      <dl className={styles.contactList} aria-label="Contact details">
        {portfolioProfile.email && <div>
          <dt>Email</dt>
          <dd><a className={styles.contactLink} href={`mailto:${portfolioProfile.email}`}>
            <span>{portfolioProfile.email}</span><ArrowUpRight size={14} strokeWidth={1.4} aria-hidden="true" />
          </a></dd>
        </div>}
        <div>
          <dt>Instagram</dt>
          <dd><a className={styles.contactLink} href={portfolioProfile.instagram.href} target="_blank" rel="noreferrer">
            <span>{portfolioProfile.instagram.handle}</span><ArrowUpRight size={14} strokeWidth={1.4} aria-hidden="true" />
          </a></dd>
        </div>
        <div>
          <dt>Personal website</dt>
          <dd><Link className={styles.contactLink} href={portfolioProfile.website.href}>
            <span>{portfolioProfile.website.label}</span><ArrowUpRight size={14} strokeWidth={1.4} aria-hidden="true" />
          </Link></dd>
        </div>
      </dl>
    </div>
  </section>;
}
