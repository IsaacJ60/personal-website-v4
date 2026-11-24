"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { retryPhotoMediaCleanup } from "@/app/photo/admin/photo-actions";
import styles from "../admin.module.css";

export default function PhotoMediaCleanup({ count }: { count: number }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const router = useRouter();
  if (!count) return null;
  return <div className={styles.draftBar}>
    <span role="status">{count} deleted {count === 1 ? "photo has" : "photos have"} image cleanup pending.</span>
    <button type="button" disabled={pending} onClick={() => {
      setError("");
      startTransition(async () => {
        try { await retryPhotoMediaCleanup(); router.refresh(); }
        catch { setError("Couldn’t finish cleanup. The pending tasks are kept; try again."); }
      });
    }}>{pending ? "Cleaning up…" : "Retry image cleanup"}</button>
    {error && <span role="alert">{error}</span>}
  </div>;
}
