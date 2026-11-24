import { sourceMaxBytes } from "./upload-media";

export type OriginalDetails = { size: number; contentType: string; sha256: string };
export function normalizeOriginalDetails(value: unknown): OriginalDetails | null {
  if (!value || typeof value !== "object") return null;
  const details = value as Record<string, unknown>;
  if (!Number.isSafeInteger(details.size) || Number(details.size) <= 0 || Number(details.size) > sourceMaxBytes
    || !["image/jpeg", "image/png", "image/webp"].includes(String(details.contentType))
    || typeof details.sha256 !== "string" || !/^[a-f0-9]{64}$/.test(details.sha256)) return null;
  return { size: Number(details.size), contentType: String(details.contentType), sha256: details.sha256 };
}

export function uploadedOriginalKey(id: string) { return `originals/${id.toLowerCase()}/source`; }

export function originalMatches(stored: { ContentLength?: number; ContentType?: string; Metadata?: Record<string, string> }, expected: OriginalDetails) {
  return stored.ContentLength === expected.size && stored.ContentType === expected.contentType
    && stored.Metadata?.sha256 === expected.sha256;
}
