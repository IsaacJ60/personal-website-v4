"use server";

import { revalidatePath } from "next/cache";
import { portfolioUuid, requirePortfolioAdmin } from "@/features/photo-portfolio/data/admin";
import { normalizePhotoDetails } from "@/features/photo-portfolio/lib/admin-photos";
import { photoMediaBucket, uploadedPhotoKey } from "@/features/photo-portfolio/lib/upload-media";
import type { PhotoDetails } from "@/features/photo-portfolio/types";

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
