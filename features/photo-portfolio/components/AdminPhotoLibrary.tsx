"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Pencil, Plus } from "lucide-react";
import type { AdminPortfolioPhoto } from "../types";
import { adminPhotoHref, type PhotoLibrarySearch, type PhotoLibraryView } from "../lib/admin-photos";
import AdminPagination from "./AdminPagination";
import PortfolioImage from "./PortfolioImage";
import styles from "../admin.module.css";

const pageSize = 24;

type Selection = {
  ids: ReadonlySet<string>;
  selectedFirst: boolean;
  pending: boolean;
  toggle: (id: string) => void;
};

export default function AdminPhotoLibrary({ photos, selection, initialSearch }: {
  photos: AdminPortfolioPhoto[];
  selection?: Selection;
  initialSearch?: PhotoLibrarySearch;
}) {
  const [query, setQuery] = useState(initialSearch?.query ?? "");
  const [requestedPage, setPage] = useState(initialSearch?.page ?? 1);
  const [view, setView] = useState<PhotoLibraryView>(initialSearch?.view ?? "grid");
  const term = query.trim().toLocaleLowerCase();
  const matches = photos.filter((photo) => `${photo.title} ${photo.location ?? ""}`.toLocaleLowerCase().includes(term));
  if (selection?.selectedFirst) {
    const { ids } = selection;
    matches.sort((a, b) => Number(ids.has(b.id)) - Number(ids.has(a.id)));
  }
  const pages = Math.max(1, Math.ceil(matches.length / pageSize));
  const page = Math.min(requestedPage, pages);
  const start = (page - 1) * pageSize;

  return <section className={!selection ? styles.photoManager : undefined} aria-label="Photo library">
    {selection && <div className={styles.sectionHeading}><h2>Photo library</h2><span>{photos.length} photographs</span></div>}
    <label className={styles.search}>Search the library<input type="search" placeholder="Title or location" value={query}
      onChange={(event) => { setQuery(event.target.value); setPage(1); }} /></label>
    {!selection && <div className={styles.libraryToolbar}>
      <p className={styles.libraryCount} role="status">
        {matches.length ? `${start + 1}–${Math.min(start + pageSize, matches.length)} of ${matches.length} photos` : "0 photos"}
      </p>
      <div className={styles.libraryView} role="group" aria-label="Thumbnail size">
        <button type="button" aria-pressed={view === "grid"} onClick={() => setView("grid")}>Grid</button>
        <button type="button" aria-pressed={view === "compact"} onClick={() => setView("compact")}>Compact</button>
      </div>
    </div>}
    <div className={`${styles.photoGrid}${!selection && view === "compact" ? ` ${styles.compactGrid}` : ""}`}>
      {matches.slice(start, start + pageSize).map((photo) => {
        const selected = selection?.ids.has(photo.id) ?? false;
        const content = <>
          <span className={styles.thumbnail}>
            <PortfolioImage photo={photo} thumbnail />
            <span className={styles.marker} aria-hidden="true">
              {selection ? selected ? <Check size={15} /> : <Plus size={15} /> : <Pencil size={13} />}
            </span>
          </span>
          <span className={styles.photoTitle}>{photo.title}</span>
          <span className={styles.meta}>{photo.location || "Location not set"}{!photo.published && " · Unpublished"}</span>
        </>;
        if (selection) return <button type="button" key={photo.id}
          className={`${styles.photoCard} ${selected ? styles.chosen : ""}`}
          aria-pressed={selected} disabled={selection.pending} onClick={() => selection.toggle(photo.id)}>{content}</button>;
        return <Link key={photo.id} className={`${styles.photoCard} ${styles.editablePhoto}`} prefetch={false}
          aria-label={`Edit ${photo.title}`} href={adminPhotoHref({ query, page, view }, photo.id)}>{content}</Link>;
      })}
    </div>
    {!matches.length && <p>No photographs match your search.</p>}
    <AdminPagination page={page} pages={pages} label="Photo library pages" onPageChange={setPage} />
  </section>;
}
