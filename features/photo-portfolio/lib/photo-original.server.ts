import "server-only";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { originalMaxBytes } from "./photo-export";
import { uploadedOriginalKey } from "./original-storage";
import { originalBucket, originalStorageClient } from "./original-storage.server";

// The key comes only from a published catalog row, never from a request URL.
export async function readPhotoOriginal(objectKey: string, signal: AbortSignal) {
  const upload = /^uploads\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/display\.webp$/.exec(objectKey);
  if (!upload) throw new Error("Invalid v3 original key");
  const result = await originalStorageClient.send(new GetObjectCommand({
    Bucket: originalBucket(), Key: uploadedOriginalKey(upload[1]),
  }), { abortSignal: signal });
  if (!result.Body) throw new Error("Original unavailable");
  const body = result.Body as AsyncIterable<Uint8Array>;
  const length = result.ContentLength;

  const chunks: Uint8Array[] = [];
  let bytes = 0;
  // Consume inside the loop so iterator cleanup closes an oversized response.
  for await (const chunk of body) {
    bytes += chunk.length;
    if ((length ?? bytes) > originalMaxBytes || bytes > originalMaxBytes) throw new Error("Original too large");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
