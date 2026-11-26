"use client";

import Image from "next/image";
import { useState, type Ref } from "react";
import { ImageOff } from "lucide-react";
import type { PortfolioPhoto } from "../types";
import styles from "../portfolio.module.css";

export default function PortfolioImage({ photo, thumbnail = false, eager = false, imageRef, onReady, fetchPriority, showLoading = false }: {
  photo: PortfolioPhoto; thumbnail?: boolean; eager?: boolean;
  imageRef?: Ref<HTMLImageElement>; onReady?: (image: HTMLImageElement) => void;
  fetchPriority?: "high" | "low" | "auto";
  showLoading?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const [sourceRequested, setSourceRequested] = useState(false);
  const [loadedSource, setLoadedSource] = useState<string | null>(null);
  const fullSize = !thumbnail && photo.uploaded && !photo.src.includes("/draft-media/");
  const source = fullSize ? `/api/photo-sharing/${encodeURIComponent(photo.id)}?format=${sourceRequested ? "full-size" : "display"}`
    : thumbnail && photo.thumbnail ? photo.thumbnail : photo.src;
  if (failed && !sourceRequested) return (
    <span className={styles.imageFailure}>
      <ImageOff size={22} strokeWidth={1} aria-hidden="true" />
      <span>{thumbnail ? "Open photograph" : "This preview couldn’t load."}</span>
      {!thumbnail && <button type="button" className={styles.textButton}
        onClick={() => { setSourceRequested(true); setFailed(false); }}>Load source image</button>}
    </span>
  );
  return <><Image src={source} alt={photo.alt} fill ref={imageRef} fetchPriority={fetchPriority}
    unoptimized={fullSize || photo.prepared || sourceRequested}
    loading={eager ? "eager" : "lazy"}
    sizes={thumbnail ? "(min-width: 1200px) 320px, (min-width: 760px) 40vw, 90vw" : "(min-width: 1200px) 1100px, (min-width: 760px) 75vw, 100vw"}
    className={styles.photoImage}
    draggable={false}
    onContextMenu={(event) => event.preventDefault()}
    onDragStart={(event) => event.preventDefault()}
    onLoad={async (event) => {
      const image = event.currentTarget;
      if (showLoading) setLoadedSource(source);
      if (!onReady) return;
      try { await image.decode(); onReady(image); } catch { /* Leave autoplay waiting if decoding fails. */ }
    }}
    onError={() => { setFailed(true); setSourceRequested(false); }} />
    {showLoading && loadedSource !== source && <span className={styles.imageLoading} role="status">
      <span className={styles.loadingIndicator} aria-hidden="true" />
      <span className={styles.srOnly}>Loading preview image…</span>
    </span>}
  </>;
}
