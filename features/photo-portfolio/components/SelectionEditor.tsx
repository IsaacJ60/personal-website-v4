"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Star, X } from "lucide-react";
import { logout, saveAndPublishPortfolioDraft, saveSelectionDraft, saveSeriesDraft } from "@/app/photo/admin/actions";
import type { AdminPortfolioPhoto, PortfolioPublication } from "../types";
import { demoEdits } from "../data/demo";
import { adminPhotosPath } from "../lib/admin-photos";
import { useUnsavedChanges } from "../lib/use-unsaved-changes";
import AdminPhotoLibrary from "./AdminPhotoLibrary";
import PortfolioImage from "./PortfolioImage";
import PublishDraft from "./PublishDraft";
import styles from "../admin.module.css";

type SeriesDetails = { title: string; description: string; coverId: string | null };
type EditorProps = {
  collectionId: string;
  photos: AdminPortfolioPhoto[];
  initialIds: string[];
  publication?: PortfolioPublication | null;
} & ({ revision: string; series?: undefined } | { revision: string | null; series: SeriesDetails });

export default function SelectionEditor({ collectionId, revision, photos, initialIds, series, publication = null }: EditorProps) {
  const router = useRouter();
  const [ids, setIds] = useState(initialIds);
  const [savedIds, setSavedIds] = useState(initialIds);
  const [version, setVersion] = useState(revision);
  const [details, setDetails] = useState(series);
  const [savedDetails, setSavedDetails] = useState(series);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const dirty = JSON.stringify(ids) !== JSON.stringify(savedIds)
    || details?.title !== savedDetails?.title
    || details?.description !== savedDetails?.description
    || details?.coverId !== savedDetails?.coverId;
  const canSave = dirty && (!details || Boolean(details.title.trim()));
  const seriesPath = `/photo/admin/series/${collectionId}`;
  const previewPath = details ? `${seriesPath}/preview` : "/photo/admin/preview";
  const selected = new Set(ids);
  const byId = new Map(photos.map((photo) => [photo.id, photo]));
  const guardNavigation = useUnsavedChanges(dirty, pending);

  function toggle(id: string) {
    setMessage("");
    setIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
    if (details?.coverId === id) setDetails({ ...details, coverId: null });
  }

  function move(index: number, direction: number) {
    setMessage("");
    setIds((current) => {
      const next = [...current];
      [next[index], next[index + direction]] = [next[index + direction], next[index]];
      return next;
    });
  }

  function save(preview = false) {
    startTransition(async () => {
      if (dirty) {
        try {
          const result = details
            ? await saveSeriesDraft(collectionId, version, details.title, details.description, ids, details.coverId)
            : await saveSelectionDraft(collectionId, version ?? "", ids);
          if (!result.ok) { setMessage(result.message); return; }
          setVersion(result.updatedAt);
          setSavedIds([...ids]);
          setSavedDetails(details);
          setMessage("Draft saved.");
          if (details && version === null) {
            router.replace(preview ? previewPath : seriesPath);
            return;
          }
        } catch { setMessage("Couldn’t save the draft. Your changes are still here; please try again."); return; }
      }
      if (preview) router.push(previewPath);
    });
  }

  async function saveAndPublish() {
    const result = await saveAndPublishPortfolioDraft(collectionId, version, ids, details ?? null);
    if (result.ok) {
      setVersion(result.revision);
      setSavedIds([...ids]);
      setSavedDetails(details);
      if (details && version === null) router.replace(seriesPath);
    }
    return result;
  }

  return <section className={styles.editor}>
    <header className={styles.header}>
      <div>
        <p className={styles.eyebrow}>Portfolio admin · private draft</p>
        <h1>{details ? (revision ? "Edit series" : "New series") : "Selected Work"}</h1>
      </div>
      <div className={styles.actions}>
        <button className={styles.actionButton} type="button" disabled={pending || !canSave} onClick={() => save()}>{pending ? "Saving…" : "Save draft"}</button>
        <button className={styles.actionButton} type="button" disabled={pending || !ids.length || (dirty && !canSave)} onClick={() => save(true)}>{dirty ? "Save & preview" : "Preview draft"}</button>
        <PublishDraft id={collectionId} revision={version} publication={publication}
          title={details ? details.title.trim() : "Selected Work"}
          hasPrivatePhotos={ids.some((id) => byId.get(id)?.published === false)}
          canPublish={ids.length > 0 && (!dirty || canSave)} busy={pending}
          onPublicationChange={(published) => setMessage(published ? "Published." : "Unpublished. Your draft is still available.")}
          onSaveAndPublish={dirty ? saveAndPublish : undefined} />
        <form action={logout}><button className={styles.actionButton} disabled={pending || dirty} title={dirty ? "Save your changes before signing out" : undefined}>Sign out</button></form>
      </div>
    </header>
    <div className={styles.draftBar}>
      <Link className={styles.textLink} href="/photo/admin/series" onNavigate={guardNavigation}>{details ? "← Series" : "Series"}</Link>
      <Link className={styles.textLink} href={adminPhotosPath} onNavigate={guardNavigation}>Manage photos</Link>
      <span role="status">{message || (dirty ? "Unsaved changes" : "")}</span>
    </div>
    {details && <div className={styles.detailsFields}>
      <label>Title<input value={details.title} maxLength={120} required disabled={pending}
        onChange={(event) => { setDetails({ ...details, title: event.target.value }); setMessage(""); }} /></label>
      <label><span>Description <small>(optional)</small></span><textarea rows={3} value={details.description} maxLength={2000} disabled={pending}
        onChange={(event) => { setDetails({ ...details, description: event.target.value }); setMessage(""); }} /></label>
    </div>}
    <div className={styles.workspace}>
      <AdminPhotoLibrary photos={photos} selection={{ ids: selected, selectedFirst: Boolean(details), pending, toggle }} />
      <section className={styles.sequence} aria-labelledby="sequence-heading">
        <div className={styles.sectionHeading}><h2 id="sequence-heading">Your sequence</h2><span>{ids.length} selected</span></div>
        <p className={styles.hint}>{details
          ? "Use the star to choose a cover. The arrows change the sequence."
          : "First photograph becomes the cover. Use the arrows to change the order."}</p>
        {!ids.length && <div className={styles.empty}><p>Choose photographs from the library to start your edit.</p>
          {!details && <button type="button" disabled={pending} onClick={() => {
            setIds(demoEdits[0].slugs.flatMap((slug) => photos.find((photo) => photo.slug === slug)?.id ?? [])); setMessage("");
          }}>Start with demo selection</button>}</div>}
        <ol className={styles.sequenceList}>{ids.map((id, index) => {
          const photo = byId.get(id);
          if (!photo) return null;
          const isCover = Boolean(details) && (details?.coverId ?? ids[0]) === id;
          return <li key={id}>
            <span className={styles.number}>{String(index + 1).padStart(2, "0")}</span>
            <span className={styles.sequenceThumb}><PortfolioImage photo={photo} thumbnail /></span>
            <span className={styles.sequenceTitle}>{photo.title}{isCover && <span className={styles.meta}>Cover</span>}</span>
            <div className={styles.sequenceControls}>
              {details && <button type="button" aria-label={`Use ${photo.title} as cover`} aria-pressed={isCover} title="Use as cover"
                disabled={pending} onClick={() => { setDetails({ ...details, coverId: id }); setMessage(""); }}>
                <Star size={15} fill={isCover ? "currentColor" : "none"} />
              </button>}
              <button type="button" aria-label={`Move ${photo.title} earlier`} disabled={pending || index === 0} onClick={() => move(index, -1)}><ArrowUp size={15} /></button>
              <button type="button" aria-label={`Move ${photo.title} later`} disabled={pending || index === ids.length - 1} onClick={() => move(index, 1)}><ArrowDown size={15} /></button>
              <button type="button" aria-label={`Remove ${photo.title}`} disabled={pending} onClick={() => toggle(id)}><X size={15} /></button>
            </div>
          </li>;
        })}</ol>
      </section>
    </div>
  </section>;
}
