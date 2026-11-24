import "server-only";

import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/utils/supabase/database.types";
import type { PortfolioCollection, PortfolioPhoto } from "../types";
import { uploadedPhotoKey, uploadedPhotoSrc } from "../lib/upload-media";
import { demoEdits } from "./demo";
import preparedImages from "./prepared-images.json";

type PhotoRow = Database["public"]["Tables"]["photo_v2_photos"]["Row"];
type PreparedImage = { src: string; thumbnail: string; width: number; height: number };
const prepared = preparedImages as Record<string, PreparedImage>;

export function mapPhoto(row: PhotoRow): PortfolioPhoto {
  const local = prepared[row.slug];
  const uploaded = row.object_key === uploadedPhotoKey(row.id);
  const mediaBase = process.env.NEXT_PUBLIC_MEDIA_BASE_URL || "https://media.isaacjiang.ca";
  return {
    id: row.id, slug: row.slug, title: row.title, alt: row.alt_text || row.title,
    description: row.description?.trim().toLowerCase() === row.title.trim().toLowerCase() ? null : row.description,
    location: row.location, date: row.date_taken, updatedAt: row.updated_at, categories: row.categories,
    src: uploaded ? uploadedPhotoSrc(row.id, "display", row.published)
      : local?.src ?? `${mediaBase}/camera/${row.object_key.split("/").map(encodeURIComponent).join("/")}`,
    thumbnail: uploaded ? uploadedPhotoSrc(row.id, "thumbnail", row.published) : local?.thumbnail,
    width: local?.width ?? row.image_width, height: local?.height ?? row.image_height,
    prepared: uploaded || Boolean(local), uploaded,
  };
}

// Stateless public reads only. No cookies, service-role client, v1 tables, or
// draft access. React.cache deduplicates layout/page reads within each request.
export function createPublicPortfolioClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export const getPortfolio = cache(async () => {
  const client = createPublicPortfolioClient();
  const photos: PortfolioPhoto[] = [];
  // Supabase defaults to a bounded response; paginate instead of silently losing
  // photos once the archive grows beyond one response page.
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await client.from("photo_v2_photos").select("*")
      .eq("published", true).order("date_taken", { ascending: false }).order("id")
      .range(offset, offset + 999);
    if (error) throw new Error(`Could not load the preview photo catalog: ${error.message}`);
    photos.push(...data.map(mapPhoto));
    if (data.length < 1000) break;
  }
  // Read each collection and its sequence in the same snapshot when a public edit is replaced.
  const { data: rows, error } = await client.from("photo_v2_collections")
    .select("id,slug,title,description,kind,cover_photo_id,updated_at,photo_v2_collection_photos(photo_id,position)")
    .eq("published", true).order("sort_order").order("id");
  if (error) throw new Error(`Could not load published portfolio edits: ${error.message}`);
  const byId = new Map(photos.map((photo) => [photo.id, photo]));
  const collections: PortfolioCollection[] = [];
  for (const row of rows) {
    if (!["selected", "series", "notebook"].includes(row.kind)) continue;
    collections.push({ id: row.id, slug: row.slug, title: row.title,
      description: row.description || "", kind: row.kind as PortfolioCollection["kind"], isDemo: false,
      updatedAt: row.updated_at,
      coverPhotoId: row.cover_photo_id,
      photos: row.photo_v2_collection_photos.sort((a, b) => a.position - b.position)
        .flatMap((member) => byId.get(member.photo_id) ?? []),
    });
  }
  const liveKinds = new Set(collections.filter((collection) => collection.photos.length > 0).map((collection) => collection.kind));
  for (const demo of demoEdits) {
    if (liveKinds.has(demo.kind) || collections.some((collection) => collection.slug === demo.slug && collection.photos.length)) continue;
    const demoPhotos = demo.slugs.map((slug) => photos.find((p) => p.slug === slug))
      .filter((p): p is PortfolioPhoto => Boolean(p));
    if (demoPhotos.length) collections.push({ ...demo, id: `demo-${demo.slug}`, photos: demoPhotos, isDemo: true });
  }
  return { photos, collections, selected: collections.find((c) => c.kind === "selected" && c.photos.length > 0) };
});
