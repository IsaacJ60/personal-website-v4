import type { PhotoDetails } from "../types";

type PhotoResult = { id: string; slug: string; published: boolean };
type DraftUpload = { id: string; image?: Blob; details: PhotoDetails; stored?: boolean; mode?: "draft" | "publish"; slug?: string; published?: boolean };

// Each item is an independent, retryable request to the existing upload endpoint.
export async function savePhotoBatch(items: DraftUpload[], options: {
  signal: AbortSignal;
  onStart: (id: string, position: number, mode: "draft" | "publish") => void;
  onUploaded?: (id: string, result: PhotoResult) => void;
  onSaved: (id: string, result: PhotoResult) => void;
  onFailed: (id: string, error: string) => void;
}) {
  let authenticationRequired = false;
  for (const [index, item] of items.entries()) {
    if (options.signal.aborted) break;
    const mode = item.mode ?? "draft";
    options.onStart(item.id, index + 1, mode);
    try {
      let photo: PhotoResult = { id: item.id, slug: item.slug ?? "", published: item.published ?? false };
      if (!item.stored) {
        if (!item.image) throw new Error("Missing prepared photo");
        const form = new FormData();
        form.set("id", item.id);
        form.set("mode", "draft");
        form.set("image", item.image, "display.webp");
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
      if (mode === "publish" && !photo.published) {
        const response = await fetch("/api/photo-preview/publish", { method: "POST", signal: options.signal,
          headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id, details: item.details }) });
        if (response.status === 401 || response.status === 403) {
          authenticationRequired = true;
          options.onFailed(item.id, "Draft saved. Sign in again, then retry publishing.");
          break;
        }
        const result = await response.json();
        if (!response.ok || result?.id !== item.id || result?.published !== true || typeof result?.slug !== "string" || !result.slug) {
          options.onFailed(item.id, typeof result?.error === "string" ? result.error : "Couldn’t confirm publication. Retry publishing.");
          continue;
        }
        photo = result;
      }
      options.onSaved(item.id, photo);
    } catch {
      if (options.signal.aborted) break;
      options.onFailed(item.id, `Couldn’t confirm ${mode === "publish" ? "publication" : "the save"}. Your photo and details are kept here; retry to check or finish.`);
    }
  }
  return { authenticationRequired };
}
