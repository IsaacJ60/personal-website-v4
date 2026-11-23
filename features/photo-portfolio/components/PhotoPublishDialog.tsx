import type { RefObject } from "react";
import styles from "../admin.module.css";

export default function PhotoPublishDialog({ dialog, title, label, pending, error, onPublish, onClose }: {
  dialog: RefObject<HTMLDialogElement | null>;
  title: string;
  label: string;
  pending: boolean;
  error?: string;
  onPublish: () => void;
  onClose?: () => void;
}) {
  return <dialog ref={dialog} className={styles.publishDialog} aria-label="Confirm photo publication"
    onCancel={(event) => { if (pending) event.preventDefault(); }} onClose={onClose}>
    <h2>Publish {title.trim()}?</h2>
    <p>This photo will appear in Archive and can be included in published series.</p>
    {error && <p role="alert">{error}</p>}
    <div className={styles.actions}>
      <button type="button" className={styles.actionButton} disabled={pending} onClick={() => dialog.current?.close()}>Cancel</button>
      <button type="button" className={`${styles.actionButton} ${styles.primary}`} disabled={pending} onClick={onPublish}>
        {pending ? "Publishing…" : label}
      </button>
    </div>
  </dialog>;
}
