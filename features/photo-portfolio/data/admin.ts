import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/utils/supabase/database.types";
import type { AdminPortfolioPhoto, PhotoDetails, PortfolioPublication } from "../types";
import { mapPhoto } from "./catalog";

export async function createPortfolioSessionClient() {
  const store = await cookies();
  return createServerClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll(values) {
        try { values.forEach(({ name, value, options }) => store.set(name, value, options)); }
        catch { /* Server Components cannot write cookies; actions can. */ }
      },
    },
  });
}

export const getPortfolioAdminClient = cache(async () => {
  const client = await createPortfolioSessionClient();
  const { data, error } = await client.auth.getClaims();
  if (error || !process.env.ADMIN_USER_ID || data?.claims.sub !== process.env.ADMIN_USER_ID) return null;
  return client;
});

export const requirePortfolioAdmin = cache(async () => {
  const client = await getPortfolioAdminClient();
  if (!client) redirect("/photo/admin/login");
  return client;
});

export const getAdminPhotoLibrary = cache(async () => {
  const client = await requirePortfolioAdmin();
  const photos: AdminPortfolioPhoto[] = [];
  for (let offset = 0; ; offset += 1000) {
    const result = await client.from("photo_v2_photos").select("*").order("date_taken", { ascending: false }).order("id").range(offset, offset + 999);
    if (result.error) throw new Error("Could not load the photo library.");
    photos.push(...result.data.map((row) => ({ ...mapPhoto(row), published: row.published })));
    if (result.data.length < 1000) break;
  }
  return photos;
});

export async function getPhotoLocations() {
  const client = await requirePortfolioAdmin();
  const locations = new Map<string, string>();
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await client.from("photo_v2_photos").select("location")
      .not("location", "is", null).order("id").range(offset, offset + 999);
    if (error) throw new Error("Could not load photo locations.");
    for (const row of data) {
      const location = row.location?.trim();
      if (location && !locations.has(location.toLowerCase())) locations.set(location.toLowerCase(), location);
    }
    if (data.length < 1000) break;
  }
  return [...locations.values()].sort((a, b) => a.localeCompare(b, "en-CA", { sensitivity: "base" }));
}

export async function getPhotoForEditing(id: string) {
  const client = await requirePortfolioAdmin();
  if (!portfolioUuid.test(id)) notFound();
  const { data, error } = await client.from("photo_v2_photos").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error("Could not load the photograph.");
  if (!data) notFound();
  const details: PhotoDetails = {
    title: data.title,
    date: data.date_taken,
    location: data.location ?? "",
    caption: data.description ?? "",
    altText: data.alt_text,
  };
  return { photo: { ...mapPhoto(data), published: data.published }, details, revision: data.updated_at };
}

export const getSelectionDraft = cache(async () => {
  const client = await requirePortfolioAdmin();
  const [photos, { data: collection, error }] = await Promise.all([
    getAdminPhotoLibrary(),
    client.from("photo_v2_collections").select("id,title,updated_at,published,kind,photo_v2_collection_photos(photo_id,position)")
      .eq("slug", "selected-work").single(),
  ]);
  if (error || !collection || collection.published || collection.kind !== "selected") {
    throw new Error("The private Selected Work draft is unavailable.");
  }
  const selectedIds = collection.photo_v2_collection_photos
    .sort((a, b) => a.position - b.position).map((member) => member.photo_id);
  return { collection, photos, selectedIds };
});

export const seriesDraftPageSize = 10;

export async function getSeriesDrafts(page: number) {
  const client = await requirePortfolioAdmin();
  const start = (page - 1) * seriesDraftPageSize;
  const { data, count, error } = await client.from("photo_v2_collections")
    .select(`
      id, title, legacy_bundle_id, updated_at, photo_v2_collection_photos(count),
      publication:photo_v2_publications!photo_v2_publications_draft_id_fkey(
        draft_revision,live:photo_v2_collections!photo_v2_publications_live_id_fkey(published)
      )
    `, { count: "exact" })
    .eq("kind", "series").eq("published", false).eq("is_public_copy", false)
    .order("updated_at", { ascending: false }).order("id")
    .range(start, start + seriesDraftPageSize - 1);
  if (page > 1 && (error?.code === "PGRST103" || data?.length === 0)) return null;
  if (error || count === null) throw new Error("Could not load the Series drafts.");
  return { drafts: data, total: count };
}

export const getSeriesDraft = cache(async (id: string) => {
  const client = await requirePortfolioAdmin();
  if (!portfolioUuid.test(id)) notFound();
  const { data, error } = await client.from("photo_v2_collections")
    .select("id,title,description,cover_photo_id,updated_at,photo_v2_collection_photos(photo_id,position)")
    .eq("id", id).eq("kind", "series").eq("published", false).eq("is_public_copy", false).maybeSingle();
  if (error) throw new Error("Could not load the Series draft.");
  if (!data) notFound();

  const selectedIds = data.photo_v2_collection_photos
    .sort((a, b) => a.position - b.position).map((row) => row.photo_id);
  return {
    id: data.id,
    title: data.title,
    description: data.description ?? "",
    coverId: selectedIds.find((photoId) => photoId === data.cover_photo_id) ?? null,
    revision: data.updated_at,
    selectedIds,
  };
});

export const portfolioUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function publishedPortfolioHref(kind: string, slug: string) {
  return kind === "selected" ? "/photo" : `/photo/series/${encodeURIComponent(slug)}`;
}

export async function getDraftPublication(id: string): Promise<PortfolioPublication | null> {
  const client = await requirePortfolioAdmin();
  const { data, error } = await client.from("photo_v2_publications")
    .select("draft_revision,live:photo_v2_collections!photo_v2_publications_live_id_fkey(kind,slug,published,updated_at)")
    .eq("draft_id", id).maybeSingle();
  if (error) throw new Error("Could not load the publication status.");
  if (!data?.live?.published) return null;
  return {
    revision: data.draft_revision,
    liveRevision: data.live.updated_at,
    href: publishedPortfolioHref(data.live.kind, data.live.slug),
  };
}

export async function getSeriesPreview(id: string) {
  const [draft, library] = await Promise.all([getSeriesDraft(id), getAdminPhotoLibrary()]);
  const byId = new Map(library.map((photo) => [photo.id, photo]));
  const photos = draft.selectedIds.flatMap((photoId) => byId.get(photoId) ?? []);
  const cover = (draft.coverId && byId.get(draft.coverId)) || photos[0];
  return { draft, photos, cover };
}
