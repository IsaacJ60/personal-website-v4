"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ImagePlus } from "lucide-react";
import { adminPhotosPath, photoDetailsLimits } from "../lib/admin-photos";
import { prepareLocalPhoto } from "../lib/prepare-upload.client";
import { uploadPhotoOriginal } from "../lib/upload-original.client";
import { usePhotoDrop } from "../lib/use-photo-drop";
import { useUnsavedChanges } from "../lib/use-unsaved-changes";
import type { PhotoDetails } from "../types";
import PhotoDetailsFields from "./PhotoDetailsFields";
import PhotoPublishDialog from "./PhotoPublishDialog";
import styles from "../admin.module.css";

const emptyDetails: PhotoDetails = { title: "", date: "", location: "", caption: "", altText: "" };

export default function UploadPhotoForm({ locations }: { locations: string[] }) {
  const router = useRouter();
  const request = useRef(0);
  const section = useRef<HTMLElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const publishDialog = useRef<HTMLDialogElement>(null);
  const [preview, setPreview] = useState<{ id: string; image: Blob; original: File; url: string; filename: string } | null>(null);
  const [details, setDetails] = useState(emptyDetails);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState("");
  const [existingDraft, setExistingDraft] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const guardNavigation = useUnsavedChanges(Boolean(preview), pending);

  useEffect(() => () => { request.current += 1; }, []);

  useEffect(() => {
    return () => { if (preview) URL.revokeObjectURL(preview.url); };
  }, [preview]);

  const selectPhoto = useCallback(async (file: File) => {
    const version = ++request.current;
    setError("");
    setExistingDraft(null);
    setPreparing(true);
    try {
      const { image, date } = await prepareLocalPhoto(file);
      if (version !== request.current) return;
      const title = file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim().slice(0, photoDetailsLimits.title);
      const id = crypto.randomUUID();
      setDetails({ ...emptyDetails, title, date });
      setPreview({ id, image, original: file, url: URL.createObjectURL(image), filename: file.name });
    } catch (cause) {
      if (version === request.current) setError(cause instanceof Error ? cause.message : "Couldn’t prepare this photo.");
    } finally {
      if (version === request.current) setPreparing(false);
    }
  }, []);

  const acceptDrop = useCallback((files: FileList) => {
    if (files.length !== 1) {
      setError("Drop one photo at a time.");
      return;
    }
    void selectPhoto(files[0]);
  }, [selectPhoto]);

  const dragging = usePhotoDrop(section, !pending && !confirming, acceptDrop);
  const canSave = Boolean(preview && details.title.trim() && details.date) && !pending && !preparing;

  function save(mode: "draft" | "publish" = "draft") {
    if (!preview || !canSave) return;
    setError("");
    setExistingDraft(null);
    startTransition(async () => {
      try {
        const originalSha256 = await uploadPhotoOriginal(preview.id, preview.original);
        const form = new FormData();
        form.set("id", preview.id);
        form.set("mode", mode);
        form.set("image", preview.image, "display.webp");
        form.set("originalSha256", originalSha256);
        for (const [key, value] of Object.entries(details)) form.set(key, value);
        const response = await fetch("/api/photo-preview/upload", { method: "POST", body: form });
        const result = await response.json();
        if (!response.ok || result.id !== preview.id) {
          if (result.existingDraftId === preview.id) {
            setExistingDraft(preview.id);
            publishDialog.current?.close();
          }
          setError(result.error || "Couldn’t save this photo. Try again.");
          return;
        }
        if (result.published === true && typeof result.slug === "string") {
          publishDialog.current?.close();
          router.replace(`/photo/photos/${encodeURIComponent(result.slug)}`);
        } else {
          router.replace(`${adminPhotosPath}/${preview.id}`);
        }
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Couldn’t save this photo. Your selected photo and details are still here.");
      }
    });
  }

  return <section ref={section} className={`${styles.editor} ${styles.photoEditor}`} data-photo-editor data-photo-upload>
    {dragging && <div className={styles.uploadDropOverlay} aria-hidden="true">
      <span>{preview ? "Drop to replace the photo" : "Drop photo to preview"}</span>
    </div>}
    <form onSubmit={(event) => { event.preventDefault(); save(); }}>
      <header className={styles.header}>
        <div><p className={styles.eyebrow}>Portfolio admin</p><h1>Upload photo</h1></div>
        {preview && <div className={styles.actions}>
          <button type="submit" className={styles.actionButton} disabled={!canSave}>
            {pending && !confirming ? "Saving…" : "Save as draft"}
          </button>
          <button type="button" className={`${styles.actionButton} ${styles.primary}`} disabled={!canSave}
            onClick={(event) => {
              if (event.currentTarget.form?.reportValidity()) {
                setError("");
                setConfirming(true);
                publishDialog.current?.showModal();
              }
            }}>Publish photo</button>
        </div>}
      </header>
      <div className={styles.draftBar}>
        <Link className={styles.textLink} href={adminPhotosPath} onNavigate={guardNavigation}>← Photos</Link>
        <Link className={styles.textLink} href={`${adminPhotosPath}/bulk`} onNavigate={guardNavigation}>Upload multiple photos</Link>
        <span role={error ? "alert" : "status"}>{error || (preparing ? "Preparing photo…" : "")}</span>
        {existingDraft && <Link className={styles.textLink} href={`${adminPhotosPath}/${existingDraft}`}>Open saved draft</Link>}
      </div>
      <input ref={picker} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Photo file" hidden
        disabled={pending} onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (file) void selectPhoto(file);
        }} />
      {preview ? <div className={styles.photoEditLayout}>
        <figure className={styles.uploadPreview}>
          <div className={styles.photoEditImage}>
            <Image fill unoptimized src={preview.url} className={styles.uploadImage}
              alt={details.altText || details.title || "Selected photo"} />
          </div>
          <figcaption className={styles.uploadFileBar}>
            <span className={styles.uploadFilename} title={preview.filename}>{preview.filename}</span>
            <div className={styles.actions}>
              <button type="button" className={styles.actionButton} disabled={pending}
                onClick={() => picker.current?.click()}>Replace photo</button>
            </div>
          </figcaption>
        </figure>
        <div className={styles.photoFormScroll} role="region" aria-labelledby="photo-details" tabIndex={0}>
          <PhotoDetailsFields details={details} locations={locations} disabled={pending || preparing}
            onChange={(field, value) => setDetails((current) => ({ ...current, [field]: value }))} />
        </div>
      </div> : <div className={styles.uploadEmpty}>
        <ImagePlus size={28} strokeWidth={1.35} aria-hidden="true" />
        <h2>Drop a photo anywhere on this page</h2>
        <div className={styles.actions}>
          <button type="button" className={`${styles.actionButton} ${styles.primary}`}
            aria-describedby="upload-formats" onClick={() => picker.current?.click()}>Choose photo</button>
        </div>
        <p id="upload-formats">JPEG, PNG, or WebP · up to 30 MB</p>
      </div>}
      {preview && <PhotoPublishDialog dialog={publishDialog} title={details.title} label="Publish photo"
        pending={pending} error={error} onPublish={() => save("publish")} onClose={() => setConfirming(false)} />}
    </form>
  </section>;
}
