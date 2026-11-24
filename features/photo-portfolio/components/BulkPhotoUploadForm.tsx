"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ImagePlus } from "lucide-react";
import { adminPhotosPath, normalizePhotoDetails, photoDetailsLimits as limits } from "../lib/admin-photos";
import { usePhotoDrop } from "../lib/use-photo-drop";
import { useUnsavedChanges } from "../lib/use-unsaved-changes";
import { useUploadReview } from "../lib/use-upload-review";
import type { PhotoDetails } from "../types";
import PhotoLocationField from "./PhotoLocationField";
import admin from "../admin.module.css";
import styles from "../bulk-upload.module.css";

export default function BulkPhotoUploadForm({ locations }: { locations: string[] }) {
  const { items, setItems, addFiles, remove, save, saving, progress, saveError, authenticationRequired } = useUploadReview();
  const section = useRef<HTMLElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const shared = useRef<HTMLFieldSetElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const publishDialog = useRef<HTMLDialogElement>(null);
  const [confirmation, setConfirmation] = useState<"publish" | "retry" | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [sharedDate, setSharedDate] = useState("");
  const [sharedLocation, setSharedLocation] = useState("");
  const [notice, setNotice] = useState("");
  const guardNavigation = useUnsavedChanges(items.some((item) => !item.stored || item.status === "failed"), saving);
  const dragging = usePhotoDrop(section, !saving && !confirmation, addFiles);
  const editable = items.filter((item) => !item.attempted);
  const selected = editable.filter((item) => item.selected).length;
  const saved = items.filter((item) => item.stored && !item.published).length;
  const published = items.filter((item) => item.published).length;
  const publishable = items.filter((item) => !item.published && ["ready", "saved", "failed"].includes(item.status));
  const confirmationCount = confirmation === "retry" ? items.filter((item) => item.status === "failed" && item.intent === "publish").length : publishable.length;
  const failed = items.filter((item) => item.status === "failed").length;
  const canSave = items.some((item) => item.status === "ready" || (item.status === "failed" && item.intent !== "publish"));
  const ready = items.filter((item) => item.status === "ready" && normalizePhotoDetails(item.details).ok).length;
  const preparing = items.filter((item) => item.status === "queued" || item.status === "preparing").length;
  const preview = items.find((item) => item.id === previewId);
  const allExpanded = items.length > 0 && items.every((item) => item.expanded);

  function confirmPublish(mode: "publish" | "retry") {
    setConfirmation(mode);
    publishDialog.current?.showModal();
  }

  function change(id: string, field: keyof PhotoDetails, value: string) {
    if (saving) return;
    setItems((current) => current.map((item) => item.id === id && !item.attempted ? { ...item, details: { ...item.details, [field]: value } } : item));
  }

  function apply(field: "date" | "location", value: string) {
    if (saving || !selected || !value.trim()) return;
    if (field === "date" && !shared.current?.querySelector<HTMLInputElement>('input[type="date"]')?.reportValidity()) return;
    setItems((current) => current.map((item) => item.selected && !item.attempted ? { ...item, details: { ...item.details, [field]: value } } : item));
    setNotice(`${field === "date" ? "Date" : "Location"} applied to ${selected} ${selected === 1 ? "photo" : "photos"}.`);
  }

  return <section ref={section} className={`${admin.editor} ${styles.editor}`} data-photo-upload>
    {dragging && <div className={admin.uploadDropOverlay} aria-hidden="true"><span>Drop to add photos to the queue</span></div>}
    <header className={admin.header}>
      <div><p className={admin.eyebrow}>Portfolio admin</p><h1>Upload photos</h1></div>
      <button type="button" disabled={saving} className={`${admin.actionButton} ${admin.primary}`} onClick={() => picker.current?.click()}>Add photos</button>
    </header>
    <div className={admin.draftBar}>
      <Link className={admin.textLink} href={adminPhotosPath} onNavigate={guardNavigation}>← Photos</Link>
      <Link className={admin.textLink} href={`${adminPhotosPath}/new`} onNavigate={guardNavigation}>Single-photo upload</Link>
    </div>
    <p className={styles.checkpoint}>Review your photos, then save private drafts or publish them to Archive. Submitted details stay locked; edit saved photos through their editor links. Leaving clears unsaved items from this page.</p>
    <input ref={picker} type="file" multiple accept="image/jpeg,image/png,image/webp" aria-label="Photo files" hidden disabled={saving}
      onChange={(event) => { if (event.currentTarget.files?.length) addFiles(event.currentTarget.files); event.currentTarget.value = ""; }} />
    {!items.length ? <div className={admin.uploadEmpty}>
      <ImagePlus size={28} strokeWidth={1.35} aria-hidden="true" />
      <h2>Drop your photos anywhere on this page</h2>
      <button type="button" className={admin.actionButton} onClick={() => picker.current?.click()}>Choose photos</button>
      <p>JPEG, PNG, or WebP · up to 30 MB per photo</p>
    </div> : <>
      <div className={styles.toolbar}>
        <label className={styles.selectAll}><input type="checkbox" disabled={saving || !editable.length} checked={editable.length > 0 && selected === editable.length}
          ref={(node) => { if (node) node.indeterminate = selected > 0 && selected < editable.length; }}
          onChange={(event) => { const checked = event.target.checked; setItems((current) => current.map((item) => item.attempted ? item : { ...item, selected: checked })); }} />
          Select all <span>({selected} selected)</span></label>
        <div className={admin.actions}>
          <button type="button" onClick={() => setItems((current) => current.map((item) => ({ ...item, expanded: !allExpanded })))}>
            {allExpanded ? "Collapse all details" : "Expand all details"}</button>
        </div>
      </div>
      <fieldset ref={shared} disabled={saving || !selected} className={`${styles.shared} ${admin.detailsFields}`} aria-label="Apply shared details">
        <p>Apply to selected photos <small>Replaces that field only when you choose Apply.</small></p>
        <div className={styles.sharedField}>
          <label>Date taken<input type="date" min="0001-01-01" max="9999-12-31" value={sharedDate} onChange={(event) => setSharedDate(event.target.value)} /></label>
          <button type="button" disabled={!selected || !sharedDate} onClick={() => apply("date", sharedDate)}>Apply date</button>
        </div>
        <div className={styles.sharedField}>
          <PhotoLocationField value={sharedLocation} locations={locations} disabled={saving || !selected} onChange={setSharedLocation} />
          <button type="button" disabled={!selected || !sharedLocation.trim()} onClick={() => apply("location", sharedLocation)}>Apply location</button>
        </div>
      </fieldset>
      <p role="status" className={styles.notice}>{notice}</p>
      {saveError && <p role="alert" className={styles.error}>{saveError}</p>}
      {authenticationRequired && <p role="alert" className={styles.error}>Processing paused. <a href="/photo/admin/login" target="_blank" rel="noopener noreferrer">Sign in in a new tab</a>, then return here to retry failed photos or resume the remaining batch.</p>}
      <ol className={styles.queue} aria-label="Photos to upload">
        {items.map((item) => {
          const validation = normalizePhotoDetails(item.details);
          const status = item.status === "error" ? "Couldn’t prepare" : item.status === "queued" ? "Waiting to prepare"
            : item.status === "preparing" ? "Preparing…" : item.status === "saving" ? item.intent === "publish" ? "Publishing…" : "Saving…"
              : item.status === "published" ? "Published" : item.status === "saved" ? "Saved"
                : item.status === "failed" ? item.intent === "publish" ? "Publish failed" : "Save failed" : validation.ok ? "Ready" : "Needs details";
          return <li key={item.id} className={styles.item}>
            <div className={styles.row}>
              <div className={styles.photo}>
                <input type="checkbox" aria-label={`Select ${item.filename}`} disabled={saving || item.attempted} checked={item.selected}
                  onChange={(event) => { const checked = event.target.checked; setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, selected: checked } : entry)); }} />
                <button type="button" className={styles.thumbnail} disabled={!item.url} title={item.filename} aria-label={`Preview ${item.filename}`}
                  onClick={() => { setPreviewId(item.id); dialog.current?.showModal(); }}>
                  {item.url ? <Image src={item.url} alt={item.details.altText || item.details.title} fill unoptimized sizes="72px" /> : <ImagePlus size={24} aria-hidden="true" />}
                </button>
              </div>
              <fieldset disabled={saving || item.attempted} aria-label={`Details for ${item.filename}`} className={`${admin.detailsFields} ${styles.fields}`}>
                <label>Title<input value={item.details.title} maxLength={limits.title} required
                  onChange={(event) => change(item.id, "title", event.target.value)} /></label>
                <label>Date taken<input type="date" value={item.details.date} min="0001-01-01" max="9999-12-31" required
                  onChange={(event) => change(item.id, "date", event.target.value)} /></label>
                <PhotoLocationField value={item.details.location} locations={locations} disabled={saving || item.attempted} onChange={(value) => change(item.id, "location", value)} />
              </fieldset>
              <div className={styles.rowActions}>
                <span className={styles.status} data-error={item.status === "error" || item.status === "failed"}>{status}
                  {item.stored && !item.published && <> · <Link href={`${adminPhotosPath}/${item.id}`} onNavigate={guardNavigation} aria-label={`Edit ${item.details.title}`}>Edit</Link></>}
                  {item.published && item.slug && <> · <Link href={`/photo/photos/${encodeURIComponent(item.slug)}`} target="_blank" rel="noopener noreferrer" aria-label={`View ${item.details.title}`}>View</Link></>}
                </span>
                <button type="button" disabled={saving} aria-label={`Remove ${item.filename} from queue`} title="Remove from this queue; saved photos are kept" onClick={() => remove(item.id)}>Remove</button>
              </div>
            </div>
            {item.error && <p role="alert" className={styles.error}>{item.error}</p>}
            <button type="button" className={styles.expand} aria-expanded={item.expanded} aria-controls={`${item.id}-details`}
              onClick={() => setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, expanded: !entry.expanded } : entry))}>
              {item.expanded ? "Hide caption & alt text" : "Caption & alt text"}</button>
            <div id={`${item.id}-details`} hidden={!item.expanded}>
              <fieldset disabled={saving || item.attempted} aria-label={`Caption and alt text for ${item.filename}`} className={`${admin.detailsFields} ${styles.extra}`}>
                <label>Caption <small>(optional)</small><textarea rows={3} value={item.details.caption} maxLength={limits.caption} onChange={(event) => change(item.id, "caption", event.target.value)} /></label>
                <label>Alt text <small>(defaults to title)</small><textarea rows={3} value={item.details.altText} maxLength={limits.altText} onChange={(event) => change(item.id, "altText", event.target.value)} /></label>
              </fieldset>
            </div>
          </li>;
        })}
      </ol>
      <footer className={styles.footer}>
        <span role="status">{saving ? `${progress.mode === "publish" ? "Publishing" : "Saving"} ${progress.position} of ${progress.total} · ` : ""}{published} published · {saved} drafts · {failed} failed · {ready} ready{preparing > 0 ? ` · ${preparing} preparing` : ""}</span>
        <div className={admin.actions}>
          {failed > 0 && <button type="button" disabled={saving} onClick={() => {
            if (items.some((item) => item.status === "failed" && item.intent === "publish")) confirmPublish("retry");
            else void save("retry");
          }}>Retry failed</button>}
          <button type="button" disabled={saving || preparing > 0 || !canSave} onClick={() => void save()}>Save drafts</button>
          <button type="button" className={admin.primary} disabled={saving || preparing > 0 || !publishable.length} onClick={() => confirmPublish("publish")}>Publish photos</button>
        </div>
      </footer>
    </>}
    <dialog ref={publishDialog} className={admin.publishDialog} aria-labelledby="batch-publish-title" onClose={() => setConfirmation(null)}>
      <h2 id="batch-publish-title">Publish {confirmationCount} {confirmationCount === 1 ? "photo" : "photos"}?</h2>
      <p>These photos will become public in Archive and can be included in published Series. Saved drafts will use their existing images.</p>
      {confirmation === "retry" && <p>This retries failed publications and any failed draft saves. Successful photos are skipped.</p>}
      <div className={admin.actions}>
        <button type="button" onClick={() => publishDialog.current?.close()}>Cancel</button>
        <button type="button" className={admin.primary} onClick={() => {
          const mode = confirmation ?? "publish";
          publishDialog.current?.close();
          void save(mode);
        }}>Publish {confirmationCount} {confirmationCount === 1 ? "photo" : "photos"}</button>
      </div>
    </dialog>
    <dialog ref={dialog} className={styles.preview} onClose={() => setPreviewId(null)}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) {
          event.currentTarget.close();
        }
      }} aria-label={preview ? `Preview ${preview.filename}` : "Photo preview"}>
      <div className={styles.previewHeader}><span>{preview?.filename}</span><button type="button" onClick={() => dialog.current?.close()}>Close preview</button></div>
      {preview?.url && <div className={styles.previewImage}><Image src={preview.url} alt={preview.details.altText || preview.details.title} fill unoptimized sizes="90vw" /></div>}
    </dialog>
  </section>;
}
