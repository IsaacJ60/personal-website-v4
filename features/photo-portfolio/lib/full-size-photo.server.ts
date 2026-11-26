import "server-only";
import { GetObjectCommand, HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { originalBucket, originalStorageClient } from "./original-storage.server";
import { readPhotoOriginal } from "./photo-original.server";
import { renderPhotoExport } from "./photo-export";

// Only called after resolving a published catalog row. Originals remain untouched;
// this versioned viewing copy keeps their resolution without embedding EXIF/GPS.
export async function fullSizePhotoUrl(objectKey: string, signal: AbortSignal) {
  const upload = /^uploads\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/display\.webp$/.exec(objectKey);
  if (!upload) throw new Error("Invalid v3 photo key");
  const Bucket = originalBucket();
  const Key = `previews/${upload[1]}/full-size-v1.jpg`;
  let exists = false;
  try {
    await originalStorageClient.send(new HeadObjectCommand({ Bucket, Key }), { abortSignal: signal });
    exists = true;
  } catch (error) {
    if ((error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode !== 404) throw error;
  }
  if (!exists) {
    const original = await readPhotoOriginal(objectKey, signal);
    const { stream } = await renderPhotoExport(original, "full-size");
    const abort = () => stream.destroy();
    signal.addEventListener("abort", abort, { once: true });
    try {
      signal.throwIfAborted();
      const Body = await stream.toBuffer();
      try {
        await originalStorageClient.send(new PutObjectCommand({
          Bucket, Key, Body, ContentType: "image/jpeg", ContentDisposition: "inline",
          CacheControl: "private, max-age=3600", IfNoneMatch: "*",
        }), { abortSignal: signal });
      } catch (error) {
        // Concurrent first views may generate the same immutable copy.
        if ((error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode !== 412) throw error;
      }
    } finally { signal.removeEventListener("abort", abort); }
  }
  signal.throwIfAborted();
  return getSignedUrl(originalStorageClient, new GetObjectCommand({ Bucket, Key }), { expiresIn: 3600 });
}
