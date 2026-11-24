"use client";

import { useEffect, useRef, useState } from "react";
import { Share2, X } from "lucide-react";
import type { PortfolioPhoto } from "../types";
import styles from "../photo-sharing.module.css";
import portfolio from "../portfolio.module.css";

async function imageResponse(url: string, signal: AbortSignal) {
  const response = await fetch(url, { signal, cache: "no-store" });
  if (!response.ok) {
    const result = await response.json().catch(() => null);
    throw new Error(result?.error || "Couldn’t prepare this image. Please try again.");
  }
  return response;
}

function ShareDialog({ photo, dismiss }: { photo: PortfolioPhoto; dismiss: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const requests = useRef<AbortController | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [preview, setPreview] = useState("");
  const [dimensions, setDimensions] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const endpoint = `/api/photo-sharing/${encodeURIComponent(photo.id)}`;

  useEffect(() => {
    const element = dialog.current!;
    element.showModal();
    return () => element.close();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    requests.current = controller;
    let objectUrl = "";
    imageResponse(`${endpoint}?format=preview`, controller.signal).then(async response => {
      const blob = await response.blob();
      if (controller.signal.aborted) return;
      objectUrl = URL.createObjectURL(blob);
      setDimensions(`${response.headers.get("X-Photo-Width")} × ${response.headers.get("X-Photo-Height")} photo pixels · framed export ${response.headers.get("X-Export-Width")} × ${response.headers.get("X-Export-Height")}`);
      setPreview(objectUrl);
    }).catch(reason => {
      if (!controller.signal.aborted) setError(reason.message);
    });
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [attempt, endpoint]);

  async function download() {
    setBusy(true); setStatus("Preparing full-resolution download…");
    try {
      const response = await imageResponse(`${endpoint}?format=jpeg`, requests.current!.signal);
      const blob = await response.blob();
      if (requests.current!.signal.aborted) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${photo.slug}-ij-prime.jpg`;
      document.body.append(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
      setStatus("Your download is ready.");
    } catch (reason) {
      if (!requests.current?.signal.aborted) setStatus(reason instanceof Error ? reason.message : "Download failed. Please try again.");
    } finally { if (!requests.current?.signal.aborted) setBusy(false); }
  }

  async function copy(size: "hd" | "full") {
    if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
      setStatus("Image copying isn’t available in this browser. Download the image instead."); return;
    }
    setBusy(true); setStatus(size === "hd" ? "Preparing HD copy…" : "Preparing full-resolution copy…");
    try {
      // Pass a promise immediately to preserve the click's clipboard activation,
      // including browsers that reject writes after an awaited network request.
      const blob = imageResponse(`${endpoint}?format=${size === "hd" ? "png-hd" : "png"}`, requests.current!.signal).then(response => response.blob());
      // A denied clipboard permission must not leave a rejected fetch unhandled.
      void blob.catch(() => {});
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      if (!requests.current?.signal.aborted) setStatus(`${size === "hd" ? "HD image" : "Full-size image"} copied. Paste it into another app.`);
    } catch {
      if (!requests.current?.signal.aborted) setStatus("Couldn’t copy the image. Try again or download it instead.");
    } finally { if (!requests.current?.signal.aborted) setBusy(false); }
  }

  return <dialog ref={dialog} className={styles.dialog} aria-labelledby="photo-share-title"
    onCancel={event => { event.preventDefault(); dismiss(); }}
    onClick={event => { if (event.target === event.currentTarget) {
      const box = event.currentTarget.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dismiss();
    } }}>
    <div className={styles.header}><h2 id="photo-share-title">Share photograph</h2>
      <button type="button" className={styles.close} aria-label="Close sharing" onClick={dismiss}><X size={20} /></button></div>
    <p className={styles.title}>{photo.title}</p>
    <div className={styles.preview} aria-busy={!preview && !error}>
      {/* This is a generated blob preview, outside Next image optimization. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {preview ? <img src={preview} alt={`Framed sharing preview of ${photo.title}`} onError={() => { setPreview(""); setError("Couldn’t display the preview. Please try again."); }} />
        : error ? <div role="alert"><p>{error}</p><button type="button" onClick={() => { setError(""); setAttempt(value => value + 1); }}>Try again</button></div>
          : <p role="status">Preparing your framed image…</p>}
    </div>
    {preview && <p className={styles.dimensions}>{dimensions}</p>}
    <p className={styles.note}>Frame and IJ.PRIME watermark included. HD copies are up to 1920 pixels on the longest edge; full-size copies and downloads keep the original resolution.</p>
    <div className={styles.actions}>
      <button type="button" disabled={!preview || busy} onClick={download}>Download image</button>
      <button type="button" disabled={!preview || busy} onClick={() => copy("hd")}>Copy HD image</button>
      <button type="button" disabled={!preview || busy} onClick={() => copy("full")}>Copy full-size image</button>
    </div>
    <p className={styles.status} role="status">{status}</p>
  </dialog>;
}

export default function PhotoShare({ photo }: { photo: PortfolioPhoto }) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  function dismiss() {
    const trigger = button.current;
    setOpen(false);
    // Wait until the modal is removed: the opener is inert while it is open.
    requestAnimationFrame(() => trigger?.focus());
  }
  return <>
    <button ref={button} type="button" className={portfolio.control} aria-haspopup="dialog" onClick={() => setOpen(true)}>
      <Share2 size={15} strokeWidth={1.4} aria-hidden="true" />Share
    </button>
    {open && <ShareDialog photo={photo} dismiss={dismiss} />}
  </>;
}
