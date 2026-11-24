"use server";

import { revalidatePath } from "next/cache";
import { portfolioUuid, requirePortfolioAdmin } from "@/features/photo-portfolio/data/admin";
import { normalizePhotoDetails } from "@/features/photo-portfolio/lib/admin-photos";
import { photoMediaBucket, uploadedPhotoKey } from "@/features/photo-portfolio/lib/upload-media";
import type { PhotoDetails } from "@/features/photo-portfolio/types";
import { removeUploadFiles } from "@/features/photo-portfolio/lib/remove-upload-files";

export async function retryPhotoMediaCleanup(photoId?: string) {
  const client = await requirePortfolioAdmin();
  if (photoId !== undefined && !portfolioUuid.test(photoId)) return;
  let query = client.from("photo_v2_media_cleanup").select("photo_id").order("created_at").limit(25);
  if (photoId) query = query.eq("photo_id", photoId);
  const { data, error } = await query;
  if (error) throw new Error("Could not load pending image cleanup.");
  const storage = client.storage.from(photoMediaBucket);
  for (const task of data) {
    const paths = [uploadedPhotoKey(task.photo_id), uploadedPhotoKey(task.photo_id, "thumbnail")];
    if (await removeUploadFiles(storage, paths)) {
      const result = await client.from("photo_v2_media_cleanup").delete().eq("photo_id", task.photo_id);
      if (result.error) throw new Error("Could not confirm image cleanup. Retry from Photos.");
    }
  }
  revalidatePath("/photo/admin/photos");
}

export async function deletePhoto(id: string, revision: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const client = await requirePortfolioAdmin();
  if (typeof id !== "string" || !portfolioUuid.test(id) || typeof revision !== "string" || !Number.isFinite(Date.parse(revision))) {
    return { ok: false, message: "Reopen this photo from the library before deleting." };
  }
  // Existing foreign keys remove memberships and clear covers in the same transaction.
  // The trigger durably queues only new-upload media for cleanup, never legacy files.
  const { data, error } = await client.from("photo_v2_photos").delete()
    .eq("id", id).eq("updated_at", revision).select("id").maybeSingle();
  if (error) return { ok: false, message: "Couldn’t delete this photo. Try again." };
  if (!data) return { ok: false, message: "This photo changed or was already removed. Reload before deleting." };
  revalidatePath("/photo", "layout");
  // Metadata deletion is complete even if storage is down. The Photos page
  // exposes pending tasks so cleanup can be retried after reload or sign-in.
  try { await retryPhotoMediaCleanup(id); } catch { /* Keep the durable task. */ }
  return { ok: true };
}

export async function savePhotoDetails(id: string, revision: string, fields: PhotoDetails, publish = false): Promise<
  { ok: true; revision: string; details: PhotoDetails; published: boolean } | { ok: false; message: string }
> {
  const client = await requirePortfolioAdmin();
  if (typeof id !== "string" || !portfolioUuid.test(id) || typeof revision !== "string" || !Number.isFinite(Date.parse(revision))) {
    return { ok: false, message: "Reopen this photo from the library before saving." };
  }
  const metadata = normalizePhotoDetails(fields);
  if (!metadata.ok) return metadata;
  const makePublic = publish === true;
  const displayKey = uploadedPhotoKey(id);
  if (makePublic) {
    const storage = client.storage.from(photoMediaBucket);
    const files = await Promise.all([storage.exists(displayKey), storage.exists(uploadedPhotoKey(id, "thumbnail"))]);
    if (files.some((file) => file.error || !file.data)) return { ok: false, message: "Both image sizes must be available before publishing." };
  }
  let query = client.from("photo_v2_photos").update(makePublic ? { ...metadata.columns, published: true } : metadata.columns)
    .eq("id", id).eq("updated_at", revision);
  if (makePublic) query = query.eq("object_key", displayKey).eq("published", false);
  const { data, error } = await query.select("updated_at,published").maybeSingle();

  if (error) return { ok: false, message: "Couldn’t save the photo details. Your changes are still here." };
  if (!data) return { ok: false, message: "This photo changed or was removed. Reload before saving again." };

  // The same photo can appear in every public section and in multiple curation drafts.
  revalidatePath("/photo", "layout");
  return { ok: true, revision: data.updated_at, details: metadata.details, published: data.published };
}
