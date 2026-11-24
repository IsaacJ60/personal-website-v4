import { sourceMaxBytes } from "./upload-media";

// Direct PUT keeps the untouched original out of the app's request-body limit.
// The admin endpoint signs one immutable object; it never returns a read URL.
export async function uploadPhotoOriginal(id: string, file: File, signal?: AbortSignal) {
  if (!file.size || file.size > sourceMaxBytes) throw new Error("Choose a photo under 30 MB.");
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  const sha256 = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
  const contentType = file.type || (/\.png$/i.test(file.name) ? "image/png" : /\.webp$/i.test(file.name) ? "image/webp" : "image/jpeg");
  const authorize = async () => {
    const response = await fetch("/api/photo-preview/original", { method: "POST", signal,
      headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, size: file.size, contentType, sha256 }) });
    const result = await response.json();
    if (!response.ok) {
      const error = new Error(result.error || "Couldn’t store the original. Please try again.");
      if (response.status === 401 || response.status === 403) error.name = "UploadAuthenticationRequired";
      throw error;
    }
    return result;
  };
  const result = await authorize();
  if (!result.stored) {
    const response = await fetch(result.url, { method: "PUT", body: file, headers: result.headers, signal });
    // A retry or concurrent identical save may have already committed the PUT.
    if (!response.ok && response.status !== 412) throw new Error("Couldn’t upload the original. Your selected file is kept here; retry saving.");
    const verified = await authorize();
    if (!verified.stored) throw new Error("Couldn’t verify the stored original. Retry saving.");
  }
  return sha256;
}
