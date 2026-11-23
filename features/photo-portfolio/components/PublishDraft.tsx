"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { publishPortfolioDraft, unpublishPortfolioDraft } from "@/app/photo/admin/actions";
import type { PortfolioPublication } from "../types";
import styles from "../admin.module.css";

export default function PublishDraft({
  id, title, revision, publication, hasPrivatePhotos, canPublish = true, busy = false, onSaveAndPublish, onPublicationChange,
}: {
  id: string;
  title: string;
  revision: string | null;
  publication: PortfolioPublication | null;
  hasPrivatePhotos: boolean;
  canPublish?: boolean;
  busy?: boolean;
  onSaveAndPublish?: () => ReturnType<typeof publishPortfolioDraft>;
  onPublicationChange?: (published: boolean) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [intent, setIntent] = useState<"publish" | "unpublish">("publish");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const isCurrent = publication?.revision === revision && !onSaveAndPublish;
  const publishLabel = onSaveAndPublish ? "Save & publish" : publication ? "Publish update" : "Publish";
  const removing = intent === "unpublish";
  const blocked = !removing && hasPrivatePhotos;
  const confirmLabel = removing ? "Unpublish" : publishLabel;

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
            ? await onSaveAndPublish()
            : await publishPortfolioDraft(id, revision ?? "");
        if (!result.ok) { setError(result.message); return; }
        dialog.current?.close();
        setStatus(removing ? "Unpublished from the portfolio." : "Published to the portfolio.");
        onPublicationChange?.(!removing);
      } catch { setError(removing ? "Couldn’t unpublish this version. Try again." : "Couldn’t publish this draft. Try again."); }
    });
  }

  return <div className={styles.publishControls}>
    {isCurrent && publication
      ? <Link className={styles.actionButton} href={publication.href}>View published</Link>
      : <button className={`${styles.actionButton} ${styles.publishTrigger}`} type="button" disabled={busy || pending || !canPublish}
        onClick={() => open("publish")}>{publishLabel}</button>}
    {publication && <button className={styles.actionButton} type="button" disabled={busy || pending}
      onClick={() => open("unpublish")}>Unpublish</button>}
    <span role="status" className={styles.publishStatus}>{status}</span>
    <dialog ref={dialog} className={styles.publishDialog} aria-label={removing ? "Confirm unpublishing" : "Confirm publication"}
      onCancel={(event) => { if (pending) event.preventDefault(); }}>
      <h2>{blocked ? "Some photos are private" : `${removing ? "Unpublish" : "Publish"} ${title}?`}</h2>
      <p>{removing ? "This will hide the public version. Your draft stays available in the editor."
        : blocked ? "Remove the unpublished photos from this draft before publishing."
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
