"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { publishPortfolioDraft, unpublishPortfolioDraft } from "@/app/photo/admin/actions";
import type { PortfolioPublication } from "../types";
import styles from "../admin.module.css";

export default function PublishDraft({
  id, title, revision, publication, hasPrivatePhotos, isSeries = false, canPublish = true, busy = false, onSaveAndPublish, onPublicationChange,
}: {
  id: string;
  title: string;
  revision: string | null;
  publication: PortfolioPublication | null;
  hasPrivatePhotos: boolean;
  isSeries?: boolean;
  canPublish?: boolean;
  busy?: boolean;
  onSaveAndPublish?: (publicView?: "series" | "archive") => ReturnType<typeof publishPortfolioDraft>;
  onPublicationChange?: (published: boolean) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [intent, setIntent] = useState<"publish" | "archive" | "unpublish">("publish");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const isCurrent = publication?.revision === revision && !onSaveAndPublish;
  const archived = publication?.publicView === "archive";
  const publishLabel = onSaveAndPublish ? (isSeries ? "Save & publish to Series" : "Save & publish") : isSeries && (!publication || archived) ? "Publish to Series" : publication ? "Publish update" : "Publish";
  const archiveLabel = onSaveAndPublish ? "Save & archive" : "Archive";
  const removing = intent === "unpublish";
  const archiving = intent === "archive";
  const blocked = !removing && hasPrivatePhotos;
  const confirmLabel = removing ? (isSeries ? "Make private" : "Unpublish") : archiving ? archiveLabel : publishLabel;

  function open(action: typeof intent) {
    setError("");
    setIntent(action);
    dialog.current?.showModal();
  }

  function submit() {
    setError("");
    startTransition(async () => {
      try {
        const result = removing
          ? await unpublishPortfolioDraft(id, publication?.liveRevision ?? "")
          : onSaveAndPublish
            ? await onSaveAndPublish(archiving ? "archive" : "series")
            : await publishPortfolioDraft(id, revision ?? "", isSeries ? (archiving ? "archive" : "series") : undefined);
        if (!result.ok) { setError(result.message); return; }
        dialog.current?.close();
        setStatus(removing ? "Private. Hidden from the public portfolio." : archiving ? "Archived. Available in Archive and Selected Work." : "Published to the portfolio.");
        onPublicationChange?.(!removing);
      } catch { setError(removing ? "Couldn’t unpublish this version. Try again." : "Couldn’t publish this draft. Try again."); }
    });
  }

  return <div className={styles.publishControls}>
    {isCurrent && publication && <Link className={styles.actionButton} href={publication.href}>{archived ? "View archived" : "View published"}</Link>}
    {(!isCurrent || (isSeries && archived)) && <button className={`${styles.actionButton} ${styles.publishTrigger}`} type="button" disabled={busy || pending || !canPublish}
      onClick={() => open("publish")}>{publishLabel}</button>}
    {isSeries && (!archived || !isCurrent) && <button className={styles.actionButton} type="button" disabled={busy || pending || !canPublish}
      onClick={() => open("archive")}>{archiveLabel}</button>}
    {publication && <button className={styles.actionButton} type="button" disabled={busy || pending}
      onClick={() => open("unpublish")}>{isSeries ? "Make private" : "Unpublish"}</button>}
    <span role="status" className={styles.publishStatus}>{status}</span>
    <dialog ref={dialog} className={styles.publishDialog} aria-label={removing ? "Confirm unpublishing" : "Confirm publication"}
      onCancel={(event) => { if (pending) event.preventDefault(); }}>
      <h2>{blocked ? "Some photos are private" : `${removing ? (isSeries ? "Make private:" : "Unpublish") : archiving ? "Archive" : "Publish"} ${title}?`}</h2>
      <p>{removing ? (isSeries ? "This hides the public version and makes its photos unavailable to Selected Work. Your draft stays available in the editor." : "This hides Selected Work. Its private editorial draft is retained.")
        : blocked ? "Remove photos from private drafts before publishing. Photos from Series and Archive are eligible."
          : archiving ? "This saves the sequence publicly in Archive, off the Series tab. Its photos can appear in Selected Work. Current edits will be included."
            : isSeries ? "This publishes the sequence on the Series tab, off Archive. Current edits will be included."
          : onSaveAndPublish ? "This will save your current edits and publish them together."
            : publication ? "This saved draft will replace the current public version on the portfolio."
              : "This saved draft will become visible to visitors on the portfolio."}</p>
      {error && <p role="alert">{error}</p>}
      <div className={styles.actions}>
        <button className={styles.actionButton} type="button" autoFocus disabled={pending} onClick={() => dialog.current?.close()}>
          {blocked ? "Close" : "Cancel"}
        </button>
        {!blocked && <button type="button" className={`${styles.actionButton} ${styles.publishTrigger}`} disabled={pending} onClick={submit}>
          {pending ? (removing ? "Unpublishing…" : "Publishing…") : confirmLabel}
        </button>}
      </div>
    </dialog>
  </div>;
}
