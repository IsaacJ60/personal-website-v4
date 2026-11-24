import "server-only";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { r2Client, R2_BUCKET_NAME } from "@/utils/r2/client";
import { originalMaxBytes } from "./photo-export";
import { uploadedOriginalKey } from "./original-storage";
import { originalBucket } from "./original-storage.server";

// The key comes only from a published catalog row, never from a request URL.
export async function readPhotoOriginal(objectKey: string, signal: AbortSignal) {
  if (!objectKey || objectKey.split("/").some(segment => segment === ".." || segment === ".")) throw new Error("Invalid original key");
  let body: AsyncIterable<Uint8Array>;
  let length: number | undefined;
  const upload = /^uploads\/([0-9a-f-]{36})\/display\.webp$/i.exec(objectKey);
  if (upload || (R2_BUCKET_NAME && process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY)) {
    const result = await r2Client.send(new GetObjectCommand({ Bucket: upload ? originalBucket() : R2_BUCKET_NAME,
      Key: upload ? uploadedOriginalKey(upload[1]) : `camera/${objectKey}` }), { abortSignal: signal });
    if (!result.Body) throw new Error("Original unavailable");
    body = result.Body as AsyncIterable<Uint8Array>;
    length = result.ContentLength;
  } else if (process.env.NODE_ENV === "development") {
    // Local review only until R2 credentials are configured. Production always
    // uses authenticated object reads and never depends on a public original.
    const origin = process.env.NEXT_PUBLIC_MEDIA_BASE_URL || "https://media.isaacjiang.ca";
    const url = new URL(`/camera/${objectKey.split("/").map(encodeURIComponent).join("/")}`, origin);
    const response = await fetch(url, { signal, redirect: "error", cache: "no-store" });
    if (!response.ok || !response.body) throw new Error("Original unavailable");
    body = response.body as unknown as AsyncIterable<Uint8Array>;
    length = Number(response.headers.get("content-length")) || undefined;
  } else throw new Error("Original storage is not configured");

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
