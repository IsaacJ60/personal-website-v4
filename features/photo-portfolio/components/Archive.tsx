"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import type { PortfolioPhoto } from "../types";
import { archiveHref, archivePage, archivePageSize, filterArchive } from "../lib/archive";
import PortfolioImage from "./PortfolioImage";
import ArchiveFilter from "./ArchiveFilter";
import PortfolioPageHeader from "./PortfolioPageHeader";
import styles from "../portfolio.module.css";

export default function Archive({ photos }: { photos: PortfolioPhoto[] }) {
  const params = useSearchParams();
  const query = params.get("q") || "";
  const place = params.get("place") || "";
  const year = params.get("year") || "";
  const matches = filterArchive(photos, query, place, year);
  const pages = Math.max(1, Math.ceil(matches.length / archivePageSize));
  const page = archivePage(params.get("page"), pages);
  const locations = [...new Set(photos.map((p) => p.location).filter((p): p is string => Boolean(p)))].sort();
  const years = [...new Set(photos.map((p) => p.date.slice(0, 4)))].sort().reverse();
  const start = (page - 1) * archivePageSize;
  const returnUrl = archiveHref(query, place, year, page);

  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (!id.startsWith("photo-")) return;
    const card = document.getElementById(id);
    card?.scrollIntoView({ block: "start" });
    card?.focus({ preventScroll: true });
  }, [query, place, year, page]);

  function update(key: "q" | "place" | "year", value: string) {
    const filters = { q: query, place, year, [key]: value };
    window.history.replaceState(null, "", archiveHref(filters.q, filters.place, filters.year));
  }

  return <section aria-labelledby="archive-title">
    <PortfolioPageHeader id="archive-title" title="Archive" />
    <div className={styles.archiveFilters} role="search" aria-label="Find photographs">
      <label className={styles.searchField}>
        <Search size={16} strokeWidth={1.4} aria-hidden="true" />
        <span className={styles.srOnly}>Search photographs</span>
        <input type="search" placeholder="Search title or location…" value={query}
          onChange={(event) => update("q", event.target.value)} />
      </label>
      <ArchiveFilter label="year" allLabel="All years" options={years} value={year}
        onChange={(value) => update("year", value)} />
      <ArchiveFilter label="place" allLabel="All places" options={locations} value={place} searchable
        onChange={(value) => update("place", value)} />
      {(query || place || year) && <Link href="/photo/archive" className={styles.control}>
        <X size={14} aria-hidden="true" />Clear
      </Link>}
    </div>
    <div className={styles.archiveSummary}>
      <span role="status" aria-live="polite">{matches.length} photograph{matches.length === 1 ? "" : "s"}
        {matches.length > archivePageSize ? ` · ${start + 1}–${Math.min(start + archivePageSize, matches.length)} shown` : ""}
      </span>
      <span>Newest first</span>
    </div>
    <div className={styles.archiveGrid}>
      {matches.slice(start, start + archivePageSize).map((photo) => {
        const context = new URLSearchParams(returnUrl.split("?")[1]);
        context.set("from", "archive");
        return <Link className={styles.archiveItem} key={photo.id} prefetch={false}
          href={`/photo/photos/${photo.slug}?${context}`} id={`photo-${photo.slug}`}>
          <span className={styles.archiveImage}><PortfolioImage photo={photo} thumbnail /></span>
          <span className={styles.archiveTitle}>{photo.title}</span>
          <span className={styles.archivePlace}>{[photo.location, photo.date.slice(0, 4)].filter(Boolean).join(" · ")}</span>
        </Link>;
      })}
    </div>
    {matches.length === 0 && <div className={styles.emptyState}>
      <h2>No photographs found.</h2><p>Try another year, place, or search.</p>
      <Link href="/photo/archive">Clear filters</Link>
    </div>}
    {pages > 1 && <nav className={styles.pagination} aria-label="Archive pages">
      {page > 1 ? <Link href={archiveHref(query, place, year, page - 1)}>Previous</Link>
        : <span aria-disabled="true">Previous</span>}
      <span>Page {page} of {pages}</span>
      {page < pages ? <Link href={archiveHref(query, place, year, page + 1)}>Next</Link>
        : <span aria-disabled="true">Next</span>}
    </nav>}
  </section>;
}
