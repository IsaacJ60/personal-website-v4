"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { deletePhoto, savePhotoDetails } from "@/app/photo/admin/photo-actions";
import { useUnsavedChanges } from "../lib/use-unsaved-changes";
import type { AdminPortfolioPhoto, PhotoDetails } from "../types";
import PortfolioImage from "./PortfolioImage";
import PhotoDetailsFields from "./PhotoDetailsFields";
import PhotoPublishDialog from "./PhotoPublishDialog";
import styles from "../admin.module.css";

export default function PhotoDetailsEditor({ photo, initialDetails, initialRevision, backHref, locations }: {
  photo: AdminPortfolioPhoto;
  initialDetails: PhotoDetails;
  initialRevision: string;
  backHref: string;
  locations: string[];
}) {
  const router = useRouter();
  const [details, setDetails] = useState(initialDetails);
  const [saved, setSaved] = useState(initialDetails);
  const [revision, setRevision] = useState(initialRevision);
  const [published, setPublished] = useState(photo.published);
  const publishDialog = useRef<HTMLDialogElement>(null);
  const deleteDialog = useRef<HTMLDialogElement>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null);
  const [pending, startTransition] = useTransition();
  const dirty = JSON.stringify(details) !== JSON.stringify(saved);
  const guardNavigation = useUnsavedChanges(dirty && !deleted, pending);
  const publicHref = `/photo/photos/${encodeURIComponent(photo.slug)}`;

  function change(field: keyof PhotoDetails, value: string) {
    setNotice(null);
    setDetails((current) => ({ ...current, [field]: value }));
  }

  function save(publish = false) {
    if ((!dirty && !publish) || pending) return;
    setNotice(null);
    startTransition(async () => {
      try {
        const result = await savePhotoDetails(photo.id, revision, details, publish);
        if (!result.ok) {
          setNotice({ text: result.message, error: true });
          return;
        }
        setSaved(result.details);
        setDetails(result.details);
        setRevision(result.revision);
        setPublished(result.published);
        if (publish) publishDialog.current?.close();
        setNotice({ text: publish ? "Photo published." : "Photo details saved." });
      } catch {
        setNotice({ text: "Couldn’t save the photo details. Your changes are still here.", error: true });
      }
    });
  }

  function remove() {
    if (pending) return;
    setNotice(null);
    setDeleting(true);
    startTransition(async () => {
      try {
        const result = await deletePhoto(photo.id, revision);
        if (!result.ok) {
          setNotice({ text: result.message, error: true });
          return;
        }
        setDeleted(true);
        deleteDialog.current?.close();
        router.replace(backHref);
      } catch {
        setNotice({ text: "Couldn’t confirm deletion. Reload to check whether the photo was removed before trying again.", error: true });
      } finally {
        setDeleting(false);
      }
    });
  }

  return <section className={`${styles.editor} ${styles.photoEditor}`} data-photo-editor>
    <form onSubmit={(event) => { event.preventDefault(); save(); }}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Portfolio admin</p>
          <div className={styles.photoEditorTitle}>
            <h1>Edit photo</h1>
            {published && <span className={styles.publicationBadge}>Published</span>}
          </div>
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.actionButton} disabled={pending || deleted}
            onClick={() => { setNotice(null); deleteDialog.current?.showModal(); }}>Delete photo</button>
          {published && <>
            <Link className={styles.actionButton} onNavigate={guardNavigation} href={publicHref}>View photo</Link>
            <Link className={`${styles.actionButton} ${styles.openPhotoTab}`} href={publicHref}
              target="_blank" rel="noopener" aria-label="View photo in new tab">
              New tab <ExternalLink size={13} aria-hidden="true" />
            </Link>
          </>}
          {photo.uploaded && !published && <button type="button" className={styles.actionButton} disabled={pending}
            onClick={(event) => {
              if (event.currentTarget.form?.reportValidity()) {
                setNotice(null);
                publishDialog.current?.showModal();
              }
            }}>{dirty ? "Save & publish" : "Publish photo"}</button>}
          <button className={`${styles.actionButton} ${styles.primary}`} disabled={!dirty || pending}>
            {pending && !deleting ? "Saving…" : "Save changes"}
          </button>
        </div>
      </header>
      <div className={styles.draftBar}>
        <Link className={styles.textLink} href={backHref} onNavigate={guardNavigation}>← Photos</Link>
        <span role={notice?.error ? "alert" : "status"}>{notice?.text || (dirty ? "Unsaved changes" : "")}</span>
      </div>
      <div className={styles.photoEditLayout}>
        <div className={styles.photoEditImage}>
          <PortfolioImage photo={{ ...photo, alt: saved.altText || saved.title }} eager />
        </div>
        <div className={styles.photoFormScroll} role="region" aria-labelledby="photo-details" tabIndex={0}>
          <PhotoDetailsFields details={details} locations={locations} disabled={pending} onChange={change}>
            {published && <p className={styles.photoEditHint}>Saved changes appear on the portfolio.</p>}
          </PhotoDetailsFields>
        </div>
      </div>
      {photo.uploaded && <PhotoPublishDialog dialog={publishDialog} title={details.title}
        label={dirty ? "Save & publish" : "Publish photo"} pending={pending}
        error={notice?.error ? notice.text : undefined} onPublish={() => save(true)} />}
      <dialog ref={deleteDialog} className={styles.publishDialog} aria-labelledby="delete-photo-title"
        onCancel={(event) => { if (pending) event.preventDefault(); }}>
        <h2 id="delete-photo-title">Delete {saved.title}?</h2>
        <p>This permanently removes the photo from the library, Archive, Selected Work, and every Series, including drafts. This cannot be undone.</p>
        <p>{photo.uploaded ? "The uploaded display and thumbnail files will also be deleted. Failed file cleanup can be retried from Photos." : "Shared legacy image files and the legacy gallery are retained."}{dirty ? " Unsaved edits will be discarded." : ""}</p>
        {notice?.error && <p role="alert">{notice.text}</p>}
        <div className={styles.actions}>
          <button type="button" className={styles.actionButton} disabled={pending} onClick={() => deleteDialog.current?.close()}>Cancel</button>
          <button type="button" className={`${styles.actionButton} ${styles.primary}`} disabled={pending || deleted} onClick={remove}>
            {deleting ? "Deleting…" : "Delete photo permanently"}
          </button>
        </div>
      </dialog>
    </form>
  </section>;
}
