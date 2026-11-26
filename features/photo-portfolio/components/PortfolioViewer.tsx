"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode, type TouchEvent } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Grid2X2, Maximize2, Minimize2, PanelBottom } from "lucide-react";
import type { PortfolioCollection } from "../types";
import PortfolioImage from "./PortfolioImage";
import PhotoShare from "./PhotoShare";
import styles from "../portfolio.module.css";
import { archiveHref, archivePageSize } from "../lib/archive";

type Props = Pick<PortfolioCollection, "title" | "description" | "photos" | "isDemo"> & {
  initialSlug?: string; backHref?: string; backLabel?: string; subtitle?: string | null;
  archiveContext?: { query: string; place: string; year: string };
  headerAction?: ReactNode;
  autoAdvance?: boolean;
  preloadNeighbors?: boolean;
};

export default function PortfolioViewer({ title, description, photos, isDemo, initialSlug, backHref, backLabel = "Back to archive", subtitle, archiveContext, headerAction, autoAdvance = false, preloadNeighbors = false }: Props) {
  const pathname = usePathname();
  const params = useSearchParams();
  const selectedSlug = params.get("photo") || initialSlug;
  const found = photos.findIndex((photo) => photo.slug === selectedSlug);
  const index = Math.max(0, found);
  const photo = photos[index];
  const returnHref = archiveContext && photo
    ? `${archiveHref(archiveContext.query, archiveContext.place, archiveContext.year, Math.floor(index / archivePageSize) + 1)}#photo-${photo.slug}`
    : backHref;
  const viewerSubtitle = subtitle === undefined ? (isDemo ? "Demo edit · sequence in progress" : "A photographic sequence") : subtitle;
  const [mode, setMode] = useState<"view" | "index">("view");
  const [captions, setCaptions] = useState(false);
  const [paused, setPaused] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [fullscreenError, setFullscreenError] = useState("");
  const stage = useRef<HTMLDivElement>(null);
  const swipe = useRef<{ x: number; y: number; slug: string } | null>(null);
  const bufferedImages = useRef(new Map<string, HTMLImageElement>());
  const readyImages = useRef(new WeakMap<HTMLImageElement, number>());
  const bufferEnabled = autoAdvance || preloadNeighbors;
  const bufferedIndexes = bufferEnabled && photos.length
    ? [...new Set([index, (index + 1) % photos.length, (index + 2) % photos.length, (index + photos.length - 1) % photos.length])].sort((a, b) => a - b)
    : [index];
  const markImageReady = useCallback((image: HTMLImageElement) => {
    readyImages.current.set(image, performance.now());
  }, []);

  const navigate = useCallback((target: number, replace = false) => {
    if (target < 0 || target >= photos.length) return;
    const query = new URLSearchParams(params.toString());
    query.set("photo", photos[target].slug);
    // Native history integrates with App Router search params, so browsing a
    // sequence does not refetch the whole catalog on every key press.
    if (replace) window.history.replaceState(null, "", `${pathname}?${query}`);
    else window.history.pushState(null, "", `${pathname}?${query}`);
  }, [params, pathname, photos]);

  useEffect(() => {
    if (!autoAdvance || paused || mode !== "view" || captions || photos.length < 2) return;
    const startedAt = performance.now();
    const timer = window.setInterval(() => {
      if (document.hidden || swipe.current
        || document.querySelector('[aria-controls="portfolio-navigation"][aria-expanded="true"], dialog[open], [role="dialog"]')) return;
      const nextIndex = (index + 1) % photos.length;
      const currentImage = bufferedImages.current.get(photos[index].id);
      const nextImage = bufferedImages.current.get(photos[nextIndex].id);
      const readyAt = currentImage && readyImages.current.get(currentImage);
      if (readyAt === undefined || !nextImage || !readyImages.current.has(nextImage)
        || performance.now() - Math.max(startedAt, readyAt) < 3000) return;
      navigate(nextIndex, true);
    }, 100);
    return () => window.clearInterval(timer);
  }, [autoAdvance, paused, mode, captions, index, navigate, photos]);

  function startSwipe(event: TouchEvent<HTMLDivElement>) {
    swipe.current = event.touches.length === 1
      ? { x: event.touches[0].clientX, y: event.touches[0].clientY, slug: photo.slug }
      : null;
  }

  function moveSwipe(event: TouchEvent<HTMLDivElement>) {
    const start = swipe.current;
    if (!start) return;
    if (event.touches.length !== 1) { swipe.current = null; return; }
    const dx = Math.abs(event.touches[0].clientX - start.x);
    const dy = Math.abs(event.touches[0].clientY - start.y);
    // Once a gesture becomes a vertical scroll, it must not change photos.
    if (dy > 10 && dy > dx) swipe.current = null;
  }

  function endSwipe(event: TouchEvent<HTMLDivElement>) {
    const start = swipe.current;
    swipe.current = null;
    if (!start || start.slug !== photo.slug || event.touches.length !== 0 || event.changedTouches.length !== 1) return;
    const dx = event.changedTouches[0].clientX - start.x;
    const dy = event.changedTouches[0].clientY - start.y;
    if (Math.abs(dx) >= 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      navigate(index + (dx < 0 ? 1 : -1));
    }
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (mode !== "view" || event.altKey || event.ctrlKey || event.metaKey
        || document.querySelector('[aria-controls="portfolio-navigation"][aria-expanded="true"], dialog[open]')
        || (event.target instanceof HTMLElement && event.target.closest("input,textarea,select,[contenteditable],nav,aside"))) return;
      if (event.key === "ArrowRight" && index < photos.length - 1) { event.preventDefault(); navigate(index + 1); }
      if (event.key === "ArrowLeft" && index > 0) { event.preventDefault(); navigate(index - 1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, mode, navigate, photos.length]);

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === stage.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  async function toggleFullscreen() {
    try {
      setFullscreenError("");
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (stage.current?.requestFullscreen) await stage.current.requestFullscreen();
      else setFullscreenError("Fullscreen isn’t available in this browser.");
    } catch { setFullscreenError("Fullscreen isn’t available in this browser."); }
  }

  if (!photo) return <div className={styles.emptyState}><h1>{title}</h1><p>This edit is waiting for its first photographs.</p><Link href="/photo/archive">Explore the archive</Link></div>;

  return (
    <section className={`${styles.viewer} ${mode === "view" ? styles.slideshow : ""}`} aria-label={title}>
      <header className={styles.viewerHeader}>
        <div><h1>{title}</h1>{viewerSubtitle && <span className={`${styles.smallLabel} ${styles.viewerSubtitle}`}>{viewerSubtitle}</span>}</div>
        <div className={styles.viewerActions}>
          {headerAction}
          <button type="button" className={styles.control} aria-pressed={mode === "index"}
            onClick={() => setMode(mode === "view" ? "index" : "view")}>
            <Grid2X2 size={15} strokeWidth={1.4} />{mode === "view" ? "Index" : "View photographs"}
          </button>
        </div>
      </header>

      {mode === "index" ? (
        <div className={styles.indexView}>
          {description && <p className={styles.indexIntroduction}>{description}</p>}
          <div className={styles.contactSheet}>
            {photos.map((item, position) => <button key={item.id} type="button" className={styles.indexItem}
              onClick={() => { navigate(position); setMode("view"); requestAnimationFrame(() => stage.current?.focus()); }}>
              <span className={styles.indexImage}><PortfolioImage photo={item} thumbnail showLoading /></span>
              <span className={styles.indexCaption}><span>{item.title}</span><span>{String(position + 1).padStart(2, "0")}</span></span>
            </button>)}
          </div>
        </div>
      ) : (
        <>
          <div className={styles.stage} ref={stage} tabIndex={-1}>
            <div className={styles.stageMain} key={bufferEnabled ? "buffer" : photo.id}
              onTouchStart={startSwipe} onTouchMove={moveSwipe} onTouchEnd={endSwipe}
              onTouchCancel={() => { swipe.current = null; }}>
              {bufferEnabled ? bufferedIndexes.map((position) => {
                const item = photos[position];
                const active = position === index;
                return <div key={item.id} className={`${styles.bufferedPhoto} ${active ? styles.bufferedPhotoActive : ""}`}
                  aria-hidden={!active} inert={!active}>
                  <PortfolioImage photo={item} eager showLoading={active} fadeIn fetchPriority={active ? "high" : "low"}
                    imageRef={(image) => {
                      if (image) bufferedImages.current.set(item.id, image);
                      else bufferedImages.current.delete(item.id);
                    }} onReady={markImageReady} />
                </div>;
              }) : <PortfolioImage photo={photo} eager showLoading fadeIn />}
            </div>
            {fullscreen && <button className={styles.fullscreenExit} onClick={toggleFullscreen} type="button" aria-label="Exit fullscreen"><Minimize2 size={20} /></button>}
          </div>

          <div className={styles.viewerFooter}>
            <div className={styles.currentCaption}><h2>{photo.title}</h2><p>{photo.location || "A photograph by Isaac Jiang"}</p></div>
            <div className={styles.sequenceControls}>
              <button type="button" className={styles.iconButton} aria-label="Previous photograph" disabled={index === 0} onClick={() => navigate(index - 1)}><ChevronLeft size={20} strokeWidth={1.3} /></button>
              <span className={styles.counter}>{String(index + 1).padStart(2, "0")} <span>/ {String(photos.length).padStart(2, "0")}</span></span>
              <button type="button" className={styles.iconButton} aria-label="Next photograph" disabled={index === photos.length - 1} onClick={() => navigate(index + 1)}><ChevronRight size={20} strokeWidth={1.3} /></button>
            </div>
            <div className={styles.viewerTools}>
              {autoAdvance && photos.length > 1 && <button type="button" className={styles.control} aria-label={paused ? "Resume slideshow" : "Pause slideshow"} onClick={() => setPaused(!paused)}>{paused ? "Play" : "Pause"}</button>}
              <PhotoShare key={photo.id} photo={photo} />
              <button type="button" className={styles.control} aria-expanded={captions} aria-controls="photo-details" onClick={() => setCaptions(!captions)}><PanelBottom size={15} strokeWidth={1.4} />Details</button>
              <button type="button" className={styles.control} aria-label="Fullscreen" onClick={toggleFullscreen}><Maximize2 size={15} strokeWidth={1.4} aria-hidden="true" /><span className={styles.fullscreenLabel}>Fullscreen</span></button>
            </div>
          </div>
          {captions && <div className={styles.details} id="photo-details">
            <p>{photo.description || description || "Part of an ongoing photographic archive."}</p>
            <dl><div><dt>Photographed</dt><dd>{new Date(photo.date + "T12:00:00Z").toLocaleDateString("en-CA", {year:"numeric",month:"long",day:"numeric",timeZone:"UTC"})}</dd></div>
              <div><dt>Location</dt><dd>{photo.location || "Not recorded"}</dd></div></dl>
            <Link href={`/photo/photos/${photo.slug}`}>Open individual photograph</Link>
          </div>}
          <p className={styles.srOnly} aria-live="polite">Photograph {index + 1} of {photos.length}: {photo.title}</p>
          {fullscreenError && <p role="status" className={styles.smallLabel}>{fullscreenError}</p>}
        </>
      )}
      {returnHref && <Link className={styles.backLink} href={returnHref}>{backLabel}</Link>}
    </section>
  );
}
