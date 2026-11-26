import type { PhotoDetails } from "../types";
import { uploadPhotoOriginal } from "./upload-original.client";

type PhotoResult = { id: string; slug: string; published: boolean };
type DraftUpload = { id: string; image?: Blob; original?: File; details: PhotoDetails; stored?: boolean; slug?: string; published?: boolean };

// Each item is an independent, retryable request to the existing upload endpoint.
export async function savePhotoBatch(items: DraftUpload[], options: {
  signal: AbortSignal;
  seriesId: string;
  onStart: (id: string, position: number, mode: "draft") => void;
  onUploaded?: (id: string, result: PhotoResult) => void;
  onSaved: (id: string, result: PhotoResult) => void;
  onFailed: (id: string, error: string) => void;
}) {
  let authenticationRequired = false;
  for (const [index, item] of items.entries()) {
    if (options.signal.aborted) break;
    const mode = "draft";
    let preparingOriginal = !item.stored;
    options.onStart(item.id, index + 1, mode);
    try {
      let photo: PhotoResult = { id: item.id, slug: item.slug ?? "", published: item.published ?? false };
      if (!item.stored) {
        if (!item.image) throw new Error("Missing prepared photo");
        if (!item.original) throw new Error("Missing original photo. Choose the file again before saving.");
        const originalSha256 = await uploadPhotoOriginal(item.id, item.original, options.signal);
        preparingOriginal = false;
        const form = new FormData();
        form.set("id", item.id);
        form.set("seriesId", options.seriesId);
        form.set("image", item.image, "display.webp");
        form.set("originalSha256", originalSha256);
        for (const [key, value] of Object.entries(item.details)) form.set(key, value);
        const response = await fetch("/api/photo-preview/upload", { method: "POST", body: form, signal: options.signal });
        if (response.status === 401 || response.status === 403) {
          authenticationRequired = true;
          options.onFailed(item.id, "Sign in again, then retry this photo.");
          break;
        }
        const result = await response.json();
        if (!response.ok || result?.id !== item.id || typeof result?.published !== "boolean" || typeof result?.slug !== "string" || !result.slug) {
          options.onFailed(item.id, typeof result?.error === "string" ? result.error : "Couldn’t confirm the save. Retry this photo.");
          continue;
        }
        photo = result;
        options.onUploaded?.(item.id, photo);
      }
      options.onSaved(item.id, photo);
    } catch (cause) {
      if (options.signal.aborted) break;
      if (cause instanceof Error && cause.name === "UploadAuthenticationRequired") {
        authenticationRequired = true;
        options.onFailed(item.id, "Sign in again, then retry this photo.");
        break;
      }
      if (preparingOriginal && cause instanceof Error && !(cause instanceof TypeError)) {
        options.onFailed(item.id, cause.message);
        continue;
      }
      options.onFailed(item.id, `Couldn’t confirm the save. Your photo and details are kept here; retry to check or finish.`);
    }
  }
  return { authenticationRequired };
}
