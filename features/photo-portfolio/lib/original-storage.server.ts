import "server-only";
import { S3Client, HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { originalMatches, uploadedOriginalKey, type OriginalDetails } from "./original-storage";

export const originalStorageClient = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  requestChecksumCalculation: "WHEN_REQUIRED",
  credentials: {
    accessKeyId: process.env.R2_V3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_V3_SECRET_ACCESS_KEY!,
  },
});

export function originalBucket() {
  const bucket = process.env.R2_V3_ORIGINALS_BUCKET_NAME;
  if (bucket !== "photo-v3-originals" || !process.env.R2_ACCOUNT_ID
    || !process.env.R2_V3_ACCESS_KEY_ID || !process.env.R2_V3_SECRET_ACCESS_KEY) {
    const error = new Error("Private original storage is not configured");
    error.name = "OriginalStorageNotConfigured";
    throw error;
  }
  return bucket;
}

export async function findUploadedOriginal(id: string) {
  try { return await originalStorageClient.send(new HeadObjectCommand({ Bucket: originalBucket(), Key: uploadedOriginalKey(id) })); }
  catch (error) {
    if ((error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404) return null;
    throw error;
  }
}

export async function authorizeOriginalUpload(id: string, details: OriginalDetails) {
  const stored = await findUploadedOriginal(id);
  if (stored) return originalMatches(stored, details) ? { stored: true as const } : null;
  const headers = { "Content-Type": details.contentType, "If-None-Match": "*", "x-amz-meta-sha256": details.sha256 };
  const command = new PutObjectCommand({ Bucket: originalBucket(), Key: uploadedOriginalKey(id),
    ContentType: details.contentType, ContentLength: details.size, IfNoneMatch: "*", Metadata: { sha256: details.sha256 } });
  const url = await getSignedUrl(originalStorageClient, command, { expiresIn: 300,
    signableHeaders: new Set(["content-type", "if-none-match"]), unhoistableHeaders: new Set(["x-amz-meta-sha256"]) });
  return { stored: false as const, url, headers };
}
