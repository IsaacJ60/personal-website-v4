import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createPublicPortfolioClient, getPortfolio } from "@/features/photo-portfolio/data/catalog";
import { photoMediaBucket, uploadedPhotoKey } from "@/features/photo-portfolio/lib/upload-media";
import { renderShareCard } from "@/features/photo-portfolio/lib/share-card";
import type { PortfolioPhoto } from "@/features/photo-portfolio/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function photoBytes(photo: PortfolioPhoto) {
  if (photo.uploaded) {
    const { data, error } = await createPublicPortfolioClient().storage.from(photoMediaBucket).download(uploadedPhotoKey(photo.id));
    if (error) throw error;
    return Buffer.from(await data.arrayBuffer());
  }
  if (/^\/photo-preview\/[a-z0-9-]+\.webp$/i.test(photo.src)) {
    return readFile(join(process.cwd(), "public", photo.src.slice(1)));
  }
  // Only catalog-owned media sources; callers cannot supply a URL or file path.
  const url = new URL(photo.src);
  const media = new URL(process.env.NEXT_PUBLIC_MEDIA_BASE_URL || "https://media.isaacjiang.ca");
  if (url.origin !== media.origin || !url.pathname.startsWith("/camera/")) throw new Error("Unsupported public photo source");
  const response = await fetch(url, { redirect: "error", cache: "no-store", signal: AbortSignal.timeout(15000) });
  if (!response.ok || !response.body) throw new Error("Photo unavailable");
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  const reader = response.body.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.length;
      if (bytes > 30_000_000) throw new Error("Photo too large");
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
  return Buffer.concat(chunks);
}

export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const unavailable = () => new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  let title = "Photography by Isaac Jiang";
  let photo: PortfolioPhoto | undefined;
  if (path.length === 1 && path[0] === "default") {
    // Overview fallback does not need a database request.
  } else if (path.length === 1 && path[0] === "selected") {
    const { selected } = await getPortfolio();
    title = "Selected Work";
    photo = selected?.photos[0];
  } else if (path.length === 2 && path[0] === "photos") {
    const { photos } = await getPortfolio();
    photo = photos.find((item) => item.slug === path[1]);
    if (!photo) return unavailable();
    title = photo.title;
  } else if (path.length === 2 && path[0] === "series") {
    const { collections } = await getPortfolio();
    const series = collections.find((item) => item.kind === "series" && item.slug === path[1]);
    if (!series) return unavailable();
    title = series.title;
    photo = series.photos.find((item) => item.id === series.coverPhotoId) ?? series.photos[0];
  } else return unavailable();
  let card: Buffer;
  try {
    card = await renderShareCard(title, photo ? await photoBytes(photo) : undefined);
  } catch {
    // Public metadata still has a useful card if its image is temporarily down.
    card = await renderShareCard(title);
  }
  return new Response(new Uint8Array(card), { headers: {
    "Content-Type": "image/jpeg", "Cache-Control": "no-store", "X-Robots-Tag": "noindex",
  } });
}
