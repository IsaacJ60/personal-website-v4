"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createPortfolioSessionClient, portfolioUuid, publishedPortfolioHref, requirePortfolioAdmin } from "@/features/photo-portfolio/data/admin";

type DraftResult = { ok: true; updatedAt: string } | { ok: false; message: string };
type PublicationResult = { ok: true } | { ok: false; message: string };
type PublishResult = { ok: true; href: string; revision: string } | { ok: false; message: string };

function validPhotoIds(ids: unknown): ids is string[] {
  return Array.isArray(ids) && ids.length <= 1000
    && ids.every((id) => typeof id === "string" && portfolioUuid.test(id))
    && new Set(ids).size === ids.length;
}

function validRevision(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function publicationError(code?: string): { ok: false; message: string } {
  if (code === "40001") return { ok: false, message: "This draft or its public version changed in another window. Reload before trying again." };
  if (code === "23514") return { ok: false, message: "Check series ownership, cover, image sizes, and Selected Work eligibility." };
  return { ok: false, message: "Couldn’t publish this draft. Check the sequence and try again." };
}

function refreshPublicationViews(id: string, kind: string, slug: string, publicView = "series") {
  revalidatePath("/photo", "layout");
  revalidatePath("/sitemap.xml");
  const href = publishedPortfolioHref(kind, slug, publicView);
  if (kind === "selected") {
    revalidatePath("/photo/admin");
    revalidatePath("/photo/admin/preview");
  } else {
    const editor = `/photo/admin/series/${id}`;
    revalidatePath("/photo/admin/series");
    revalidatePath(editor);
    revalidatePath(`${editor}/preview`, "layout");
    revalidatePath("/photo/series");
    revalidatePath("/photo/archive");
    revalidatePath(`/photo/series/${encodeURIComponent(slug)}`);
    revalidatePath(`/photo/archive/${encodeURIComponent(slug)}`);
  }
  revalidatePath(href);
  return href;
}

export async function login(form: FormData) {
  const client = await createPortfolioSessionClient();
  const email = form.get("email");
  const password = form.get("password");
  if (typeof email !== "string" || typeof password !== "string") redirect("/photo/admin/login?error=1");
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) redirect("/photo/admin/login?error=1");
  const claims = await client.auth.getClaims();
  if (!process.env.ADMIN_USER_ID || claims.data?.claims.sub !== process.env.ADMIN_USER_ID) {
    await client.auth.signOut();
    redirect("/photo/admin/login?error=1");
  }
  redirect("/photo/admin");
}

export async function logout() {
  const client = await createPortfolioSessionClient();
  await client.auth.signOut();
  redirect("/photo/admin/login");
}

export async function saveSelectionDraft(collectionId: string, revision: string, photoIds: string[]): Promise<DraftResult> {
  const client = await requirePortfolioAdmin();
  if (typeof collectionId !== "string" || !portfolioUuid.test(collectionId) || typeof revision !== "string" || !Number.isFinite(Date.parse(revision))
    || !validPhotoIds(photoIds)) return { ok: false, message: "The selection couldn’t be saved. Please reload and try again." };
  const { data, error } = await client.rpc("photo_v3_save_selection_draft", {
    p_collection_id: collectionId, p_expected_updated_at: revision, p_photo_ids: photoIds,
  });
  if (error || !data) return { ok: false, message: error?.code === "40001"
    ? "This draft changed in another window. Reload to get the latest version before saving."
    : "Couldn’t save the draft. Your changes are still here; please try again." };
  revalidatePath("/photo/admin");
  revalidatePath("/photo/admin/preview");
  return { ok: true, updatedAt: data };
}

export async function publishPortfolioDraft(id: string, revision: string, publicView?: "series" | "archive"): Promise<PublishResult> {
  const client = await requirePortfolioAdmin();
  if (typeof id !== "string" || !portfolioUuid.test(id)
    || !validRevision(revision) || (publicView !== undefined && publicView !== "series" && publicView !== "archive")) {
    return { ok: false, message: "This preview is unavailable. Reopen it from the editor." };
  }

  const { data, error } = await client.rpc(publicView ? "photo_v3_publish_in_view" : "photo_v3_publish_draft", {
    p_draft_id: id,
    p_expected_updated_at: revision,
    ...(publicView ? { p_public_view: publicView } : {}),
  }).single();
  if (error || !data) return publicationError(error?.code);
  const href = refreshPublicationViews(id, data.collection_kind, data.public_slug, publicView);
  return { ok: true, href, revision };
}

