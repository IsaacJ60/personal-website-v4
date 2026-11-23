"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import PortfolioThemeSwitch from "./PortfolioThemeSwitch";
import { portfolioProfile } from "../data/profile";
import styles from "../portfolio.module.css";

const links = [
  { href: "/photo", label: "Selected Work" },
  { href: "/photo/series", label: "Series" },
  { href: "/photo/archive", label: "Archive" },
  { href: "/photo/about", label: "About / Contact" },
];

export default function Sidebar({ wordmarkClassName }: { wordmarkClassName: string }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const sidebar = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); menuButton.current?.focus(); }
    };
    const onPointer = (event: PointerEvent) => {
      if (event.target instanceof Node && !sidebar.current?.contains(event.target)) setOpen(false);
    };
    const onHistory = () => setOpen(false);
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    window.addEventListener("popstate", onHistory);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("popstate", onHistory);
    };
  }, [open]);
  return (
    <aside className={styles.sidebar} ref={sidebar} onBlurCapture={(event) => {
      if (event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }}>
      <Link href="/photo" className={styles.identity} onClick={() => setOpen(false)}>
        <span className={`${styles.wordmark} ${wordmarkClassName}`}>IJ.PRIME</span>
        <span className={styles.byline}>Photographs by Isaac Jiang</span>
      </Link>
      <div className={styles.mobileActions}>
        <PortfolioThemeSwitch />
        <button ref={menuButton} className={styles.menuButton} aria-label={open ? "Close navigation" : "Open navigation"}
          aria-expanded={open} aria-controls="portfolio-navigation" onClick={() => setOpen(!open)}>
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      <div id="portfolio-navigation" className={`${styles.navigation} ${open ? styles.navigationOpen : ""}`}>
        <nav aria-label="Photography">
          {links.map(({ href, label }) => {
            const active = href === "/photo" ? pathname === href : pathname.startsWith(href)
              || (href === "/photo/archive" && pathname.startsWith("/photo/photos/") && params.get("from") === "archive");
            return <Link key={href} href={href} aria-current={active ? "page" : undefined}
              className={active ? styles.activeLink : undefined} onClick={() => setOpen(false)}>{label}</Link>;
          })}
        </nav>
        <div className={styles.sidebarFooter}>
          <div className={styles.footerLinks}>
            <a href={portfolioProfile.instagram.href} target="_blank" rel="noreferrer">Instagram</a>
            <Link href={portfolioProfile.website.href}>Personal website</Link>
          </div>
          <div className={styles.footerMeta}>
            <span className={styles.copyright}>© {new Date().getFullYear()} Isaac Jiang</span>
            <div className={styles.desktopThemeSwitch}><PortfolioThemeSwitch /></div>
          </div>
        </div>
      </div>
    </aside>
  );
}