export async function saveAndPublishPortfolioDraft(
  id: string, revision: string | null, photoIds: string[],
  series: { title: string; description: string; coverId: string | null } | null,
  publicView: "series" | "archive" = "series",
): Promise<PublishResult> {
  const client = await requirePortfolioAdmin();
  if (typeof id !== "string" || !portfolioUuid.test(id) || (revision !== null && !validRevision(revision))
    || !validPhotoIds(photoIds) || !photoIds.length || !["series", "archive"].includes(publicView)
    || (series !== null && (!series || typeof series.title !== "string" || typeof series.description !== "string"
      || !series.title.trim() || series.title.trim().length > 120 || series.description.trim().length > 2000
      || (series.coverId !== null && !photoIds.includes(series.coverId))))) {
    return { ok: false, message: "Check the title and selected photographs before publishing." };
  }
  const common = {
    p_draft_id: id, p_photo_ids: photoIds, p_expected_updated_at: revision ?? undefined,
    p_cover_photo_id: series?.coverId ?? undefined,
  };
  const query = series
    ? client.rpc("photo_v3_save_and_publish_in_view", { ...common, p_title: series.title.trim(), p_description: series.description.trim(), p_public_view: publicView })
    : client.rpc("photo_v3_save_and_publish_draft", { ...common, p_kind: "selected" });
  const { data, error } = await query.single();
  if (error || !data) return publicationError(error?.code);
  const href = refreshPublicationViews(id, data.collection_kind, data.public_slug, publicView);
  return { ok: true, href, revision: data.saved_revision };
}

export async function unpublishPortfolioDraft(id: string, liveRevision: string): Promise<PublicationResult> {
  const client = await requirePortfolioAdmin();
  if (typeof id !== "string" || !portfolioUuid.test(id) || !validRevision(liveRevision)) {
    return { ok: false, message: "Open the latest public version before unpublishing." };
  }
  const { data, error } = await client.rpc("photo_v3_unpublish_draft", {
    p_draft_id: id,
    p_expected_live_updated_at: liveRevision,
  }).single();
  if (error || !data) return { ok: false, message: error?.code === "40001"
    ? "The public version changed in another window. Reload before unpublishing."
    : "Couldn’t unpublish this version. Try again." };
  refreshPublicationViews(id, data.collection_kind, data.public_slug);
  return { ok: true };
}

export async function saveSeriesDraft(
  collectionId: string, revision: string | null, title: string, description: string, photoIds: string[], coverId: string | null,
): Promise<DraftResult> {
  const client = await requirePortfolioAdmin();
  if (typeof collectionId !== "string" || !portfolioUuid.test(collectionId)
    || (revision !== null && (typeof revision !== "string" || !Number.isFinite(Date.parse(revision))))
    || typeof title !== "string" || typeof description !== "string"
    || !title.trim() || title.trim().length > 120 || description.trim().length > 2000
    || !validPhotoIds(photoIds) || (coverId !== null && !photoIds.includes(coverId))) {
    return { ok: false, message: "Check the title, description, and selected photographs before saving." };
  }

  const { data, error } = await client.rpc("photo_v3_save_series_draft", {
    p_collection_id: collectionId,
    p_title: title.trim(),
    p_description: description.trim(),
    p_photo_ids: photoIds,
    p_cover_photo_id: coverId ?? undefined,
    p_expected_updated_at: revision ?? undefined,
  });
  if (error || !data) {
    return { ok: false, message: error?.code === "40001"
      ? "This draft already changed. Open its latest version from the Series list before saving again."
      : error?.code === "23514" ? "A selected photo is still live in another series. Publish its removal or make that series private before moving it."
        : "Couldn’t save the draft. Your changes are still here; please try again." };
  }
  const path = `/photo/admin/series/${collectionId}`;
  revalidatePath("/photo/admin/series");
  revalidatePath(path);
  revalidatePath(`${path}/preview`, "layout");
  return { ok: true, updatedAt: data };
}

export async function deleteSeriesDraft(id: string, revision: string): Promise<PublicationResult> {
  const client = await requirePortfolioAdmin();
  if (!portfolioUuid.test(id) || !validRevision(revision)) return { ok: false, message: "Reload before deleting this series." };
  const { error } = await client.rpc("photo_v3_delete_series", { p_series_id: id, p_expected_updated_at: revision });
  if (error) return { ok: false, message: error.code === "40001" ? "This series changed. Reload before deleting."
    : "Make this series private and move or delete its owned photos before deleting it." };
  revalidatePath("/photo", "layout");
  revalidatePath("/sitemap.xml");
  return { ok: true };
}
